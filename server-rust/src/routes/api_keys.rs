use axum::{extract::{Path, State}, Extension, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

pub async fn list_api_keys(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, name, key, created_at, last_used_at, active FROM api_keys WHERE user_id = ?1 ORDER BY created_at DESC")?;
    let keys: Vec<Value> = stmt.query_map(rusqlite::params![auth.effective_user_id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"name":r.get::<_,String>(1)?,"key":r.get::<_,String>(2)?,"created_at":r.get::<_,Option<String>>(3)?,"last_used_at":r.get::<_,Option<String>>(4)?,"active":r.get::<_,i32>(5)?}))
    })?.filter_map(|r| r.ok()).collect();
    Ok(Json(Value::Array(keys)))
}

#[derive(Deserialize)]
pub struct ApiKeyBody { pub name: Option<String> }

pub async fn create_api_key(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<ApiKeyBody>) -> Result<Json<Value>> {
    let name = body.name.as_deref().unwrap_or("");
    if name.is_empty() { return Err(AppError::bad_request("Name is required")); }
    let id = Uuid::new_v4().to_string();
    let key = format!("imx_{}{}", Uuid::new_v4().to_string().replace('-', ""), &Uuid::new_v4().to_string().replace('-', "")[..16]);
    let db = state.db.lock().unwrap();
    db.execute("INSERT INTO api_keys (id, user_id, name, key) VALUES (?1,?2,?3,?4)", rusqlite::params![id, auth.effective_user_id, name, key])?;
    Ok(Json(json!({"id": id, "name": name, "key": key})))
}

pub async fn delete_api_key(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    db.execute("DELETE FROM api_keys WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id])?;
    Ok(Json(json!({"success": true})))
}

pub async fn toggle_api_key(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let active: i32 = db.query_row("SELECT active FROM api_keys WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| r.get(0)).map_err(|_| AppError::not_found("API key not found"))?;
    let new_active = if active == 1 { 0 } else { 1 };
    db.execute("UPDATE api_keys SET active = ?1 WHERE id = ?2", rusqlite::params![new_active, id])?;
    Ok(Json(json!({"success": true, "active": new_active == 1})))
}
