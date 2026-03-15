use axum::{extract::{Path, Query, State}, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::helpers::{find_contact_by_email, get_user_settings, log_email};
use crate::state::AppState;

/// API key authentication - extracts user_id from API key header or query param
fn authenticate_api_key(db: &rusqlite::Connection, api_key: &str) -> std::result::Result<String, AppError> {
    if api_key.is_empty() {
        return Err(AppError::unauthorized("API key required. Pass via X-Api-Key header or api_key query parameter."));
    }
    let row: (String, String, i32) = db.query_row(
        "SELECT id, user_id, active FROM api_keys WHERE key = ?1",
        rusqlite::params![api_key],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|_| AppError::unauthorized("Invalid API key"))?;
    if row.2 == 0 { return Err(AppError::forbidden("API key is disabled")); }

    // Check subscription
    let user: Option<(Option<String>, Option<String>)> = db.query_row(
        "SELECT subscription_status, trial_end FROM users WHERE id = ?1",
        rusqlite::params![row.1], |r| Ok((r.get(0)?, r.get(1)?)),
    ).ok();
    if let Some((status, trial_end)) = user {
        let mut s = status.unwrap_or_else(|| "none".into());
        if s == "trial" {
            if let Some(ref end) = trial_end {
                if let Ok(end_dt) = chrono::NaiveDateTime::parse_from_str(end, "%Y-%m-%d %H:%M:%S") {
                    if chrono::Utc::now().naive_utc() > end_dt { s = "expired".into(); }
                }
            }
        }
        if s != "active" && s != "trial" {
            return Err(AppError::forbidden("Subscription inactive. API access requires an active subscription."));
        }
    }

    db.execute("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?1", rusqlite::params![row.0]).ok();
    Ok(row.1)
}

#[derive(Deserialize)]
pub struct ApiKeyQuery { pub api_key: Option<String> }

fn get_api_key_from_req(headers: &axum::http::HeaderMap, query: &ApiKeyQuery) -> String {
    headers.get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .or_else(|| query.api_key.clone())
        .unwrap_or_default()
}

// GET /api/v1/templates
pub async fn list_templates(State(state): State<AppState>, headers: axum::http::HeaderMap, Query(q): Query<ApiKeyQuery>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let user_id = authenticate_api_key(&db, &get_api_key_from_req(&headers, &q))?;
    let mut stmt = db.prepare("SELECT id, name, description, category, subject, html, created_at, updated_at FROM custom_templates WHERE user_id = ?1 ORDER BY updated_at DESC")?;
    let templates: Vec<Value> = stmt.query_map(rusqlite::params![user_id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"name":r.get::<_,String>(1)?,"description":r.get::<_,Option<String>>(2)?,"category":r.get::<_,Option<String>>(3)?,"subject":r.get::<_,Option<String>>(4)?,"html":r.get::<_,Option<String>>(5)?,"created_at":r.get::<_,Option<String>>(6)?,"updated_at":r.get::<_,Option<String>>(7)?}))
    })?.filter_map(|r| r.ok()).collect();
    Ok(Json(json!({"templates": templates})))
}

// GET /api/v1/templates/:id
pub async fn get_template(State(state): State<AppState>, headers: axum::http::HeaderMap, Query(q): Query<ApiKeyQuery>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let user_id = authenticate_api_key(&db, &get_api_key_from_req(&headers, &q))?;
    let template: Value = db.query_row("SELECT * FROM custom_templates WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"name":r.get::<_,String>(2)?,"description":r.get::<_,Option<String>>(3)?,"category":r.get::<_,Option<String>>(4)?,"subject":r.get::<_,Option<String>>(5)?,"html":r.get::<_,Option<String>>(6)?,"blocks_json":r.get::<_,Option<String>>(7)?,"created_at":r.get::<_,Option<String>>(8)?,"updated_at":r.get::<_,Option<String>>(9)?}))
    }).map_err(|_| AppError::not_found("Template not found"))?;
    Ok(Json(template))
}

#[derive(Deserialize)]
pub struct ContactsQuery { pub api_key: Option<String>, pub search: Option<String>, pub page: Option<i64>, pub limit: Option<i64> }

// GET /api/v1/contacts
pub async fn list_contacts(State(state): State<AppState>, headers: axum::http::HeaderMap, Query(q): Query<ContactsQuery>) -> Result<Json<Value>> {
    let api_key = headers.get("x-api-key").and_then(|v| v.to_str().ok()).map(|s| s.to_string()).or(q.api_key.clone()).unwrap_or_default();
    let db = state.db.lock().unwrap();
    let user_id = authenticate_api_key(&db, &api_key)?;
    let page = q.page.unwrap_or(1);
    let limit = q.limit.unwrap_or(50);
    let offset = (page - 1) * limit;
    let search = q.search.as_deref().unwrap_or("");

    if search.is_empty() {
        let total: i64 = db.query_row("SELECT COUNT(*) FROM contacts WHERE user_id = ?1", rusqlite::params![user_id], |r| r.get(0))?;
        let mut stmt = db.prepare("SELECT c.id, c.name, c.email, c.phone, c.notes, c.created_at, \
            (SELECT COUNT(*) FROM email_log WHERE contact_id = c.id) + (SELECT COUNT(*) FROM sent_imap WHERE contact_id = c.id) as sent_count, \
            (SELECT COUNT(*) FROM inbox WHERE contact_id = c.id) as received_count \
            FROM contacts c WHERE c.user_id = ?1 ORDER BY c.name ASC LIMIT ?2 OFFSET ?3")?;
        let contacts: Vec<Value> = stmt.query_map(rusqlite::params![user_id, limit, offset], |r| {
            Ok(json!({"id":r.get::<_,String>(0)?,"name":r.get::<_,String>(1)?,"email":r.get::<_,String>(2)?,"phone":r.get::<_,Option<String>>(3)?,"notes":r.get::<_,Option<String>>(4)?,"created_at":r.get::<_,Option<String>>(5)?,"sent_count":r.get::<_,i64>(6)?,"received_count":r.get::<_,i64>(7)?}))
        })?.filter_map(|r| r.ok()).collect();
        Ok(Json(json!({"contacts": contacts, "total": total, "page": page, "limit": limit})))
    } else {
        let s = format!("%{}%", search);
        let total: i64 = db.query_row("SELECT COUNT(*) FROM contacts WHERE user_id = ?1 AND (name LIKE ?2 OR email LIKE ?3)", rusqlite::params![user_id, s, s], |r| r.get(0))?;
        let mut stmt = db.prepare("SELECT c.id, c.name, c.email, c.phone, c.notes, c.created_at, \
            (SELECT COUNT(*) FROM email_log WHERE contact_id = c.id) + (SELECT COUNT(*) FROM sent_imap WHERE contact_id = c.id) as sent_count, \
            (SELECT COUNT(*) FROM inbox WHERE contact_id = c.id) as received_count \
            FROM contacts c WHERE c.user_id = ?1 AND (c.name LIKE ?2 OR c.email LIKE ?3) ORDER BY c.name ASC LIMIT ?4 OFFSET ?5")?;
        let contacts: Vec<Value> = stmt.query_map(rusqlite::params![user_id, s, s, limit, offset], |r| {
            Ok(json!({"id":r.get::<_,String>(0)?,"name":r.get::<_,String>(1)?,"email":r.get::<_,String>(2)?,"phone":r.get::<_,Option<String>>(3)?,"notes":r.get::<_,Option<String>>(4)?,"created_at":r.get::<_,Option<String>>(5)?,"sent_count":r.get::<_,i64>(6)?,"received_count":r.get::<_,i64>(7)?}))
        })?.filter_map(|r| r.ok()).collect();
        Ok(Json(json!({"contacts": contacts, "total": total, "page": page, "limit": limit})))
    }
}

// GET /api/v1/contacts/:id
pub async fn get_contact(State(state): State<AppState>, headers: axum::http::HeaderMap, Query(q): Query<ApiKeyQuery>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let user_id = authenticate_api_key(&db, &get_api_key_from_req(&headers, &q))?;
    let contact: Value = db.query_row("SELECT * FROM contacts WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"name":r.get::<_,String>(2)?,"email":r.get::<_,String>(3)?,"phone":r.get::<_,Option<String>>(4)?,"notes":r.get::<_,Option<String>>(5)?}))
    }).map_err(|_| AppError::not_found("Contact not found"))?;
    Ok(Json(contact))
}

#[derive(Deserialize)]
pub struct ContactBody { pub name: Option<String>, pub email: Option<String>, pub phone: Option<String>, pub notes: Option<String> }

// POST /api/v1/contacts
pub async fn create_contact(State(state): State<AppState>, headers: axum::http::HeaderMap, Query(q): Query<ApiKeyQuery>, Json(body): Json<ContactBody>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let user_id = authenticate_api_key(&db, &get_api_key_from_req(&headers, &q))?;
    let name = body.name.as_deref().unwrap_or("");
    let email = body.email.as_deref().unwrap_or("");
    if name.is_empty() || email.is_empty() { return Err(AppError::bad_request("name and email are required")); }
    if find_contact_by_email(&db, email, &user_id).is_some() {
        return Err(AppError::conflict(format!("A contact with this email already exists")));
    }
    let id = Uuid::new_v4().to_string();
    db.execute("INSERT INTO contacts (id, user_id, name, email, phone, notes) VALUES (?1,?2,?3,?4,?5,?6)",
        rusqlite::params![id, user_id, name, email, body.phone.as_deref().unwrap_or(""), body.notes.as_deref().unwrap_or("")])?;
    Ok(Json(json!({"id": id, "name": name, "email": email, "phone": body.phone.as_deref().unwrap_or(""), "notes": body.notes.as_deref().unwrap_or("")})))
}

// PUT /api/v1/contacts/:id
pub async fn update_contact(State(state): State<AppState>, headers: axum::http::HeaderMap, Query(q): Query<ApiKeyQuery>, Path(id): Path<String>, Json(body): Json<ContactBody>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let user_id = authenticate_api_key(&db, &get_api_key_from_req(&headers, &q))?;
    let existing: (String, String, Option<String>, Option<String>) = db.query_row("SELECT name, email, phone, notes FROM contacts WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))).map_err(|_| AppError::not_found("Contact not found"))?;
    db.execute("UPDATE contacts SET name=?1, email=?2, phone=?3, notes=?4 WHERE id=?5",
        rusqlite::params![body.name.as_deref().unwrap_or(&existing.0), body.email.as_deref().unwrap_or(&existing.1), body.phone.as_deref().or(existing.2.as_deref()).unwrap_or(""), body.notes.as_deref().or(existing.3.as_deref()).unwrap_or(""), id])?;
    Ok(Json(json!({"success": true})))
}

// DELETE /api/v1/contacts/:id
pub async fn delete_contact(State(state): State<AppState>, headers: axum::http::HeaderMap, Query(q): Query<ApiKeyQuery>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let user_id = authenticate_api_key(&db, &get_api_key_from_req(&headers, &q))?;
    let _: String = db.query_row("SELECT id FROM contacts WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id], |r| r.get(0)).map_err(|_| AppError::not_found("Contact not found"))?;
    db.execute("DELETE FROM contacts WHERE id = ?1", rusqlite::params![id])?;
    Ok(Json(json!({"success": true})))
}

// POST /api/v1/send
#[derive(Deserialize)]
pub struct SendBody {
    pub to: Option<String>, pub subject: Option<String>, pub html: Option<String>,
    pub cc: Option<String>, pub bcc: Option<String>,
    pub template_id: Option<String>, pub variables: Option<serde_json::Map<String, Value>>,
}

pub async fn send_email(State(state): State<AppState>, headers: axum::http::HeaderMap, Query(q): Query<ApiKeyQuery>, Json(body): Json<SendBody>) -> Result<Json<Value>> {
    use lettre::{Message, SmtpTransport, Transport};
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::message::header::ContentType;

    let db = state.db.lock().unwrap();
    let user_id = authenticate_api_key(&db, &get_api_key_from_req(&headers, &q))?;

    let to = body.to.as_deref().unwrap_or("");
    let subject = body.subject.as_deref().unwrap_or("");
    if to.is_empty() || subject.is_empty() { return Err(AppError::bad_request("to and subject are required")); }

    let mut email_html = body.html.clone().unwrap_or_default();
    if let Some(ref tpl_id) = body.template_id {
        let tpl: (String,) = db.query_row("SELECT html FROM custom_templates WHERE id = ?1 AND user_id = ?2", rusqlite::params![tpl_id, user_id], |r| Ok((r.get(0)?,))).map_err(|_| AppError::not_found("Template not found"))?;
        email_html = tpl.0;
    }
    if let Some(ref vars) = body.variables {
        for (key, value) in vars {
            let pattern = format!("{{{{{}}}}}", key);
            email_html = email_html.replace(&pattern, value.as_str().unwrap_or(""));
        }
    }
    if email_html.is_empty() { return Err(AppError::bad_request("html body or template_id is required")); }

    let settings = get_user_settings(&db, &state.enc_key, &user_id);
    let smtp_host = settings.get("smtp_host").cloned().unwrap_or_default();
    let smtp_user = settings.get("smtp_user").cloned().unwrap_or_default();
    let smtp_pass = settings.get("smtp_pass").cloned().unwrap_or_default();
    let smtp_port: u16 = settings.get("smtp_port").and_then(|s| s.parse().ok()).unwrap_or(465);
    let from_name = settings.get("smtp_from_name").cloned().unwrap_or_else(|| smtp_user.clone());

    if smtp_user.is_empty() || smtp_host.is_empty() {
        return Err(AppError::bad_request("SMTP not configured for this user"));
    }

    let from_addr = format!("\"{}\" <{}>", from_name, smtp_user);
    let email = Message::builder()
        .from(from_addr.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?)
        .to(to.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?)
        .subject(subject)
        .header(ContentType::TEXT_HTML)
        .body(email_html.clone())
        .map_err(|e| AppError::internal(e.to_string()))?;

    let creds = Credentials::new(smtp_user, smtp_pass);
    let mailer = if smtp_port == 465 {
        SmtpTransport::relay(&smtp_host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(smtp_port).build()
    } else {
        SmtpTransport::starttls_relay(&smtp_host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(smtp_port).build()
    };

    let response = mailer.send(&email).map_err(|e| AppError::internal(e.to_string()))?;
    let mid = response.message().collect::<Vec<_>>().join("");
    let contact_id = find_contact_by_email(&db, to, &user_id);
    log_email(&db, &user_id, contact_id.as_deref(), to, subject, &email_html, &mid);

    Ok(Json(json!({"success": true, "messageId": mid})))
}
