use axum::{extract::{Path, Query, State}, Extension, Json, response::Redirect};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppError, Result};
use crate::helpers::{get_oauth_tokens, save_oauth_tokens, set_user_setting, OAuthSaveData};
use crate::middleware::auth::{AuthUser, Claims};
use crate::state::AppState;

pub async fn get_auth_url(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthUser>,
    Path(provider): Path<String>,
) -> Result<Json<Value>> {
    match provider.as_str() {
        "google" => {
            let client_id = state.config.google_client_id.as_ref().ok_or_else(|| AppError::bad_request("Google OAuth2 nincs konfigurálva a szerveren."))?;
            let redirect_uri = state.config.google_redirect_uri.as_deref().unwrap_or("/api/oauth2/google/callback");
            let st_claims = Claims {
                role: "".into(), user_id: auth.effective_user_id.clone(), email: "".into(),
                impersonating: None, impersonating_name: None, impersonating_email: None,
                purpose: Some("google".into()),
                exp: (chrono::Utc::now() + chrono::Duration::minutes(10)).timestamp() as usize,
            };
            let state_token = encode(&Header::default(), &st_claims, &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()))?;
            let url = format!(
                "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&state={}",
                urlencoding::encode(client_id),
                urlencoding::encode(redirect_uri),
                urlencoding::encode("https://mail.google.com/ openid email"),
                urlencoding::encode(&state_token),
            );
            Ok(Json(json!({"url": url})))
        }
        "microsoft" => {
            let client_id = state.config.microsoft_client_id.as_ref().ok_or_else(|| AppError::bad_request("Microsoft OAuth2 nincs konfigurálva a szerveren."))?;
            let redirect_uri = state.config.microsoft_redirect_uri.as_deref().unwrap_or("/api/oauth2/microsoft/callback");
            let st_claims = Claims {
                role: "".into(), user_id: auth.effective_user_id.clone(), email: "".into(),
                impersonating: None, impersonating_name: None, impersonating_email: None,
                purpose: Some("microsoft".into()),
                exp: (chrono::Utc::now() + chrono::Duration::minutes(10)).timestamp() as usize,
            };
            let state_token = encode(&Header::default(), &st_claims, &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()))?;
            let url = format!(
                "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id={}&redirect_uri={}&response_type=code&scope={}&response_mode=query&state={}",
                urlencoding::encode(client_id),
                urlencoding::encode(redirect_uri),
                urlencoding::encode("https://outlook.office365.com/SMTP.Send https://outlook.office365.com/IMAP.AccessAsUser.All offline_access openid email"),
                urlencoding::encode(&state_token),
            );
            Ok(Json(json!({"url": url})))
        }
        _ => Err(AppError::bad_request("Ismeretlen OAuth provider.")),
    }
}

#[derive(Deserialize)]
pub struct OAuthCallback {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

pub async fn google_callback(State(state): State<AppState>, Query(params): Query<OAuthCallback>) -> axum::response::Response {
    if let Some(err) = params.error {
        return Redirect::to(&format!("/?oauth_error={}", urlencoding::encode(&err))).into_response();
    }
    let result = async {
        let st = params.state.as_deref().unwrap_or("");
        let payload = decode::<Claims>(st, &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()), &Validation::default())
            .map_err(|_| AppError::bad_request("Invalid state"))?;
        if payload.claims.purpose.as_deref() != Some("google") { return Err(AppError::bad_request("Invalid state provider")); }
        let code = params.code.as_deref().ok_or_else(|| AppError::bad_request("No code"))?;
        let redirect_uri = state.config.google_redirect_uri.as_deref().unwrap_or("/api/oauth2/google/callback");
        let client = reqwest::Client::new();
        let token_res = client.post("https://oauth2.googleapis.com/token")
            .form(&[
                ("code", code),
                ("client_id", state.config.google_client_id.as_deref().unwrap_or("")),
                ("client_secret", state.config.google_client_secret.as_deref().unwrap_or("")),
                ("redirect_uri", redirect_uri),
                ("grant_type", "authorization_code"),
            ])
            .send().await?.json::<Value>().await?;
        if token_res.get("error").is_some() {
            return Err(AppError::internal(token_res["error_description"].as_str().unwrap_or("Token exchange failed").to_string()));
        }
        let access_token = token_res["access_token"].as_str().unwrap_or("").to_string();
        let refresh_token = token_res["refresh_token"].as_str().unwrap_or("").to_string();
        let expires_in = token_res["expires_in"].as_i64();
        let scope = token_res["scope"].as_str().unwrap_or("").to_string();

        // Get user email
        let mut email = String::new();
        if let Ok(info) = client.get("https://www.googleapis.com/oauth2/v2/userinfo")
            .bearer_auth(&access_token).send().await {
            if let Ok(info_json) = info.json::<Value>().await {
                email = info_json["email"].as_str().unwrap_or("").to_string();
            }
        }

        let user_id = payload.claims.user_id;
        let db = state.db.lock().unwrap();
        save_oauth_tokens(&db, &state.enc_key, &user_id, "google", &OAuthSaveData {
            access_token, refresh_token, expires_in, email: email.clone(), scope,
        });
        set_user_setting(&db, &state.enc_key, &user_id, "smtp_host", "smtp.gmail.com");
        set_user_setting(&db, &state.enc_key, &user_id, "smtp_port", "587");
        if !email.is_empty() { set_user_setting(&db, &state.enc_key, &user_id, "smtp_user", &email); }
        set_user_setting(&db, &state.enc_key, &user_id, "imap_host", "imap.gmail.com");
        set_user_setting(&db, &state.enc_key, &user_id, "imap_port", "993");
        if !email.is_empty() { set_user_setting(&db, &state.enc_key, &user_id, "imap_user", &email); }
        tracing::info!("[OAuth2] Google tokens saved for user {} ({})", user_id, email);
        Ok::<_, AppError>(())
    }.await;
    match result {
        Ok(()) => Redirect::to("/?oauth_success=google").into_response(),
        Err(e) => Redirect::to(&format!("/?oauth_error={}", urlencoding::encode(&e.message))).into_response(),
    }
}

pub async fn microsoft_callback(State(state): State<AppState>, Query(params): Query<OAuthCallback>) -> axum::response::Response {
    if let Some(err) = params.error.as_ref().or(params.error_description.as_ref()) {
        return Redirect::to(&format!("/?oauth_error={}", urlencoding::encode(err))).into_response();
    }
    let result = async {
        let st = params.state.as_deref().unwrap_or("");
        let payload = decode::<Claims>(st, &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()), &Validation::default())
            .map_err(|_| AppError::bad_request("Invalid state"))?;
        if payload.claims.purpose.as_deref() != Some("microsoft") { return Err(AppError::bad_request("Invalid state provider")); }
        let code = params.code.as_deref().ok_or_else(|| AppError::bad_request("No code"))?;
        let redirect_uri = state.config.microsoft_redirect_uri.as_deref().unwrap_or("/api/oauth2/microsoft/callback");
        let client = reqwest::Client::new();
        let token_res = client.post("https://login.microsoftonline.com/common/oauth2/v2.0/token")
            .form(&[
                ("code", code),
                ("client_id", state.config.microsoft_client_id.as_deref().unwrap_or("")),
                ("client_secret", state.config.microsoft_client_secret.as_deref().unwrap_or("")),
                ("redirect_uri", redirect_uri),
                ("grant_type", "authorization_code"),
                ("scope", "https://outlook.office365.com/SMTP.Send offline_access openid email"),
            ])
            .send().await?.json::<Value>().await?;
        if token_res.get("error").is_some() {
            return Err(AppError::internal(token_res["error_description"].as_str().unwrap_or("Token exchange failed").to_string()));
        }
        let access_token = token_res["access_token"].as_str().unwrap_or("").to_string();
        let refresh_token = token_res["refresh_token"].as_str().unwrap_or("").to_string();
        let expires_in = token_res["expires_in"].as_i64();
        let scope = token_res["scope"].as_str().unwrap_or("").to_string();

        // Decode id_token to get email
        let mut email = String::new();
        if let Some(id_token) = token_res["id_token"].as_str() {
            let parts: Vec<&str> = id_token.split('.').collect();
            if parts.len() >= 2 {
                if let Ok(decoded) = base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, parts[1]) {
                    if let Ok(payload) = serde_json::from_slice::<Value>(&decoded) {
                        email = payload["email"].as_str()
                            .or(payload["preferred_username"].as_str())
                            .unwrap_or("").to_string();
                    }
                }
            }
        }

        let user_id = payload.claims.user_id;
        let db = state.db.lock().unwrap();
        save_oauth_tokens(&db, &state.enc_key, &user_id, "microsoft", &OAuthSaveData {
            access_token, refresh_token, expires_in, email: email.clone(), scope,
        });
        set_user_setting(&db, &state.enc_key, &user_id, "smtp_host", "smtp-mail.outlook.com");
        set_user_setting(&db, &state.enc_key, &user_id, "smtp_port", "587");
        if !email.is_empty() { set_user_setting(&db, &state.enc_key, &user_id, "smtp_user", &email); }
        set_user_setting(&db, &state.enc_key, &user_id, "imap_host", "outlook.office365.com");
        set_user_setting(&db, &state.enc_key, &user_id, "imap_port", "993");
        if !email.is_empty() { set_user_setting(&db, &state.enc_key, &user_id, "imap_user", &email); }
        tracing::info!("[OAuth2] Microsoft tokens saved for user {} ({})", user_id, email);
        Ok::<_, AppError>(())
    }.await;
    match result {
        Ok(()) => Redirect::to("/?oauth_success=microsoft").into_response(),
        Err(e) => Redirect::to(&format!("/?oauth_error={}", urlencoding::encode(&e.message))).into_response(),
    }
}

pub async fn oauth_status(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let google = get_oauth_tokens(&db, &state.enc_key, &auth.effective_user_id, "google");
    let microsoft = get_oauth_tokens(&db, &state.enc_key, &auth.effective_user_id, "microsoft");
    Ok(Json(json!({
        "google": google.map(|t| json!({"connected": true, "email": t.email, "expires_at": t.expires_at})).unwrap_or(json!({"connected": false})),
        "microsoft": microsoft.map(|t| json!({"connected": true, "email": t.email, "expires_at": t.expires_at})).unwrap_or(json!({"connected": false})),
    })))
}

pub async fn disconnect_oauth(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(provider): Path<String>) -> Result<Json<Value>> {
    if provider != "google" && provider != "microsoft" { return Err(AppError::bad_request("Invalid provider")); }
    let db = state.db.lock().unwrap();
    db.execute("DELETE FROM oauth_tokens WHERE user_id = ?1 AND provider = ?2", rusqlite::params![auth.effective_user_id, provider])?;
    let name = if provider == "google" { "Google" } else { "Microsoft" };
    Ok(Json(json!({"success": true, "message": format!("{} OAuth2 leválasztva.", name)})))
}

use axum::response::IntoResponse;
