use axum::{extract::{Path, State}, Extension, Json};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::db::set_app_setting;
use crate::error::{AppError, Result};
use crate::helpers::{get_user_settings, set_user_setting};
use crate::middleware::auth::{AuthUser, Claims};
use crate::state::AppState;

pub async fn get_global_settings(State(state): State<AppState>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT key, value FROM app_settings").unwrap();
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).unwrap();
    let mut settings = serde_json::Map::new();
    for row in rows {
        if let Ok((k, v)) = row { settings.insert(k, Value::String(v)); }
    }
    Ok(Json(Value::Object(settings)))
}

#[derive(Deserialize)]
pub struct UpdateSettingsBody { pub settings: Option<serde_json::Map<String, Value>> }

pub async fn put_global_settings(
    State(state): State<AppState>,
    Json(body): Json<UpdateSettingsBody>,
) -> Result<Json<Value>> {
    let settings = body.settings.ok_or_else(|| AppError::bad_request("Settings object required"))?;
    let db = state.db.lock().unwrap();
    for (key, value) in settings {
        set_app_setting(&db, &key, value.as_str().unwrap_or(""));
    }
    Ok(Json(json!({"success": true})))
}

pub async fn list_users(State(state): State<AppState>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare(
        "SELECT u.id, u.email, u.name, u.active, u.created_at, u.updated_at, \
         u.subscription_status, u.subscription_type, u.trial_start, u.trial_end, \
         u.subscription_start, u.subscription_end, u.enhanced_mail_enabled, u.mfa_enabled, \
         (SELECT COUNT(*) FROM contacts WHERE user_id = u.id) as contact_count, \
         (SELECT COUNT(*) FROM email_log WHERE user_id = u.id) + (SELECT COUNT(*) FROM sent_imap WHERE user_id = u.id) as email_count, \
         (SELECT COUNT(*) FROM quotes WHERE user_id = u.id) as quote_count \
         FROM users u ORDER BY u.created_at DESC"
    )?;
    let users: Vec<Value> = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "email": row.get::<_, String>(1)?,
            "name": row.get::<_, Option<String>>(2)?,
            "active": row.get::<_, i32>(3)?,
            "created_at": row.get::<_, Option<String>>(4)?,
            "updated_at": row.get::<_, Option<String>>(5)?,
            "subscription_status": row.get::<_, Option<String>>(6)?,
            "subscription_type": row.get::<_, Option<String>>(7)?,
            "trial_start": row.get::<_, Option<String>>(8)?,
            "trial_end": row.get::<_, Option<String>>(9)?,
            "subscription_start": row.get::<_, Option<String>>(10)?,
            "subscription_end": row.get::<_, Option<String>>(11)?,
            "enhanced_mail_enabled": row.get::<_, Option<i32>>(12)?,
            "mfa_enabled": row.get::<_, Option<i32>>(13)?,
            "contact_count": row.get::<_, i32>(14)?,
            "email_count": row.get::<_, i32>(15)?,
            "quote_count": row.get::<_, i32>(16)?,
        }))
    })?.filter_map(|r| r.ok()).collect();
    Ok(Json(Value::Array(users)))
}

#[derive(Deserialize)]
pub struct CreateUserBody { pub email: Option<String>, pub password: Option<String>, pub name: Option<String> }

pub async fn create_user(State(state): State<AppState>, Json(body): Json<CreateUserBody>) -> Result<Json<Value>> {
    let email = body.email.as_deref().unwrap_or("");
    let password = body.password.as_deref().unwrap_or("");
    if email.is_empty() || password.is_empty() { return Err(AppError::bad_request("Email and password required")); }
    let db = state.db.lock().unwrap();
    let existing: Option<String> = db.query_row("SELECT id FROM users WHERE email = ?1", rusqlite::params![email], |r| r.get(0)).ok();
    if existing.is_some() { return Err(AppError::conflict("User with this email already exists")); }
    let id = Uuid::new_v4().to_string();
    let hashed = bcrypt::hash(password, 10)?;
    db.execute("INSERT INTO users (id, email, password, name) VALUES (?1, ?2, ?3, ?4)", rusqlite::params![id, email, hashed, body.name.as_deref().unwrap_or("")])?;
    let user = db.query_row("SELECT id, email, name, active, created_at FROM users WHERE id = ?1", rusqlite::params![id], |row| {
        Ok(json!({"id": row.get::<_,String>(0)?, "email": row.get::<_,String>(1)?, "name": row.get::<_,Option<String>>(2)?, "active": row.get::<_,i32>(3)?, "created_at": row.get::<_,Option<String>>(4)?}))
    })?;
    Ok(Json(user))
}

#[derive(Deserialize)]
pub struct UpdateUserBody { pub email: Option<String>, pub password: Option<String>, pub name: Option<String>, pub active: Option<i32> }

pub async fn update_user(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<UpdateUserBody>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let user: (String, String, Option<String>, i32) = db.query_row("SELECT email, password, name, active FROM users WHERE id = ?1", rusqlite::params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))).map_err(|_| AppError::not_found("User not found"))?;
    if let Some(ref new_email) = body.email {
        if new_email != &user.0 {
            let dup: Option<String> = db.query_row("SELECT id FROM users WHERE email = ?1 AND id != ?2", rusqlite::params![new_email, id], |r| r.get(0)).ok();
            if dup.is_some() { return Err(AppError::conflict("Another user with this email already exists")); }
        }
    }
    let new_pw = if let Some(ref pw) = body.password { bcrypt::hash(pw, 10)? } else { user.1 };
    db.execute("UPDATE users SET email = ?1, password = ?2, name = ?3, active = ?4, updated_at = datetime('now') WHERE id = ?5",
        rusqlite::params![body.email.as_deref().unwrap_or(&user.0), new_pw, body.name.as_deref().or(user.2.as_deref()).unwrap_or(""), body.active.unwrap_or(user.3), id])?;
    let updated = db.query_row("SELECT id, email, name, active, created_at, updated_at FROM users WHERE id = ?1", rusqlite::params![id], |row| {
        Ok(json!({"id": row.get::<_,String>(0)?, "email": row.get::<_,String>(1)?, "name": row.get::<_,Option<String>>(2)?, "active": row.get::<_,i32>(3)?, "created_at": row.get::<_,Option<String>>(4)?, "updated_at": row.get::<_,Option<String>>(5)?}))
    })?;
    Ok(Json(updated))
}

pub async fn delete_user(State(state): State<AppState>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM users WHERE id = ?1", rusqlite::params![id], |r| r.get(0)).map_err(|_| AppError::not_found("User not found"))?;
    delete_all_user_data(&db, &id);
    db.execute("DELETE FROM users WHERE id = ?1", rusqlite::params![id])?;
    Ok(Json(json!({"success": true})))
}

pub fn delete_all_user_data(db: &rusqlite::Connection, uid: &str) {
    db.execute("DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE user_id = ?1)", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM quotes WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM attachments WHERE email_log_id IN (SELECT id FROM email_log WHERE user_id = ?1)", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM email_log WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM inbox_attachments WHERE inbox_id IN (SELECT id FROM inbox WHERE user_id = ?1)", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM inbox WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM sent_imap_attachments WHERE sent_id IN (SELECT id FROM sent_imap WHERE user_id = ?1)", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM sent_imap WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM contacts WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM custom_templates WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM api_keys WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM user_settings WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM oauth_tokens WHERE user_id = ?1", rusqlite::params![uid]).ok();
    db.execute("DELETE FROM mfa_tokens WHERE user_id = ?1", rusqlite::params![uid]).ok();
}

pub async fn impersonate(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let user: (String, String, Option<String>) = db.query_row("SELECT id, email, name FROM users WHERE id = ?1", rusqlite::params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(|_| AppError::not_found("User not found"))?;
    let claims = Claims {
        role: "admin".into(), user_id: "__admin__".into(), email: auth.claims.email.clone(),
        impersonating: Some(user.0.clone()), impersonating_name: user.2.clone(), impersonating_email: Some(user.1.clone()),
        purpose: None, exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()))?;
    Ok(Json(json!({"token": token, "user": {"id": user.0, "email": user.1, "name": user.2}})))
}

pub async fn get_user_settings_admin(State(state): State<AppState>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let settings = get_user_settings(&db, &state.enc_key, &id);
    Ok(Json(serde_json::to_value(settings).unwrap()))
}

pub async fn put_user_settings_admin(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<UpdateSettingsBody>) -> Result<Json<Value>> {
    let settings = body.settings.ok_or_else(|| AppError::bad_request("Settings object required"))?;
    let db = state.db.lock().unwrap();
    for (key, value) in settings {
        set_user_setting(&db, &state.enc_key, &id, &key, value.as_str().unwrap_or(""));
    }
    Ok(Json(json!({"success": true})))
}

#[derive(Deserialize)]
pub struct SubscriptionAction { pub action: Option<String> }

pub async fn update_subscription(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<SubscriptionAction>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM users WHERE id = ?1", rusqlite::params![id], |r| r.get(0)).map_err(|_| AppError::not_found("User not found"))?;
    let action = body.action.as_deref().unwrap_or("");
    match action {
        "activate" => { db.execute("UPDATE users SET subscription_status = 'active', subscription_type = 'paid', subscription_start = datetime('now'), subscription_end = '', updated_at = datetime('now') WHERE id = ?1", rusqlite::params![id])?; }
        "deactivate" => { db.execute("UPDATE users SET subscription_status = 'inactive', updated_at = datetime('now') WHERE id = ?1", rusqlite::params![id])?; }
        "start_trial" => {
            let trial_end = (chrono::Utc::now() + chrono::Duration::days(30)).format("%Y-%m-%d %H:%M:%S").to_string();
            db.execute("UPDATE users SET subscription_status = 'trial', subscription_type = 'trial', trial_start = datetime('now'), trial_end = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![trial_end, id])?;
        }
        "stop_trial" => { db.execute("UPDATE users SET subscription_status = 'inactive', updated_at = datetime('now') WHERE id = ?1", rusqlite::params![id])?; }
        _ => return Err(AppError::bad_request("Invalid action. Use: activate, deactivate, start_trial, stop_trial")),
    }
    let updated = db.query_row("SELECT id, email, name, active, subscription_status, subscription_type, trial_start, trial_end, subscription_start, subscription_end FROM users WHERE id = ?1", rusqlite::params![id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"email":r.get::<_,String>(1)?,"name":r.get::<_,Option<String>>(2)?,"active":r.get::<_,i32>(3)?,"subscription_status":r.get::<_,Option<String>>(4)?,"subscription_type":r.get::<_,Option<String>>(5)?,"trial_start":r.get::<_,Option<String>>(6)?,"trial_end":r.get::<_,Option<String>>(7)?,"subscription_start":r.get::<_,Option<String>>(8)?,"subscription_end":r.get::<_,Option<String>>(9)?}))
    })?;
    Ok(Json(updated))
}

#[derive(Deserialize)]
pub struct FeaturesBody { pub enhanced_mail_enabled: Option<bool>, pub mfa_enabled: Option<bool> }

pub async fn update_features(State(state): State<AppState>, Path(id): Path<String>, Json(body): Json<FeaturesBody>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM users WHERE id = ?1", rusqlite::params![id], |r| r.get(0)).map_err(|_| AppError::not_found("User not found"))?;
    if let Some(v) = body.enhanced_mail_enabled {
        db.execute("UPDATE users SET enhanced_mail_enabled = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![v as i32, id])?;
    }
    if let Some(v) = body.mfa_enabled {
        db.execute("UPDATE users SET mfa_enabled = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![v as i32, id])?;
    }
    let updated = db.query_row("SELECT id, email, name, enhanced_mail_enabled, mfa_enabled FROM users WHERE id = ?1", rusqlite::params![id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"email":r.get::<_,String>(1)?,"name":r.get::<_,Option<String>>(2)?,"enhanced_mail_enabled":r.get::<_,Option<i32>>(3)?,"mfa_enabled":r.get::<_,Option<i32>>(4)?}))
    })?;
    Ok(Json(updated))
}

pub async fn get_features(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    if auth.claims.role == "admin" {
        return Ok(Json(json!({"enhanced_mail_enabled": true, "mfa_enabled": false})));
    }
    let db = state.db.lock().unwrap();
    let (enh, mfa): (Option<i32>, Option<i32>) = db.query_row("SELECT enhanced_mail_enabled, mfa_enabled FROM users WHERE id = ?1", rusqlite::params![auth.effective_user_id], |r| Ok((r.get(0)?, r.get(1)?))).map_err(|_| AppError::not_found("User not found"))?;
    Ok(Json(json!({"enhanced_mail_enabled": enh.unwrap_or(0) != 0, "mfa_enabled": mfa.unwrap_or(0) != 0})))
}

#[derive(Deserialize)]
pub struct MfaToggle { pub enabled: Option<bool> }

pub async fn toggle_mfa(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<MfaToggle>) -> Result<Json<Value>> {
    if auth.claims.role == "admin" { return Err(AppError::bad_request("Admin MFA is not supported via this endpoint")); }
    let enabled = body.enabled.unwrap_or(false);
    let db = state.db.lock().unwrap();
    db.execute("UPDATE users SET mfa_enabled = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![enabled as i32, auth.effective_user_id])?;
    Ok(Json(json!({"success": true, "mfa_enabled": enabled})))
}
