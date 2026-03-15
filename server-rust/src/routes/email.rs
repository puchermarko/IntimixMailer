use axum::{extract::{Multipart, Path, Query, State}, Extension, Json};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppError, Result};
use crate::helpers::{find_contact_by_email, get_user_settings, log_email};
use crate::middleware::auth::{get_user_id_from_token, AuthUser};
use crate::state::AppState;

pub async fn send_email(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthUser>,
    mut multipart: Multipart,
) -> Result<Json<Value>> {
    use lettre::{Message, SmtpTransport, Transport};
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::message::{header::ContentType, Attachment, MultiPart, SinglePart};

    let mut to = String::new();
    let mut subject = String::new();
    let mut html = String::new();
    let mut cc = String::new();
    let mut bcc = String::new();
    let mut in_reply_to = String::new();
    let mut file_attachments: Vec<(String, Vec<u8>, String)> = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::bad_request(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "to" => to = field.text().await.unwrap_or_default(),
            "subject" => subject = field.text().await.unwrap_or_default(),
            "html" => html = field.text().await.unwrap_or_default(),
            "cc" => cc = field.text().await.unwrap_or_default(),
            "bcc" => bcc = field.text().await.unwrap_or_default(),
            "inReplyTo" => in_reply_to = field.text().await.unwrap_or_default(),
            "attachments" => {
                let filename = field.file_name().unwrap_or("attachment").to_string();
                let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
                let data = field.bytes().await.map_err(|e| AppError::bad_request(e.to_string()))?;
                file_attachments.push((filename, data.to_vec(), content_type));
            }
            _ => {}
        }
    }

    if to.is_empty() || subject.is_empty() || html.is_empty() {
        return Err(AppError::bad_request("Missing required fields: to, subject, html"));
    }

    let db = state.db.lock().unwrap();
    let settings = get_user_settings(&db, &state.enc_key, &auth.effective_user_id);
    let smtp_user = settings.get("smtp_user").cloned().unwrap_or_default();
    let from_name = settings.get("smtp_from_name").cloned().unwrap_or_else(|| smtp_user.clone());

    if smtp_user.is_empty() {
        return Err(AppError::bad_request("SMTP nincs konfigurálva. Állítsd be a Beállításoknál."));
    }

    let smtp_host = settings.get("smtp_host").cloned().unwrap_or_default();
    let smtp_port: u16 = settings.get("smtp_port").and_then(|s| s.parse().ok()).unwrap_or(465);
    let smtp_pass = settings.get("smtp_pass").cloned().unwrap_or_default();

    let from_addr = format!("\"{}\" <{}>", from_name, smtp_user);
    let mut email_builder = Message::builder()
        .from(from_addr.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?)
        .to(to.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?)
        .subject(&subject);

    if !cc.is_empty() { email_builder = email_builder.cc(cc.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?); }
    if !bcc.is_empty() { email_builder = email_builder.bcc(bcc.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?); }
    if !in_reply_to.is_empty() { email_builder = email_builder.in_reply_to(in_reply_to.clone()); }

    let email = if file_attachments.is_empty() {
        email_builder
            .header(ContentType::TEXT_HTML)
            .body(html.clone())
            .map_err(|e| AppError::internal(e.to_string()))?
    } else {
        let html_part = SinglePart::builder().header(ContentType::TEXT_HTML).body(html.clone());
        let mut mp = MultiPart::mixed().singlepart(html_part);
        for (filename, data, content_type) in &file_attachments {
            let ct: ContentType = ContentType::parse(content_type).unwrap_or(ContentType::TEXT_PLAIN);
            let attachment = Attachment::new(filename.clone()).body(data.clone(), ct);
            mp = mp.singlepart(attachment);
        }
        email_builder.multipart(mp).map_err(|e| AppError::internal(e.to_string()))?
    };

    let creds = Credentials::new(smtp_user.clone(), smtp_pass);
    let mailer = if smtp_port == 465 {
        SmtpTransport::relay(&smtp_host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(smtp_port).build()
    } else {
        SmtpTransport::starttls_relay(&smtp_host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(smtp_port).build()
    };

    let response = mailer.send(&email).map_err(|e| AppError::internal(e.to_string()))?;
    let message_id = response.message().collect::<Vec<_>>().join("");

    // Log email
    let contact_id = find_contact_by_email(&db, &to, &auth.effective_user_id);
    log_email(&db, &auth.effective_user_id, contact_id.as_deref(), &to, &subject, &html, &message_id);

    // Save attachment files
    if !file_attachments.is_empty() {
        let uploads_dir = std::path::PathBuf::from("uploads");
        std::fs::create_dir_all(&uploads_dir).ok();
        for (filename, data, _mimetype) in &file_attachments {
            let att_id = uuid::Uuid::new_v4().to_string();
            let ext = std::path::Path::new(filename).extension().and_then(|e| e.to_str()).unwrap_or("");
            let stored_name = format!("{}.{}", att_id, ext);
            let stored_path = uploads_dir.join(&stored_name);
            std::fs::write(&stored_path, data).ok();
        }
    }

    Ok(Json(json!({"success": true, "messageId": message_id})))
}

pub async fn send_bulk(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthUser>,
    mut multipart: Multipart,
) -> Result<Json<Value>> {
    use lettre::{Message, SmtpTransport, Transport};
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::message::header::ContentType;

    let mut recipients_raw = String::new();
    let mut subject = String::new();
    let mut html = String::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::bad_request(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "recipients" => recipients_raw = field.text().await.unwrap_or_default(),
            "subject" => subject = field.text().await.unwrap_or_default(),
            "html" => html = field.text().await.unwrap_or_default(),
            _ => {}
        }
    }

    let recipients: Vec<Value> = serde_json::from_str(&recipients_raw).map_err(|_| AppError::bad_request("Invalid recipients JSON"))?;
    if recipients.is_empty() || subject.is_empty() || html.is_empty() {
        return Err(AppError::bad_request("Missing required fields"));
    }

    let db = state.db.lock().unwrap();
    let settings = get_user_settings(&db, &state.enc_key, &auth.effective_user_id);
    let smtp_host = settings.get("smtp_host").cloned().unwrap_or_default();
    let smtp_user = settings.get("smtp_user").cloned().unwrap_or_default();
    let smtp_pass = settings.get("smtp_pass").cloned().unwrap_or_default();
    let smtp_port: u16 = settings.get("smtp_port").and_then(|s| s.parse().ok()).unwrap_or(465);
    let from_name = settings.get("smtp_from_name").cloned().unwrap_or_else(|| smtp_user.clone());

    if smtp_user.is_empty() || smtp_host.is_empty() {
        return Err(AppError::bad_request("SMTP nincs konfigurálva."));
    }

    let creds = Credentials::new(smtp_user.clone(), smtp_pass);
    let mailer = if smtp_port == 465 {
        SmtpTransport::relay(&smtp_host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(smtp_port).build()
    } else {
        SmtpTransport::starttls_relay(&smtp_host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(smtp_port).build()
    };

    let mut results = Vec::new();
    for recipient in &recipients {
        let email_addr = recipient["email"].as_str().unwrap_or("");
        let name = recipient["name"].as_str().unwrap_or("");
        if email_addr.is_empty() { continue; }

        let personalized_html = html
            .replace("{{name}}", name)
            .replace("{{email}}", email_addr);
        let personalized_subject = subject.replace("{{name}}", name);
        let from_addr = format!("\"{}\" <{}>", from_name, smtp_user);

        match Message::builder()
            .from(from_addr.parse().unwrap())
            .to(email_addr.parse().unwrap())
            .subject(&personalized_subject)
            .header(ContentType::TEXT_HTML)
            .body(personalized_html.clone())
        {
            Ok(msg) => match mailer.send(&msg) {
                Ok(response) => {
                    let mid = response.message().collect::<Vec<_>>().join("");
                    let cid = find_contact_by_email(&db, email_addr, &auth.effective_user_id);
                    log_email(&db, &auth.effective_user_id, cid.as_deref(), email_addr, &personalized_subject, &personalized_html, &mid);
                    results.push(json!({"email": email_addr, "status": "sent"}));
                }
                Err(e) => results.push(json!({"email": email_addr, "status": "failed", "error": e.to_string()})),
            },
            Err(e) => results.push(json!({"email": email_addr, "status": "failed", "error": e.to_string()})),
        }
    }

    Ok(Json(json!({"success": true, "results": results})))
}

pub async fn get_email_detail(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let email: Value = db.query_row(
        "SELECT id, user_id, contact_id, recipient_email, subject, html, sent_at, message_id, status FROM email_log WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![id, auth.effective_user_id],
        |r| Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"contact_id":r.get::<_,Option<String>>(2)?,"recipient_email":r.get::<_,String>(3)?,"subject":r.get::<_,String>(4)?,"html":r.get::<_,String>(5)?,"sent_at":r.get::<_,Option<String>>(6)?,"message_id":r.get::<_,Option<String>>(7)?,"status":r.get::<_,Option<String>>(8)?})),
    ).map_err(|_| AppError::not_found("Email not found"))?;
    let atts: Vec<Value> = db.prepare("SELECT id, filename, mimetype, size, uploaded_at FROM attachments WHERE email_log_id = ?1")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"filename":r.get::<_,String>(1)?,"mimetype":r.get::<_,String>(2)?,"size":r.get::<_,i64>(3)?,"uploaded_at":r.get::<_,Option<String>>(4)?})))?.filter_map(|r| r.ok()).collect();
    let mut result = email.as_object().unwrap().clone();
    result.insert("attachments".into(), Value::Array(atts));
    Ok(Json(Value::Object(result)))
}

#[derive(Deserialize)]
pub struct TokenQuery { pub token: Option<String> }

pub async fn download_attachment(State(state): State<AppState>, Path(id): Path<String>, Query(q): Query<TokenQuery>) -> Result<axum::response::Response> {
    use axum::response::IntoResponse;
    let token = q.token.as_deref().unwrap_or("");
    let user_id = get_user_id_from_token(token, &state.config.jwt_secret).ok_or_else(|| AppError::unauthorized("Unauthorized"))?;
    let db = state.db.lock().unwrap();
    let (filename, mimetype, stored_path): (String, String, String) = db.query_row(
        "SELECT a.filename, a.mimetype, a.stored_path FROM attachments a JOIN email_log e ON a.email_log_id = e.id WHERE a.id = ?1 AND e.user_id = ?2",
        rusqlite::params![id, user_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|_| AppError::not_found("Attachment not found"))?;
    let fp = std::path::Path::new("uploads").join(&stored_path);
    if !fp.exists() { return Err(AppError::not_found("File not found on disk")); }
    let data = std::fs::read(&fp)?;
    Ok((
        [(axum::http::header::CONTENT_TYPE, mimetype), (axum::http::header::CONTENT_DISPOSITION, format!("inline; filename=\"{}\"", filename))],
        data,
    ).into_response())
}
