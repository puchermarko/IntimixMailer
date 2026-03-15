use axum::{extract::{Path, Query, State}, Extension, Json};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppError, Result};
use crate::middleware::auth::{get_user_id_from_token, AuthUser};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
}

pub async fn list_inbox(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Query(q): Query<PaginationQuery>) -> Result<Json<Value>> {
    let page = q.page.unwrap_or(1);
    let limit = q.limit.unwrap_or(50);
    let offset = (page - 1) * limit;
    let search = q.search.as_deref().unwrap_or("");
    let db = state.db.lock().unwrap();

    let total: i64;
    let emails: Vec<Value>;

    if search.is_empty() {
        total = db.query_row("SELECT COUNT(*) FROM inbox WHERE user_id = ?1", rusqlite::params![auth.effective_user_id], |r| r.get(0))?;
        let mut stmt = db.prepare(
            "SELECT i.id, i.uid, i.from_address, i.from_name, i.to_address, i.subject, i.date, i.flags, i.has_attachments, i.contact_id, c.name as contact_name \
             FROM inbox i LEFT JOIN contacts c ON i.contact_id = c.id WHERE i.user_id = ?1 ORDER BY i.date DESC LIMIT ?2 OFFSET ?3"
        )?;
        emails = stmt.query_map(rusqlite::params![auth.effective_user_id, limit, offset], |r| {
            Ok(json!({"id":r.get::<_,String>(0)?,"uid":r.get::<_,i64>(1)?,"from_address":r.get::<_,String>(2)?,"from_name":r.get::<_,Option<String>>(3)?,"to_address":r.get::<_,Option<String>>(4)?,"subject":r.get::<_,Option<String>>(5)?,"date":r.get::<_,Option<String>>(6)?,"flags":r.get::<_,Option<String>>(7)?,"has_attachments":r.get::<_,i32>(8)?,"contact_id":r.get::<_,Option<String>>(9)?,"contact_name":r.get::<_,Option<String>>(10)?}))
        })?.filter_map(|r| r.ok()).collect();
    } else {
        let s = format!("%{}%", search);
        total = db.query_row("SELECT COUNT(*) FROM inbox i WHERE i.user_id = ?1 AND (i.subject LIKE ?2 OR i.from_address LIKE ?3 OR i.from_name LIKE ?4)", rusqlite::params![auth.effective_user_id, s, s, s], |r| r.get(0))?;
        let mut stmt = db.prepare(
            "SELECT i.id, i.uid, i.from_address, i.from_name, i.to_address, i.subject, i.date, i.flags, i.has_attachments, i.contact_id, c.name as contact_name \
             FROM inbox i LEFT JOIN contacts c ON i.contact_id = c.id WHERE i.user_id = ?1 AND (i.subject LIKE ?2 OR i.from_address LIKE ?3 OR i.from_name LIKE ?4) ORDER BY i.date DESC LIMIT ?5 OFFSET ?6"
        )?;
        emails = stmt.query_map(rusqlite::params![auth.effective_user_id, s, s, s, limit, offset], |r| {
            Ok(json!({"id":r.get::<_,String>(0)?,"uid":r.get::<_,i64>(1)?,"from_address":r.get::<_,String>(2)?,"from_name":r.get::<_,Option<String>>(3)?,"to_address":r.get::<_,Option<String>>(4)?,"subject":r.get::<_,Option<String>>(5)?,"date":r.get::<_,Option<String>>(6)?,"flags":r.get::<_,Option<String>>(7)?,"has_attachments":r.get::<_,i32>(8)?,"contact_id":r.get::<_,Option<String>>(9)?,"contact_name":r.get::<_,Option<String>>(10)?}))
        })?.filter_map(|r| r.ok()).collect();
    }

    Ok(Json(json!({"emails": emails, "total": total, "page": page, "limit": limit})))
}

pub async fn get_inbox_email(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let email: Value = db.query_row(
        "SELECT i.*, c.name as contact_name FROM inbox i LEFT JOIN contacts c ON i.contact_id = c.id WHERE i.id = ?1 AND i.user_id = ?2",
        rusqlite::params![id, auth.effective_user_id],
        |r| Ok(json!({
            "id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"uid":r.get::<_,i64>(2)?,"message_id":r.get::<_,Option<String>>(3)?,
            "from_address":r.get::<_,String>(4)?,"from_name":r.get::<_,Option<String>>(5)?,"to_address":r.get::<_,Option<String>>(6)?,
            "subject":r.get::<_,Option<String>>(7)?,"text_body":r.get::<_,Option<String>>(8)?,"html_body":r.get::<_,Option<String>>(9)?,
            "date":r.get::<_,Option<String>>(10)?,"flags":r.get::<_,Option<String>>(11)?,"contact_id":r.get::<_,Option<String>>(12)?,
            "has_attachments":r.get::<_,i32>(13)?,"fetched_at":r.get::<_,Option<String>>(14)?,"contact_name":r.get::<_,Option<String>>(15)?
        })),
    ).map_err(|_| AppError::not_found("Email not found"))?;
    let atts: Vec<Value> = db.prepare("SELECT id, filename, mimetype, size FROM inbox_attachments WHERE inbox_id = ?1")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"filename":r.get::<_,String>(1)?,"mimetype":r.get::<_,String>(2)?,"size":r.get::<_,i64>(3)?})))?.filter_map(|r| r.ok()).collect();
    let mut result = email.as_object().unwrap().clone();
    result.insert("attachments".into(), Value::Array(atts));
    Ok(Json(Value::Object(result)))
}

pub async fn delete_inbox_email(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM inbox WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| r.get(0)).map_err(|_| AppError::not_found("Email not found"))?;
    let uploads_dir = std::path::Path::new("uploads");
    let paths: Vec<String> = db.prepare("SELECT stored_path FROM inbox_attachments WHERE inbox_id = ?1")?.query_map(rusqlite::params![id], |r| r.get(0))?.filter_map(|r| r.ok()).collect();
    for p in paths { let _ = std::fs::remove_file(uploads_dir.join(&p)); }
    db.execute("DELETE FROM inbox_attachments WHERE inbox_id = ?1", rusqlite::params![id])?;
    db.execute("DELETE FROM inbox WHERE id = ?1", rusqlite::params![id])?;
    Ok(Json(json!({"success": true})))
}

#[derive(Deserialize)]
pub struct TokenQuery { pub token: Option<String> }

pub async fn download_inbox_attachment(State(state): State<AppState>, Path(id): Path<String>, Query(q): Query<TokenQuery>) -> Result<axum::response::Response> {
    use axum::response::IntoResponse;
    let token = q.token.as_deref().unwrap_or("");
    let user_id = get_user_id_from_token(token, &state.config.jwt_secret).ok_or_else(|| AppError::unauthorized("Unauthorized"))?;
    let db = state.db.lock().unwrap();
    let (filename, mimetype, stored_path): (String, String, String) = db.query_row(
        "SELECT a.filename, a.mimetype, a.stored_path FROM inbox_attachments a JOIN inbox i ON a.inbox_id = i.id WHERE a.id = ?1 AND i.user_id = ?2",
        rusqlite::params![id, user_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|_| AppError::not_found("Attachment not found"))?;
    let fp = std::path::Path::new("uploads").join(&stored_path);
    if !fp.exists() { return Err(AppError::not_found("File not found on disk")); }
    let data = std::fs::read(&fp)?;
    Ok(([
        (axum::http::header::CONTENT_TYPE, mimetype),
        (axum::http::header::CONTENT_DISPOSITION, format!("inline; filename=\"{}\"", filename)),
    ], data).into_response())
}

// IMAP sync endpoint - inbox sync
pub async fn sync_inbox(State(_state): State<AppState>, Extension(_auth): Extension<AuthUser>) -> Result<Json<Value>> {
    // IMAP sync is complex - for now return a stub indicating it needs the IMAP client
    // Full IMAP integration with async-imap would require significant async work
    Ok(Json(json!({"success": true, "newEmails": 0, "linked": 0, "message": "IMAP sync placeholder - configure IMAP settings"})))
}
