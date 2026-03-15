use axum::{extract::{Path, State}, Extension, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

pub async fn list_templates(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, user_id, name, description, category, subject, html, blocks_json, created_at, updated_at FROM custom_templates WHERE user_id = ?1 ORDER BY updated_at DESC")?;
    let templates: Vec<Value> = stmt.query_map(rusqlite::params![auth.effective_user_id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"name":r.get::<_,String>(2)?,"description":r.get::<_,Option<String>>(3)?,"category":r.get::<_,Option<String>>(4)?,"subject":r.get::<_,Option<String>>(5)?,"html":r.get::<_,Option<String>>(6)?,"blocks_json":r.get::<_,Option<String>>(7)?,"created_at":r.get::<_,Option<String>>(8)?,"updated_at":r.get::<_,Option<String>>(9)?}))
    })?.filter_map(|r| r.ok()).collect();
    Ok(Json(Value::Array(templates)))
}

#[derive(Deserialize)]
pub struct TemplateBody {
    pub name: Option<String>, pub description: Option<String>, pub category: Option<String>,
    pub subject: Option<String>, pub html: Option<String>, pub blocks_json: Option<String>,
}

pub async fn create_template(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<TemplateBody>) -> Result<Json<Value>> {
    let name = body.name.as_deref().unwrap_or("");
    if name.is_empty() { return Err(AppError::bad_request("Name is required")); }
    let id = Uuid::new_v4().to_string();
    let db = state.db.lock().unwrap();
    db.execute(
        "INSERT INTO custom_templates (id, user_id, name, description, category, subject, html, blocks_json) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        rusqlite::params![id, auth.effective_user_id, name, body.description.as_deref().unwrap_or(""), body.category.as_deref().unwrap_or("Custom"), body.subject.as_deref().unwrap_or(""), body.html.as_deref().unwrap_or(""), body.blocks_json.as_deref().unwrap_or("")],
    )?;
    Ok(Json(json!({"id": id, "name": name, "description": body.description, "category": body.category, "subject": body.subject, "html": body.html, "blocks_json": body.blocks_json})))
}

pub async fn update_template(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>, Json(body): Json<TemplateBody>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM custom_templates WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| r.get(0)).map_err(|_| AppError::not_found("Template not found"))?;
    db.execute(
        "UPDATE custom_templates SET name=?1, description=?2, category=?3, subject=?4, html=?5, blocks_json=?6, updated_at=datetime('now') WHERE id=?7",
        rusqlite::params![body.name.as_deref().unwrap_or(""), body.description.as_deref().unwrap_or(""), body.category.as_deref().unwrap_or("Custom"), body.subject.as_deref().unwrap_or(""), body.html.as_deref().unwrap_or(""), body.blocks_json.as_deref().unwrap_or(""), id],
    )?;
    Ok(Json(json!({"success": true})))
}

pub async fn delete_template(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM custom_templates WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| r.get(0)).map_err(|_| AppError::not_found("Template not found"))?;
    db.execute("DELETE FROM custom_templates WHERE id = ?1", rusqlite::params![id])?;
    Ok(Json(json!({"success": true})))
}
