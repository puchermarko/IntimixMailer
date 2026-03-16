use axum::{extract::{Path, Query, State}, Extension, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::helpers::{detect_oauth_provider, find_contact_by_email, get_oauth_tokens, get_user_settings, get_valid_access_token, save_oauth_tokens};
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

// IMAP sync endpoint - full inbox sync
pub async fn sync_inbox(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {

    let user_id = auth.effective_user_id.clone();

    // Get IMAP settings and OAuth tokens (drop db lock before async work)
    let (imap_host, imap_port, imap_user, imap_pass, provider, oauth_tokens) = {
        let db = state.db.lock().unwrap();
        let settings = get_user_settings(&db, &state.enc_key, &user_id);
        let host = settings.get("imap_host").cloned().unwrap_or_default();
        let port: u16 = settings.get("imap_port").and_then(|s| s.parse().ok()).unwrap_or(993);
        let user = settings.get("imap_user").cloned().unwrap_or_default();
        let pass = settings.get("imap_pass").cloned().unwrap_or_default();
        if host.is_empty() || user.is_empty() {
            return Err(AppError::bad_request("IMAP nincs konfigurálva. Állítsd be a Beállításoknál."));
        }
        let provider = detect_oauth_provider(&host).map(|s| s.to_string());
        let oauth_tokens = provider.as_deref().and_then(|prov| get_oauth_tokens(&db, &state.enc_key, &user_id, prov));
        (host, port, user, pass, provider, oauth_tokens)
    }; // db lock dropped here

    // Get valid OAuth2 access token if needed (async, no db lock held)
    let final_access_token = if let Some(ref tokens) = oauth_tokens {
        let prov = provider.as_deref().unwrap_or("");
        match get_valid_access_token(tokens, &state.config, prov).await {
            Ok((access_token, save_data)) => {
                // Save refreshed tokens if needed
                if let Some(data) = save_data {
                    let db = state.db.lock().unwrap();
                    save_oauth_tokens(&db, &state.enc_key, &user_id, prov, &data);
                }
                Some(access_token)
            }
            Err(e) => {
                tracing::warn!("OAuth2 IMAP token refresh failed, falling back to password: {}", e);
                None
            }
        }
    } else { None };

    // Determine actual connection params
    let (connect_host, connect_port, auth_user, auth_method) = if final_access_token.is_some() {
        let prov = provider.as_deref().unwrap_or("");
        let h = if prov == "google" { "imap.gmail.com".to_string() } else { "outlook.office365.com".to_string() };
        let email = oauth_tokens.as_ref().map(|t| t.email.clone()).unwrap_or(imap_user.clone());
        (h, 993u16, email, "oauth2".to_string())
    } else {
        if imap_pass.is_empty() {
            return Err(AppError::bad_request("IMAP nincs konfigurálva. Állítsd be a Beállításoknál."));
        }
        (imap_host.clone(), imap_port, imap_user.clone(), "password".to_string())
    };

    // Connect to IMAP server via TLS
    let tcp_stream = tokio::net::TcpStream::connect((connect_host.as_str(), connect_port))
        .await.map_err(|e| AppError::internal(format!("IMAP TCP connection failed: {}", e)))?;
    let native_tls_connector = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .build().map_err(|e| AppError::internal(format!("TLS builder error: {}", e)))?;
    let tls_connector = tokio_native_tls::TlsConnector::from(native_tls_connector);
    let tls_stream = tls_connector.connect(&connect_host, tcp_stream)
        .await.map_err(|e| AppError::internal(format!("IMAP TLS connection failed: {}", e)))?;
    let client = async_imap::Client::new(tls_stream);

    // Authenticate
    let mut session = if auth_method == "oauth2" {
        let token = final_access_token.as_deref().unwrap_or("");
        let auth_string = format!("user={}\x01auth=Bearer {}\x01\x01", auth_user, token);
        let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth_string.as_bytes());
        client.authenticate("XOAUTH2", XOAuth2Authenticator(encoded))
            .await
            .map_err(|(e, _)| AppError::internal(format!("IMAP OAuth2 auth failed: {}", e)))?
    } else {
        client.login(&auth_user, &imap_pass)
            .await
            .map_err(|(e, _)| AppError::internal(format!("IMAP login failed: {}", e)))?
    };

    // Select INBOX
    session.select("INBOX").await
        .map_err(|e| AppError::internal(format!("Could not select INBOX: {}", e)))?;

    // Get max UID we already have
    let max_uid: u32 = {
        let db = state.db.lock().unwrap();
        db.query_row("SELECT COALESCE(MAX(uid), 0) FROM inbox WHERE user_id = ?1", rusqlite::params![user_id], |r| r.get::<_, i64>(0))
            .unwrap_or(0) as u32
    };

    // Fetch new messages
    let fetch_range = if max_uid > 0 {
        format!("{}:*", max_uid + 1)
    } else {
        "1:*".to_string()
    };

    use futures::TryStreamExt;
    let messages: Vec<_> = session.uid_fetch(&fetch_range, "(UID FLAGS BODY.PEEK[] ENVELOPE)").await
        .map_err(|e| AppError::internal(format!("IMAP fetch failed: {}", e)))?
        .try_collect().await
        .map_err(|e| AppError::internal(format!("IMAP fetch stream error: {}", e)))?;

    let mut new_count = 0i64;
    let uploads_dir = std::path::Path::new("uploads");
    std::fs::create_dir_all(uploads_dir).ok();

    for msg in &messages {
        let uid = msg.uid.unwrap_or(0);
        if uid == 0 { continue; }

        // Check if we already have this UID
        let exists = {
            let db = state.db.lock().unwrap();
            db.query_row("SELECT id FROM inbox WHERE uid = ?1 AND user_id = ?2",
                rusqlite::params![uid as i64, user_id], |r| r.get::<_, String>(0)).is_ok()
        };
        if exists { continue; }

        // Parse email body
        let body = msg.body().unwrap_or(b"");
        let parsed = match mailparse::parse_mail(body) {
            Ok(p) => p,
            Err(_) => continue,
        };

        let from_addr = extract_from_address(&parsed).unwrap_or_default();
        let from_name = extract_from_name(&parsed).unwrap_or_default();
        let to_addr = extract_to_addresses(&parsed).unwrap_or_default();
        let subject = parsed.headers.iter()
            .find(|h| h.get_key().eq_ignore_ascii_case("subject"))
            .map(|h| h.get_value()).unwrap_or_else(|| "(No subject)".into());
        let text_body = extract_text_body(&parsed);
        let html_body = extract_html_body(&parsed);
        let date = parsed.headers.iter()
            .find(|h| h.get_key().eq_ignore_ascii_case("date"))
            .map(|h| h.get_value())
            .and_then(|d| mailparse::dateparse(&d).ok())
            .map(|ts| chrono::DateTime::from_timestamp(ts, 0).unwrap_or_default().to_rfc3339())
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
        let message_id = parsed.headers.iter()
            .find(|h| h.get_key().eq_ignore_ascii_case("message-id"))
            .map(|h| h.get_value()).unwrap_or_default();
        let flags = msg.flags().map(|f| format!("{:?}", f)).collect::<Vec<_>>().join(",");

        // Extract attachments
        let attachments = extract_attachments(&parsed);
        let has_attachments = if attachments.is_empty() { 0 } else { 1 };

        // Link to contact
        let db = state.db.lock().unwrap();
        let contact_id = find_contact_by_email(&db, &from_addr, &user_id);

        let inbox_id = Uuid::new_v4().to_string();
        db.execute(
            "INSERT INTO inbox (id, user_id, uid, message_id, from_address, from_name, to_address, subject, text_body, html_body, date, flags, contact_id, has_attachments) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
            rusqlite::params![inbox_id, user_id, uid as i64, message_id, from_addr, from_name, to_addr, subject, text_body, html_body, date, flags, contact_id, has_attachments],
        ).ok();

        // Store attachments
        for (filename, mimetype, content) in &attachments {
            let att_id = Uuid::new_v4().to_string();
            let ext = std::path::Path::new(filename).extension().and_then(|e| e.to_str()).unwrap_or("");
            let stored_name = format!("inbox_{}.{}", att_id, ext);
            let stored_path = uploads_dir.join(&stored_name);
            std::fs::write(&stored_path, content).ok();
            db.execute(
                "INSERT INTO inbox_attachments (id, inbox_id, filename, mimetype, size, stored_path) VALUES (?1,?2,?3,?4,?5,?6)",
                rusqlite::params![att_id, inbox_id, filename, mimetype, content.len() as i64, stored_name],
            ).ok();
        }

        new_count += 1;
    }

    // Retroactively link unlinked inbox emails to contacts
    let linked = {
        let db = state.db.lock().unwrap();
        let mut linked = 0i64;
        let unlinked: Vec<(String, String)> = db.prepare("SELECT id, from_address FROM inbox WHERE contact_id IS NULL AND user_id = ?1")
            .unwrap().query_map(rusqlite::params![user_id], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap().filter_map(|r| r.ok()).collect();
        for (id, from) in &unlinked {
            if let Some(cid) = find_contact_by_email(&db, from, &user_id) {
                db.execute("UPDATE inbox SET contact_id = ?1 WHERE id = ?2", rusqlite::params![cid, id]).ok();
                linked += 1;
            }
        }
        // Also link unlinked sent emails
        let unlinked_sent: Vec<(String, String)> = db.prepare("SELECT id, recipient_email FROM email_log WHERE contact_id IS NULL AND user_id = ?1")
            .unwrap().query_map(rusqlite::params![user_id], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap().filter_map(|r| r.ok()).collect();
        for (id, email) in &unlinked_sent {
            if let Some(cid) = find_contact_by_email(&db, email, &user_id) {
                db.execute("UPDATE email_log SET contact_id = ?1 WHERE id = ?2", rusqlite::params![cid, id]).ok();
                db.execute("UPDATE attachments SET contact_id = ?1 WHERE email_log_id = ?2 AND contact_id IS NULL", rusqlite::params![cid, id]).ok();
                linked += 1;
            }
        }
        linked
    };

    // Logout
    session.logout().await.ok();

    Ok(Json(json!({"success": true, "newEmails": new_count, "linked": linked})))
}

// XOAUTH2 authenticator for async-imap
pub(crate) struct XOAuth2Authenticator(pub String);

impl async_imap::Authenticator for XOAuth2Authenticator {
    type Response = String;
    fn process(&mut self, _data: &[u8]) -> Self::Response {
        self.0.clone()
    }
}

// Email parsing helpers
pub(crate) fn extract_from_address(mail: &mailparse::ParsedMail) -> Option<String> {
    mail.headers.iter()
        .find(|h| h.get_key().eq_ignore_ascii_case("from"))
        .map(|h| {
            let v = h.get_value();
            // Extract email from "Name <email>" format
            if let Some(start) = v.find('<') {
                if let Some(end) = v.find('>') {
                    return v[start+1..end].to_string();
                }
            }
            v.trim().to_string()
        })
}

pub(crate) fn extract_from_name(mail: &mailparse::ParsedMail) -> Option<String> {
    mail.headers.iter()
        .find(|h| h.get_key().eq_ignore_ascii_case("from"))
        .map(|h| {
            let v = h.get_value();
            if let Some(start) = v.find('<') {
                let name = v[..start].trim().trim_matches('"').to_string();
                if !name.is_empty() { return name; }
            }
            String::new()
        })
}

pub(crate) fn extract_to_addresses(mail: &mailparse::ParsedMail) -> Option<String> {
    mail.headers.iter()
        .find(|h| h.get_key().eq_ignore_ascii_case("to"))
        .map(|h| {
            let v = h.get_value();
            // Extract addresses from comma-separated "Name <email>" format
            v.split(',').map(|part| {
                let part = part.trim();
                if let Some(start) = part.find('<') {
                    if let Some(end) = part.find('>') {
                        return part[start+1..end].to_string();
                    }
                }
                part.to_string()
            }).collect::<Vec<_>>().join(", ")
        })
}

pub(crate) fn extract_text_body(mail: &mailparse::ParsedMail) -> String {
    if mail.subparts.is_empty() {
        let ct = mail.ctype.mimetype.to_lowercase();
        if ct.starts_with("text/plain") {
            return mail.get_body().unwrap_or_default();
        }
        return String::new();
    }
    for part in &mail.subparts {
        let result = extract_text_body(part);
        if !result.is_empty() { return result; }
    }
    String::new()
}

pub(crate) fn extract_html_body(mail: &mailparse::ParsedMail) -> String {
    if mail.subparts.is_empty() {
        let ct = mail.ctype.mimetype.to_lowercase();
        if ct.starts_with("text/html") {
            return mail.get_body().unwrap_or_default();
        }
        return String::new();
    }
    for part in &mail.subparts {
        let result = extract_html_body(part);
        if !result.is_empty() { return result; }
    }
    String::new()
}

pub(crate) fn extract_attachments(mail: &mailparse::ParsedMail) -> Vec<(String, String, Vec<u8>)> {
    let mut results = Vec::new();
    extract_attachments_recursive(mail, &mut results);
    results
}

pub(crate) fn extract_attachments_recursive(mail: &mailparse::ParsedMail, out: &mut Vec<(String, String, Vec<u8>)>) {
    let ct = &mail.ctype;
    let is_attachment = mail.headers.iter().any(|h| {
        h.get_key().eq_ignore_ascii_case("content-disposition") && h.get_value().to_lowercase().contains("attachment")
    });

    if is_attachment || (ct.mimetype != "text/plain" && ct.mimetype != "text/html"
        && !ct.mimetype.starts_with("multipart/") && !ct.mimetype.starts_with("message/"))
    {
        if let Ok(body) = mail.get_body_raw() {
            if !body.is_empty() {
                let filename = ct.params.get("name").cloned()
                    .or_else(|| {
                        mail.headers.iter()
                            .find(|h| h.get_key().eq_ignore_ascii_case("content-disposition"))
                            .and_then(|h| {
                                let v = h.get_value();
                                v.split(';').find_map(|p| {
                                    let p = p.trim();
                                    if p.to_lowercase().starts_with("filename=") {
                                        Some(p[9..].trim_matches('"').to_string())
                                    } else { None }
                                })
                            })
                    })
                    .unwrap_or_else(|| "attachment".to_string());
                out.push((filename, ct.mimetype.clone(), body));
            }
        }
    }

    for sub in &mail.subparts {
        extract_attachments_recursive(sub, out);
    }
}
