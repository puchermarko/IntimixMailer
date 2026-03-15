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

pub async fn list_sent(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Query(q): Query<PaginationQuery>) -> Result<Json<Value>> {
    let page = q.page.unwrap_or(1);
    let limit = q.limit.unwrap_or(50);
    let offset = (page - 1) * limit;
    let search = q.search.as_deref().unwrap_or("");
    let uid = &auth.effective_user_id;
    let db = state.db.lock().unwrap();

    let (total, emails): (i64, Vec<Value>);

    if search.is_empty() {
        total = db.query_row(
            "SELECT COUNT(*) FROM (SELECT id FROM email_log WHERE user_id = ?1 UNION ALL SELECT id FROM sent_imap WHERE user_id = ?2)",
            rusqlite::params![uid, uid], |r| r.get(0))?;
        let mut stmt = db.prepare(
            "SELECT id, recipient, subject, date, status, contact_id, contact_name, has_attachments, source FROM (\
             SELECT e.id, e.recipient_email as recipient, e.subject, e.sent_at as date, e.status, e.contact_id, c.name as contact_name, \
               (SELECT COUNT(*) FROM attachments WHERE email_log_id = e.id) as has_attachments, 'local' as source \
             FROM email_log e LEFT JOIN contacts c ON e.contact_id = c.id WHERE e.user_id = ?1 \
             UNION ALL \
             SELECT s.id, s.to_address as recipient, s.subject, s.date, 'sent' as status, s.contact_id, c.name as contact_name, s.has_attachments, 'imap' as source \
             FROM sent_imap s LEFT JOIN contacts c ON s.contact_id = c.id WHERE s.user_id = ?2 \
             ) ORDER BY date DESC LIMIT ?3 OFFSET ?4"
        )?;
        emails = stmt.query_map(rusqlite::params![uid, uid, limit, offset], |r| {
            Ok(json!({"id":r.get::<_,String>(0)?,"recipient":r.get::<_,Option<String>>(1)?,"subject":r.get::<_,Option<String>>(2)?,"date":r.get::<_,Option<String>>(3)?,"status":r.get::<_,Option<String>>(4)?,"contact_id":r.get::<_,Option<String>>(5)?,"contact_name":r.get::<_,Option<String>>(6)?,"has_attachments":r.get::<_,i32>(7)?,"source":r.get::<_,String>(8)?}))
        })?.filter_map(|r| r.ok()).collect();
    } else {
        let s = format!("%{}%", search);
        total = db.query_row(
            "SELECT COUNT(*) FROM (SELECT id FROM email_log WHERE user_id=?1 AND (subject LIKE ?2 OR recipient_email LIKE ?3) UNION ALL SELECT id FROM sent_imap WHERE user_id=?4 AND (subject LIKE ?5 OR to_address LIKE ?6))",
            rusqlite::params![uid, s, s, uid, s, s], |r| r.get(0))?;
        let mut stmt = db.prepare(
            "SELECT id, recipient, subject, date, status, contact_id, contact_name, has_attachments, source FROM (\
             SELECT e.id, e.recipient_email as recipient, e.subject, e.sent_at as date, e.status, e.contact_id, c.name as contact_name, \
               (SELECT COUNT(*) FROM attachments WHERE email_log_id = e.id) as has_attachments, 'local' as source \
             FROM email_log e LEFT JOIN contacts c ON e.contact_id = c.id WHERE e.user_id = ?1 AND (e.subject LIKE ?2 OR e.recipient_email LIKE ?3) \
             UNION ALL \
             SELECT s.id, s.to_address as recipient, s.subject, s.date, 'sent' as status, s.contact_id, c.name as contact_name, s.has_attachments, 'imap' as source \
             FROM sent_imap s LEFT JOIN contacts c ON s.contact_id = c.id WHERE s.user_id = ?4 AND (s.subject LIKE ?5 OR s.to_address LIKE ?6) \
             ) ORDER BY date DESC LIMIT ?7 OFFSET ?8"
        )?;
        emails = stmt.query_map(rusqlite::params![uid, s, s, uid, s, s, limit, offset], |r| {
            Ok(json!({"id":r.get::<_,String>(0)?,"recipient":r.get::<_,Option<String>>(1)?,"subject":r.get::<_,Option<String>>(2)?,"date":r.get::<_,Option<String>>(3)?,"status":r.get::<_,Option<String>>(4)?,"contact_id":r.get::<_,Option<String>>(5)?,"contact_name":r.get::<_,Option<String>>(6)?,"has_attachments":r.get::<_,i32>(7)?,"source":r.get::<_,String>(8)?}))
        })?.filter_map(|r| r.ok()).collect();
    }

    Ok(Json(json!({"emails": emails, "total": total, "page": page, "limit": limit})))
}

pub async fn get_sent_imap(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let email: Value = db.query_row(
        "SELECT s.*, c.name as contact_name FROM sent_imap s LEFT JOIN contacts c ON s.contact_id = c.id WHERE s.id = ?1 AND s.user_id = ?2",
        rusqlite::params![id, auth.effective_user_id],
        |r| Ok(json!({
            "id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"uid":r.get::<_,i64>(2)?,"message_id":r.get::<_,Option<String>>(3)?,
            "from_address":r.get::<_,String>(4)?,"from_name":r.get::<_,Option<String>>(5)?,"to_address":r.get::<_,Option<String>>(6)?,
            "subject":r.get::<_,Option<String>>(7)?,"text_body":r.get::<_,Option<String>>(8)?,"html_body":r.get::<_,Option<String>>(9)?,
            "date":r.get::<_,Option<String>>(10)?,"contact_id":r.get::<_,Option<String>>(11)?,"has_attachments":r.get::<_,i32>(12)?,
            "fetched_at":r.get::<_,Option<String>>(13)?,"contact_name":r.get::<_,Option<String>>(14)?
        })),
    ).map_err(|_| AppError::not_found("Email not found"))?;
    let atts: Vec<Value> = db.prepare("SELECT id, filename, mimetype, size FROM sent_imap_attachments WHERE sent_id = ?1")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"filename":r.get::<_,String>(1)?,"mimetype":r.get::<_,String>(2)?,"size":r.get::<_,i64>(3)?})))?.filter_map(|r| r.ok()).collect();
    let mut result = email.as_object().unwrap().clone();
    result.insert("attachments".into(), Value::Array(atts));
    Ok(Json(Value::Object(result)))
}

#[derive(Deserialize)]
pub struct TokenQuery { pub token: Option<String> }

pub async fn download_sent_imap_attachment(State(state): State<AppState>, Path(id): Path<String>, Query(q): Query<TokenQuery>) -> Result<axum::response::Response> {
    use axum::response::IntoResponse;
    let token = q.token.as_deref().unwrap_or("");
    let user_id = get_user_id_from_token(token, &state.config.jwt_secret).ok_or_else(|| AppError::unauthorized("Unauthorized"))?;
    let db = state.db.lock().unwrap();
    let (filename, mimetype, stored_path): (String, String, String) = db.query_row(
        "SELECT a.filename, a.mimetype, a.stored_path FROM sent_imap_attachments a JOIN sent_imap s ON a.sent_id = s.id WHERE a.id = ?1 AND s.user_id = ?2",
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

// Sent sync (IMAP) - placeholder
pub async fn sync_sent(State(_state): State<AppState>, Extension(_auth): Extension<AuthUser>) -> Result<Json<Value>> {
    Ok(Json(json!({"success": true, "newEmails": 0, "linked": 0, "message": "IMAP sent sync placeholder"})))
}
