use axum::{extract::State, Json};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::db::{get_app_setting};
use crate::error::{AppError, Result};
use crate::helpers::get_user_settings;
use crate::middleware::auth::{AuthUser, Claims};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct LoginRequest {
    email: Option<String>,
    password: Option<String>,
    mfa_token: Option<String>,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    name: Option<String>,
    email: Option<String>,
    password: Option<String>,
    #[serde(rename = "formLoadedAt")]
    form_loaded_at: Option<i64>,
}

#[axum::debug_handler]
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<Value>> {
    let email = body.email.as_deref().unwrap_or("");
    let password = body.password.as_deref().unwrap_or("");
    if email.is_empty() || password.is_empty() {
        return Err(AppError::bad_request("Email and password required"));
    }

    // Admin login
    if email == state.config.admin_email {
        if let Some(ref admin_hash) = state.admin_password_hash {
            if bcrypt::verify(password, admin_hash).unwrap_or(false) {
                let claims = Claims {
                    role: "admin".into(),
                    user_id: "__admin__".into(),
                    email: email.into(),
                    impersonating: None,
                    impersonating_name: None,
                    impersonating_email: None,
                    purpose: None,
                    exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
                };
                let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()))?;
                return Ok(Json(json!({ "token": token, "email": email, "role": "admin", "name": "Admin" })));
            }
        }
    }

    // Fetch user and do sync DB work in a scoped block so MutexGuard is dropped before any .await
    let (user, sub_status) = {
        let db = state.db.lock().unwrap();
        let user: Option<UserRow> = db.query_row(
            "SELECT id, email, password, name, subscription_status, trial_end, mfa_enabled, setup_completed, enhanced_mail_enabled FROM users WHERE email = ?1 AND active = 1",
            rusqlite::params![email],
            |row| Ok(UserRow {
                id: row.get(0)?,
                email: row.get(1)?,
                password: row.get(2)?,
                name: row.get(3)?,
                subscription_status: row.get(4)?,
                trial_end: row.get(5)?,
                mfa_enabled: row.get(6)?,
                setup_completed: row.get(7)?,
                enhanced_mail_enabled: row.get(8)?,
            }),
        ).ok();
        let user = user.ok_or_else(|| AppError::unauthorized("Invalid credentials"))?;
        if !bcrypt::verify(password, &user.password).unwrap_or(false) {
            return Err(AppError::unauthorized("Invalid credentials"));
        }
        let mut sub_status = user.subscription_status.clone().unwrap_or_else(|| "none".into());
        if sub_status == "trial" {
            if let Some(ref end) = user.trial_end {
                if let Ok(end_dt) = chrono::NaiveDateTime::parse_from_str(end, "%Y-%m-%d %H:%M:%S") {
                    if chrono::Utc::now().naive_utc() > end_dt {
                        db.execute("UPDATE users SET subscription_status = 'expired', updated_at = datetime('now') WHERE id = ?1", rusqlite::params![user.id]).ok();
                        sub_status = "expired".into();
                    }
                }
            }
        }
        (user, sub_status)
    }; // db lock dropped here

    // MFA check (async MFA email send requires no lock held)
    if user.mfa_enabled.unwrap_or(0) == 1 {
        if body.mfa_token.is_none() {
            send_mfa_token(&state, &user.id, email).await?;
            return Ok(Json(json!({ "mfa_required": true, "message": "MFA kód elküldve az email címedre." })));
        }

        let mfa_token = body.mfa_token.as_deref().unwrap_or("");
        let db = state.db.lock().unwrap();
        let valid: Option<String> = db.query_row(
            "SELECT id FROM mfa_tokens WHERE user_id = ?1 AND token = ?2 AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1",
            rusqlite::params![user.id, mfa_token],
            |row| row.get(0),
        ).ok();

        match valid {
            Some(token_id) => {
                db.execute("UPDATE mfa_tokens SET used = 1 WHERE id = ?1", rusqlite::params![token_id]).ok();
            }
            None => return Err(AppError::new(axum::http::StatusCode::UNAUTHORIZED, "Érvénytelen vagy lejárt MFA kód.")),
        }
    }

    let claims = Claims {
        role: "user".into(),
        user_id: user.id.clone(),
        email: user.email.clone(),
        impersonating: None,
        impersonating_name: None,
        impersonating_email: None,
        purpose: None,
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()))?;

    Ok(Json(json!({
        "token": token,
        "email": user.email,
        "role": "user",
        "name": user.name,
        "userId": user.id,
        "subscription_status": sub_status,
        "setup_completed": user.setup_completed.unwrap_or(0) != 0,
        "enhanced_mail_enabled": user.enhanced_mail_enabled.unwrap_or(0) != 0,
    })))
}

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();

    if get_app_setting(&db, "registration_enabled", "true") != "true" {
        return Err(AppError::forbidden("A regisztráció jelenleg nem elérhető."));
    }

    let name = body.name.as_deref().unwrap_or("");
    let email = body.email.as_deref().unwrap_or("");
    let password = body.password.as_deref().unwrap_or("");

    if name.is_empty() || email.is_empty() || password.is_empty() {
        return Err(AppError::bad_request("Név, email és jelszó megadása kötelező."));
    }

    // Anti-bot check
    if let Some(loaded_at) = body.form_loaded_at {
        let now = chrono::Utc::now().timestamp_millis();
        if (now - loaded_at) < 5000 {
            return Err(AppError::new(axum::http::StatusCode::TOO_MANY_REQUESTS, "Túl gyors regisztráció. Kérjük, próbáld újra."));
        }
    }

    // Email validation
    if !email.contains('@') || !email.contains('.') {
        return Err(AppError::bad_request("Érvénytelen email cím."));
    }
    if password.len() < 6 {
        return Err(AppError::bad_request("A jelszónak legalább 6 karakter hosszúnak kell lennie."));
    }

    let existing: Option<String> = db.query_row(
        "SELECT id FROM users WHERE email = ?1", rusqlite::params![email], |row| row.get(0),
    ).ok();
    if existing.is_some() {
        return Err(AppError::conflict("Ezzel az email címmel már létezik fiók."));
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let trial_end = (chrono::Utc::now() + chrono::Duration::days(30)).format("%Y-%m-%d %H:%M:%S").to_string();
    let hashed = bcrypt::hash(password, 10)?;

    db.execute(
        "INSERT INTO users (id, email, password, name, subscription_status, trial_start, trial_end) VALUES (?1, ?2, ?3, ?4, 'trial', ?5, ?6)",
        rusqlite::params![id, email, hashed, name, now, trial_end],
    )?;

    let claims = Claims {
        role: "user".into(),
        user_id: id.clone(),
        email: email.into(),
        impersonating: None,
        impersonating_name: None,
        impersonating_email: None,
        purpose: None,
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()))?;

    Ok(Json(json!({
        "token": token, "email": email, "role": "user", "name": name,
        "userId": id, "subscription_status": "trial", "setup_completed": false,
    })))
}

pub async fn setup_complete(
    State(state): State<AppState>,
    axum::Extension(auth): axum::Extension<AuthUser>,
) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    db.execute("UPDATE users SET setup_completed = 1, updated_at = datetime('now') WHERE id = ?1", rusqlite::params![auth.effective_user_id])?;
    Ok(Json(json!({ "success": true })))
}

pub async fn site_config(State(state): State<AppState>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    Ok(Json(json!({
        "landing_page_enabled": get_app_setting(&db, "landing_page_enabled", "true") == "true",
        "registration_enabled": get_app_setting(&db, "registration_enabled", "true") == "true",
    })))
}

// ─── MFA Token Sending ─────────────────────────────

async fn send_mfa_token(state: &AppState, user_id: &str, user_email: &str) -> Result<()> {
    use lettre::{Message, SmtpTransport, Transport};
    use lettre::transport::smtp::authentication::Credentials;
    use rand::Rng;

    let code = format!("{:06}", rand::thread_rng().gen_range(100000..999999));
    let expires_at = (chrono::Utc::now() + chrono::Duration::minutes(3)).format("%Y-%m-%d %H:%M:%S").to_string();
    let id = Uuid::new_v4().to_string();

    {
        let db = state.db.lock().unwrap();
        db.execute("UPDATE mfa_tokens SET used = 1 WHERE user_id = ?1 AND used = 0", rusqlite::params![user_id]).ok();
        db.execute(
            "INSERT INTO mfa_tokens (id, user_id, token, expires_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![id, user_id, code, expires_at],
        )?;
    }

    // Build MFA transporter
    let (host, port, user, pass) = if let (Some(h), Some(u), Some(p)) = (
        state.config.mfa_smtp_host.as_ref(),
        state.config.mfa_smtp_user.as_ref(),
        state.config.mfa_smtp_pass.as_ref(),
    ) {
        (h.clone(), state.config.mfa_smtp_port.unwrap_or(465), u.clone(), p.clone())
    } else {
        // Fallback to admin SMTP
        let db = state.db.lock().unwrap();
        let settings = get_user_settings(&db, &state.enc_key, "__admin__");
        let h = settings.get("smtp_host").cloned().unwrap_or_default();
        let u = settings.get("smtp_user").cloned().unwrap_or_default();
        let p = settings.get("smtp_pass").cloned().unwrap_or_default();
        let port: u16 = settings.get("smtp_port").and_then(|s| s.parse().ok()).unwrap_or(465);
        if h.is_empty() || u.is_empty() || p.is_empty() {
            return Err(AppError::internal("Nem sikerült az MFA kódot elküldeni. SMTP nincs konfigurálva."));
        }
        (h, port, u, p)
    };

    let html_body = format!(
        r#"<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f1115; color: #ffffff; border-radius: 16px;">
        <h2 style="color: #2EC4BE; margin-top: 0;">Bejelentkezési kód</h2>
        <p style="color: #9ca3af; font-size: 14px;">A bejelentkezéshez használd az alábbi kódot:</p>
        <div style="background: #1e2128; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2EC4BE;">{code}</span>
        </div>
        <p style="color: #9ca3af; font-size: 12px;">Ez a kód <strong>3 percig</strong> érvényes. Ha nem te kezdeményezted a bejelentkezést, hagyd figyelmen kívül ezt az emailt.</p>
        <hr style="border: none; border-top: 1px solid #2a2d35; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 11px;">Pultify - Biztonságos bejelentkezés</p>
      </div>"#
    );

    let email = Message::builder()
        .from(r#""Pultify" <auth@pultify.hu>"#.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?)
        .to(user_email.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?)
        .subject("Bejelentkezési kód - Pultify")
        .header(lettre::message::header::ContentType::TEXT_HTML)
        .body(html_body)
        .map_err(|e| AppError::internal(e.to_string()))?;

    let creds = Credentials::new(user, pass);

    let mailer = if port == 465 {
        SmtpTransport::relay(&host)
            .map_err(|e| AppError::internal(e.to_string()))?
            .credentials(creds)
            .port(port)
            .build()
    } else {
        SmtpTransport::starttls_relay(&host)
            .map_err(|e| AppError::internal(e.to_string()))?
            .credentials(creds)
            .port(port)
            .build()
    };

    mailer.send(&email).map_err(|e| AppError::internal(format!("MFA email küldés sikertelen: {}", e)))?;

    Ok(())
}

struct UserRow {
    id: String,
    email: String,
    password: String,
    name: Option<String>,
    subscription_status: Option<String>,
    trial_end: Option<String>,
    mfa_enabled: Option<i32>,
    setup_completed: Option<i32>,
    enhanced_mail_enabled: Option<i32>,
}
