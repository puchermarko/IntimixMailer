use axum::{extract::{Path, State}, Extension, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::helpers::find_contact_by_email;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

pub async fn list_contacts(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare(
        "SELECT c.*, \
         (SELECT COUNT(*) FROM email_log WHERE contact_id = c.id) + (SELECT COUNT(*) FROM sent_imap WHERE contact_id = c.id) as email_count, \
         (SELECT COUNT(*) FROM inbox WHERE contact_id = c.id) as received_count, \
         (SELECT COUNT(*) FROM attachments WHERE contact_id = c.id) \
           + (SELECT COUNT(*) FROM inbox_attachments ia JOIN inbox i ON ia.inbox_id = i.id WHERE i.contact_id = c.id) \
           + (SELECT COUNT(*) FROM sent_imap_attachments sa JOIN sent_imap s ON sa.sent_id = s.id WHERE s.contact_id = c.id) as attachment_count \
         FROM contacts c WHERE c.user_id = ?1 ORDER BY c.name ASC"
    )?;
    let contacts: Vec<Value> = stmt.query_map(rusqlite::params![auth.effective_user_id], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "user_id": row.get::<_, String>(1)?,
            "name": row.get::<_, String>(2)?,
            "email": row.get::<_, String>(3)?,
            "phone": row.get::<_, Option<String>>(4)?,
            "notes": row.get::<_, Option<String>>(5)?,
            "company": row.get::<_, Option<String>>(6)?,
            "vat_id": row.get::<_, Option<String>>(7)?,
            "street": row.get::<_, Option<String>>(8)?,
            "street_number": row.get::<_, Option<String>>(9)?,
            "city": row.get::<_, Option<String>>(10)?,
            "zip": row.get::<_, Option<String>>(11)?,
            "country": row.get::<_, Option<String>>(12)?,
            "region": row.get::<_, Option<String>>(13)?,
            "created_at": row.get::<_, Option<String>>(14)?,
            "updated_at": row.get::<_, Option<String>>(15)?,
            "email_count": row.get::<_, i32>(16)?,
            "received_count": row.get::<_, i32>(17)?,
            "attachment_count": row.get::<_, i32>(18)?,
        }))
    })?.filter_map(|r| r.ok()).collect();
    Ok(Json(Value::Array(contacts)))
}

pub async fn get_contact(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let contact: Value = db.query_row(
        "SELECT * FROM contacts WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![id, auth.effective_user_id],
        |row| Ok(json!({
            "id": row.get::<_, String>(0)?, "user_id": row.get::<_, String>(1)?,
            "name": row.get::<_, String>(2)?, "email": row.get::<_, String>(3)?,
            "phone": row.get::<_, Option<String>>(4)?, "notes": row.get::<_, Option<String>>(5)?,
            "company": row.get::<_, Option<String>>(6)?, "vat_id": row.get::<_, Option<String>>(7)?,
            "street": row.get::<_, Option<String>>(8)?, "street_number": row.get::<_, Option<String>>(9)?,
            "city": row.get::<_, Option<String>>(10)?, "zip": row.get::<_, Option<String>>(11)?,
            "country": row.get::<_, Option<String>>(12)?, "region": row.get::<_, Option<String>>(13)?,
            "created_at": row.get::<_, Option<String>>(14)?, "updated_at": row.get::<_, Option<String>>(15)?,
        })),
    ).map_err(|_| AppError::not_found("Contact not found"))?;

    let emails: Vec<Value> = db.prepare("SELECT id, subject, sent_at, message_id, status FROM email_log WHERE contact_id = ?1 ORDER BY sent_at DESC")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"subject":r.get::<_,String>(1)?,"sent_at":r.get::<_,Option<String>>(2)?,"message_id":r.get::<_,Option<String>>(3)?,"status":r.get::<_,Option<String>>(4)?})))?.filter_map(|r| r.ok()).collect();

    let attachments: Vec<Value> = db.prepare("SELECT a.id, a.filename, a.mimetype, a.size, a.uploaded_at, a.email_log_id, e.subject as email_subject FROM attachments a LEFT JOIN email_log e ON a.email_log_id = e.id WHERE a.contact_id = ?1 ORDER BY a.uploaded_at DESC")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"filename":r.get::<_,String>(1)?,"mimetype":r.get::<_,String>(2)?,"size":r.get::<_,i64>(3)?,"uploaded_at":r.get::<_,Option<String>>(4)?,"email_log_id":r.get::<_,Option<String>>(5)?,"email_subject":r.get::<_,Option<String>>(6)?,"source":"local"})))?.filter_map(|r| r.ok()).collect();

    let received: Vec<Value> = db.prepare("SELECT id, subject, from_address, from_name, date, has_attachments FROM inbox WHERE contact_id = ?1 ORDER BY date DESC")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"subject":r.get::<_,Option<String>>(1)?,"from_address":r.get::<_,String>(2)?,"from_name":r.get::<_,Option<String>>(3)?,"date":r.get::<_,Option<String>>(4)?,"has_attachments":r.get::<_,i32>(5)?})))?.filter_map(|r| r.ok()).collect();

    let sent_imap: Vec<Value> = db.prepare("SELECT id, subject, to_address, from_name, date, has_attachments FROM sent_imap WHERE contact_id = ?1 ORDER BY date DESC")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"subject":r.get::<_,Option<String>>(1)?,"to_address":r.get::<_,Option<String>>(2)?,"from_name":r.get::<_,Option<String>>(3)?,"date":r.get::<_,Option<String>>(4)?,"has_attachments":r.get::<_,i32>(5)?})))?.filter_map(|r| r.ok()).collect();

    let quotes: Vec<Value> = db.prepare("SELECT id, quote_number, contact_name, contact_email, currency, total, status, valid_until, created_at FROM quotes WHERE contact_email = ?1 AND user_id = ?2 ORDER BY created_at DESC")?
        .query_map(rusqlite::params![contact["email"].as_str().unwrap_or(""), auth.effective_user_id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"quote_number":r.get::<_,String>(1)?,"contact_name":r.get::<_,Option<String>>(2)?,"contact_email":r.get::<_,Option<String>>(3)?,"currency":r.get::<_,Option<String>>(4)?,"total":r.get::<_,f64>(5)?,"status":r.get::<_,Option<String>>(6)?,"valid_until":r.get::<_,Option<String>>(7)?,"created_at":r.get::<_,Option<String>>(8)?})))?.filter_map(|r| r.ok()).collect();

    let mut result = contact.as_object().unwrap().clone();
    result.insert("emails".into(), Value::Array(emails));
    result.insert("attachments".into(), Value::Array(attachments));
    result.insert("received".into(), Value::Array(received));
    result.insert("sentImap".into(), Value::Array(sent_imap));
    result.insert("quotes".into(), Value::Array(quotes));
    Ok(Json(Value::Object(result)))
}

#[derive(Deserialize)]
pub struct ContactBody {
    pub name: Option<String>, pub email: Option<String>, pub phone: Option<String>,
    pub notes: Option<String>, pub company: Option<String>, pub vat_id: Option<String>,
    pub street: Option<String>, pub street_number: Option<String>, pub city: Option<String>,
    pub zip: Option<String>, pub country: Option<String>, pub region: Option<String>,
}

pub async fn create_contact(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<ContactBody>) -> Result<Json<Value>> {
    let name = body.name.as_deref().unwrap_or("");
    let email = body.email.as_deref().unwrap_or("");
    if name.is_empty() || email.is_empty() { return Err(AppError::bad_request("Name and email are required")); }
    let db = state.db.lock().unwrap();
    if find_contact_by_email(&db, email, &auth.effective_user_id).is_some() {
        return Err(AppError::conflict("A contact with this email already exists"));
    }
    let id = Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO contacts (id, user_id, name, email, phone, notes, company, vat_id, street, street_number, city, zip, country, region) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        rusqlite::params![id, auth.effective_user_id, name, email, body.phone.as_deref().unwrap_or(""), body.notes.as_deref().unwrap_or(""),
            body.company.as_deref().unwrap_or(""), body.vat_id.as_deref().unwrap_or(""), body.street.as_deref().unwrap_or(""),
            body.street_number.as_deref().unwrap_or(""), body.city.as_deref().unwrap_or(""), body.zip.as_deref().unwrap_or(""),
            body.country.as_deref().unwrap_or(""), body.region.as_deref().unwrap_or("")],
    )?;
    let contact = db.query_row("SELECT * FROM contacts WHERE id = ?1", rusqlite::params![id], |row| {
        Ok(json!({"id":row.get::<_,String>(0)?,"user_id":row.get::<_,String>(1)?,"name":row.get::<_,String>(2)?,"email":row.get::<_,String>(3)?,"phone":row.get::<_,Option<String>>(4)?,"notes":row.get::<_,Option<String>>(5)?,"company":row.get::<_,Option<String>>(6)?,"vat_id":row.get::<_,Option<String>>(7)?,"street":row.get::<_,Option<String>>(8)?,"street_number":row.get::<_,Option<String>>(9)?,"city":row.get::<_,Option<String>>(10)?,"zip":row.get::<_,Option<String>>(11)?,"country":row.get::<_,Option<String>>(12)?,"region":row.get::<_,Option<String>>(13)?,"created_at":row.get::<_,Option<String>>(14)?,"updated_at":row.get::<_,Option<String>>(15)?}))
    })?;
    Ok(Json(contact))
}

pub async fn update_contact(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>, Json(body): Json<ContactBody>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let existing: (String, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>) = db.query_row(
        "SELECT name, email, phone, notes, company, vat_id, street, street_number, city, zip, country, region FROM contacts WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![id, auth.effective_user_id],
        |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?,r.get(7)?,r.get(8)?,r.get(9)?,r.get(10)?,r.get(11)?)),
    ).map_err(|_| AppError::not_found("Contact not found"))?;

    if let Some(ref new_email) = body.email {
        if new_email != &existing.1 {
            let dup: Option<String> = db.query_row("SELECT id FROM contacts WHERE email = ?1 AND id != ?2 AND user_id = ?3", rusqlite::params![new_email, id, auth.effective_user_id], |r| r.get(0)).ok();
            if dup.is_some() { return Err(AppError::conflict("Another contact with this email already exists")); }
        }
    }

    db.execute(
        "UPDATE contacts SET name=?1, email=?2, phone=?3, notes=?4, company=?5, vat_id=?6, street=?7, street_number=?8, city=?9, zip=?10, country=?11, region=?12, updated_at=datetime('now') WHERE id=?13",
        rusqlite::params![
            body.name.as_deref().unwrap_or(&existing.0), body.email.as_deref().unwrap_or(&existing.1),
            body.phone.as_deref().or(existing.2.as_deref()).unwrap_or(""), body.notes.as_deref().or(existing.3.as_deref()).unwrap_or(""),
            body.company.as_deref().or(existing.4.as_deref()).unwrap_or(""), body.vat_id.as_deref().or(existing.5.as_deref()).unwrap_or(""),
            body.street.as_deref().or(existing.6.as_deref()).unwrap_or(""), body.street_number.as_deref().or(existing.7.as_deref()).unwrap_or(""),
            body.city.as_deref().or(existing.8.as_deref()).unwrap_or(""), body.zip.as_deref().or(existing.9.as_deref()).unwrap_or(""),
            body.country.as_deref().or(existing.10.as_deref()).unwrap_or(""), body.region.as_deref().or(existing.11.as_deref()).unwrap_or(""),
            id
        ],
    )?;
    let contact = db.query_row("SELECT * FROM contacts WHERE id = ?1", rusqlite::params![id], |row| {
        Ok(json!({"id":row.get::<_,String>(0)?,"user_id":row.get::<_,String>(1)?,"name":row.get::<_,String>(2)?,"email":row.get::<_,String>(3)?,"phone":row.get::<_,Option<String>>(4)?,"notes":row.get::<_,Option<String>>(5)?,"company":row.get::<_,Option<String>>(6)?,"vat_id":row.get::<_,Option<String>>(7)?,"street":row.get::<_,Option<String>>(8)?,"street_number":row.get::<_,Option<String>>(9)?,"city":row.get::<_,Option<String>>(10)?,"zip":row.get::<_,Option<String>>(11)?,"country":row.get::<_,Option<String>>(12)?,"region":row.get::<_,Option<String>>(13)?,"created_at":row.get::<_,Option<String>>(14)?,"updated_at":row.get::<_,Option<String>>(15)?}))
    })?;
    Ok(Json(contact))
}

pub async fn delete_contact(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM contacts WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| r.get(0)).map_err(|_| AppError::not_found("Contact not found"))?;
    // Delete stored attachment files
    let uploads_dir = std::path::Path::new("uploads");
    let mut stmt = db.prepare("SELECT stored_path FROM attachments WHERE contact_id = ?1")?;
    let paths: Vec<String> = stmt.query_map(rusqlite::params![id], |r| r.get(0))?.filter_map(|r| r.ok()).collect();
    for p in paths { let fp = uploads_dir.join(&p); let _ = std::fs::remove_file(fp); }
    db.execute("DELETE FROM attachments WHERE contact_id = ?1", rusqlite::params![id])?;
    db.execute("DELETE FROM email_log WHERE contact_id = ?1", rusqlite::params![id])?;
    db.execute("DELETE FROM contacts WHERE id = ?1", rusqlite::params![id])?;
    Ok(Json(json!({"success": true})))
}
