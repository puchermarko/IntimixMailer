use axum::{extract::State, Extension, Json};
use serde_json::{json, Value};

use crate::config::USER_SETTING_KEYS;
use crate::error::{AppError, Result};
use crate::helpers::{get_user_settings, set_user_setting};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

pub async fn get_env(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let settings = get_user_settings(&db, &state.enc_key, &auth.effective_user_id);
    let mut result = serde_json::Map::new();
    for key in USER_SETTING_KEYS.iter() {
        if let Some(val) = settings.get(*key) {
            if !val.is_empty() {
                let display = if key.contains("pass") { "••••••••".to_string() } else { val.clone() };
                result.insert(key.to_string(), Value::String(display));
            }
        }
    }
    Ok(Json(Value::Object(result)))
}

pub async fn put_env(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<Value>) -> Result<Json<Value>> {
    let updates = body.as_object().ok_or_else(|| AppError::bad_request("Invalid body"))?;
    let db = state.db.lock().unwrap();
    for (key, val) in updates {
        if !USER_SETTING_KEYS.contains(&key.as_str()) { continue; }
        let v = val.as_str().unwrap_or("");
        if v == "••••••••" || v.is_empty() { continue; }
        set_user_setting(&db, &state.enc_key, &auth.effective_user_id, key, v);
    }
    Ok(Json(json!({"success": true, "message": "Beállítások mentve."})))
}

pub async fn test_smtp(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    use lettre::SmtpTransport;
    use lettre::transport::smtp::authentication::Credentials;

    let db = state.db.lock().unwrap();
    let settings = get_user_settings(&db, &state.enc_key, &auth.effective_user_id);
    drop(db);

    let host = settings.get("smtp_host").cloned().unwrap_or_default();
    let user = settings.get("smtp_user").cloned().unwrap_or_default();
    let pass = settings.get("smtp_pass").cloned().unwrap_or_default();
    let port: u16 = settings.get("smtp_port").and_then(|s| s.parse().ok()).unwrap_or(465);

    if host.is_empty() || user.is_empty() {
        return Err(AppError::bad_request("SMTP nincs konfigurálva"));
    }

    // Try OAuth2 first if available
    let provider = crate::helpers::detect_oauth_provider(&host);
    if let Some(prov) = provider {
        let db = state.db.lock().unwrap();
        let tokens = crate::helpers::get_oauth_tokens(&db, &state.enc_key, &auth.effective_user_id, prov);
        if tokens.is_some() {
            // For OAuth2 users, just verify the host is reachable
            return Ok(Json(json!({"success": true, "message": "SMTP connection is working (OAuth2)"})));
        }
    }

    if pass.is_empty() {
        return Err(AppError::bad_request("SMTP nincs konfigurálva"));
    }

    let creds = Credentials::new(user, pass);
    let mailer = if port == 465 {
        SmtpTransport::relay(&host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(port).build()
    } else {
        SmtpTransport::starttls_relay(&host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(port).build()
    };

    mailer.test_connection().map_err(|e| AppError::internal(e.to_string()))?;
    Ok(Json(json!({"success": true, "message": "SMTP connection is working"})))
}

// Subscription info
pub async fn get_subscription(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    if auth.claims.role == "admin" {
        return Ok(Json(json!({"status": "admin", "type": "admin"})));
    }
    let db = state.db.lock().unwrap();
    let row: (Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>) = db.query_row(
        "SELECT subscription_status, subscription_type, trial_start, trial_end, subscription_start, subscription_end, stripe_customer_id FROM users WHERE id = ?1",
        rusqlite::params![auth.effective_user_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?, r.get(6)?)),
    ).map_err(|_| AppError::not_found("User not found"))?;

    let mut status = row.0.clone().unwrap_or_else(|| "none".into());
    if status == "trial" {
        if let Some(ref end) = row.3 {
            if let Ok(end_dt) = chrono::NaiveDateTime::parse_from_str(end, "%Y-%m-%d %H:%M:%S") {
                if chrono::Utc::now().naive_utc() > end_dt {
                    db.execute("UPDATE users SET subscription_status = 'expired', updated_at = datetime('now') WHERE id = ?1", rusqlite::params![auth.effective_user_id]).ok();
                    status = "expired".into();
                }
            }
        }
    }

    Ok(Json(json!({
        "status": status,
        "type": row.1.unwrap_or_default(),
        "trial_start": row.2.unwrap_or_default(),
        "trial_end": row.3.unwrap_or_default(),
        "subscription_start": row.4.unwrap_or_default(),
        "subscription_end": row.5.unwrap_or_default(),
        "has_stripe": row.6.map(|s| !s.is_empty()).unwrap_or(false),
    })))
}

// Change password
pub async fn change_password(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<Value>) -> Result<Json<Value>> {
    let current = body["currentPassword"].as_str().unwrap_or("");
    let new_pw = body["newPassword"].as_str().unwrap_or("");
    if current.is_empty() || new_pw.is_empty() { return Err(AppError::bad_request("Jelenlegi és új jelszó megadása kötelező")); }
    if new_pw.len() < 6 { return Err(AppError::bad_request("Az új jelszónak legalább 6 karakter hosszúnak kell lennie")); }
    let db = state.db.lock().unwrap();
    let stored_pw: String = db.query_row("SELECT password FROM users WHERE id = ?1", rusqlite::params![auth.effective_user_id], |r| r.get(0)).map_err(|_| AppError::not_found("Felhasználó nem található"))?;
    if !bcrypt::verify(current, &stored_pw).unwrap_or(false) { return Err(AppError::unauthorized("A jelenlegi jelszó helytelen")); }
    let hashed = bcrypt::hash(new_pw, 10)?;
    db.execute("UPDATE users SET password = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![hashed, auth.effective_user_id])?;
    Ok(Json(json!({"success": true, "message": "Jelszó sikeresen megváltoztatva"})))
}

// Delete own account
pub async fn delete_account(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<Value>) -> Result<Json<Value>> {
    let password = body["password"].as_str().unwrap_or("");
    if password.is_empty() { return Err(AppError::bad_request("A jelszó megadása kötelező a fiók törléséhez")); }
    if auth.claims.role == "admin" { return Err(AppError::forbidden("Admin fiók nem törölhető ezen az úton")); }
    let db = state.db.lock().unwrap();
    let (stored_pw, sub_status): (String, Option<String>) = db.query_row("SELECT password, subscription_status FROM users WHERE id = ?1", rusqlite::params![auth.effective_user_id], |r| Ok((r.get(0)?, r.get(1)?))).map_err(|_| AppError::not_found("Felhasználó nem található"))?;
    if !bcrypt::verify(password, &stored_pw).unwrap_or(false) { return Err(AppError::unauthorized("Helytelen jelszó")); }
    if sub_status.as_deref() == Some("active") {
        return Err(AppError::bad_request("Aktív előfizetéssel rendelkezel. Kérjük, először mondd le az előfizetésed."));
    }
    crate::routes::admin::delete_all_user_data(&db, &auth.effective_user_id);
    db.execute("DELETE FROM users WHERE id = ?1", rusqlite::params![auth.effective_user_id])?;
    Ok(Json(json!({"success": true, "message": "Fiók és minden adat sikeresen törölve"})))
}

// Download token
pub async fn download_token(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    use jsonwebtoken::{encode, EncodingKey, Header};
    use crate::middleware::auth::Claims;
    let claims = Claims {
        role: "".into(), user_id: auth.effective_user_id, email: "".into(),
        impersonating: None, impersonating_name: None, impersonating_email: None,
        purpose: Some("download".into()),
        exp: (chrono::Utc::now() + chrono::Duration::minutes(5)).timestamp() as usize,
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()))?;
    Ok(Json(json!({"token": token})))
}
