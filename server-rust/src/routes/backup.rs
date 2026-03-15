use axum::{extract::State, Extension, Json};
use serde_json::{json, Value};

use crate::config::SENSITIVE_SETTING_KEYS;
use crate::crypto::decrypt_value;
use crate::error::{AppError, Result};
use crate::helpers::set_user_setting;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

fn export_user_data(db: &rusqlite::Connection, _enc_key: &[u8; 32], user_id: &str) -> Value {
    let contacts: Vec<Value> = db.prepare("SELECT * FROM contacts WHERE user_id = ?1").unwrap()
        .query_map(rusqlite::params![user_id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"name":r.get::<_,String>(2)?,"email":r.get::<_,String>(3)?,"phone":r.get::<_,Option<String>>(4)?,"notes":r.get::<_,Option<String>>(5)?,"company":r.get::<_,Option<String>>(6)?,"vat_id":r.get::<_,Option<String>>(7)?,"street":r.get::<_,Option<String>>(8)?,"street_number":r.get::<_,Option<String>>(9)?,"city":r.get::<_,Option<String>>(10)?,"zip":r.get::<_,Option<String>>(11)?,"country":r.get::<_,Option<String>>(12)?,"region":r.get::<_,Option<String>>(13)?,"created_at":r.get::<_,Option<String>>(14)?,"updated_at":r.get::<_,Option<String>>(15)?})))
        .unwrap().filter_map(|r| r.ok()).collect();

    let email_log: Vec<Value> = db.prepare("SELECT * FROM email_log WHERE user_id = ?1").unwrap()
        .query_map(rusqlite::params![user_id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"contact_id":r.get::<_,Option<String>>(2)?,"recipient_email":r.get::<_,String>(3)?,"subject":r.get::<_,String>(4)?,"html":r.get::<_,String>(5)?,"sent_at":r.get::<_,Option<String>>(6)?,"message_id":r.get::<_,Option<String>>(7)?,"status":r.get::<_,Option<String>>(8)?})))
        .unwrap().filter_map(|r| r.ok()).collect();

    let templates: Vec<Value> = db.prepare("SELECT * FROM custom_templates WHERE user_id = ?1").unwrap()
        .query_map(rusqlite::params![user_id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"name":r.get::<_,String>(2)?,"description":r.get::<_,Option<String>>(3)?,"category":r.get::<_,Option<String>>(4)?,"subject":r.get::<_,Option<String>>(5)?,"html":r.get::<_,Option<String>>(6)?,"blocks_json":r.get::<_,Option<String>>(7)?,"created_at":r.get::<_,Option<String>>(8)?,"updated_at":r.get::<_,Option<String>>(9)?})))
        .unwrap().filter_map(|r| r.ok()).collect();

    let api_keys: Vec<Value> = db.prepare("SELECT id, name, key, created_at, last_used_at, active FROM api_keys WHERE user_id = ?1").unwrap()
        .query_map(rusqlite::params![user_id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"name":r.get::<_,String>(1)?,"key":r.get::<_,String>(2)?,"created_at":r.get::<_,Option<String>>(3)?,"last_used_at":r.get::<_,Option<String>>(4)?,"active":r.get::<_,i32>(5)?})))
        .unwrap().filter_map(|r| r.ok()).collect();

    let quotes: Vec<Value> = db.prepare("SELECT * FROM quotes WHERE user_id = ?1").unwrap()
        .query_map(rusqlite::params![user_id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"quote_number":r.get::<_,String>(2)?,"title":r.get::<_,Option<String>>(3)?,"contact_id":r.get::<_,Option<String>>(4)?,"contact_name":r.get::<_,Option<String>>(5)?,"contact_email":r.get::<_,Option<String>>(6)?,"contact_phone":r.get::<_,Option<String>>(7)?,"contact_address":r.get::<_,Option<String>>(8)?,"contact_vat":r.get::<_,Option<String>>(9)?,"currency":r.get::<_,Option<String>>(10)?,"vat_rate":r.get::<_,f64>(11)?,"subtotal":r.get::<_,f64>(12)?,"vat_amount":r.get::<_,f64>(13)?,"total":r.get::<_,f64>(14)?,"notes":r.get::<_,Option<String>>(15)?,"status":r.get::<_,Option<String>>(16)?,"valid_until":r.get::<_,Option<String>>(17)?,"created_at":r.get::<_,Option<String>>(18)?,"updated_at":r.get::<_,Option<String>>(19)?})))
        .unwrap().filter_map(|r| r.ok()).collect();

    let quote_ids: Vec<String> = quotes.iter().filter_map(|q| q["id"].as_str().map(|s| s.to_string())).collect();
    let mut quote_items: Vec<Value> = Vec::new();
    for qid in &quote_ids {
        let items: Vec<Value> = db.prepare("SELECT * FROM quote_items WHERE quote_id = ?1").unwrap()
            .query_map(rusqlite::params![qid], |r| Ok(json!({"id":r.get::<_,String>(0)?,"quote_id":r.get::<_,String>(1)?,"description":r.get::<_,String>(2)?,"quantity":r.get::<_,f64>(3)?,"unit":r.get::<_,Option<String>>(4)?,"unit_price":r.get::<_,f64>(5)?,"total":r.get::<_,f64>(6)?,"sort_order":r.get::<_,i32>(7)?})))
            .unwrap().filter_map(|r| r.ok()).collect();
        quote_items.extend(items);
    }

    let inbox: Vec<Value> = db.prepare("SELECT id, user_id, uid, message_id, from_address, from_name, to_address, subject, date, text_body, html_body, has_attachments, contact_id FROM inbox WHERE user_id = ?1").unwrap()
        .query_map(rusqlite::params![user_id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"uid":r.get::<_,i64>(2)?,"message_id":r.get::<_,Option<String>>(3)?,"from_address":r.get::<_,String>(4)?,"from_name":r.get::<_,Option<String>>(5)?,"to_address":r.get::<_,Option<String>>(6)?,"subject":r.get::<_,Option<String>>(7)?,"date":r.get::<_,Option<String>>(8)?,"text_body":r.get::<_,Option<String>>(9)?,"html_body":r.get::<_,Option<String>>(10)?,"has_attachments":r.get::<_,i32>(11)?,"contact_id":r.get::<_,Option<String>>(12)?})))
        .unwrap().filter_map(|r| r.ok()).collect();

    let sent_imap: Vec<Value> = db.prepare("SELECT id, user_id, uid, message_id, from_address, from_name, to_address, subject, date, text_body, html_body, has_attachments, contact_id FROM sent_imap WHERE user_id = ?1").unwrap()
        .query_map(rusqlite::params![user_id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"uid":r.get::<_,i64>(2)?,"message_id":r.get::<_,Option<String>>(3)?,"from_address":r.get::<_,String>(4)?,"from_name":r.get::<_,Option<String>>(5)?,"to_address":r.get::<_,Option<String>>(6)?,"subject":r.get::<_,Option<String>>(7)?,"date":r.get::<_,Option<String>>(8)?,"text_body":r.get::<_,Option<String>>(9)?,"html_body":r.get::<_,Option<String>>(10)?,"has_attachments":r.get::<_,i32>(11)?,"contact_id":r.get::<_,Option<String>>(12)?})))
        .unwrap().filter_map(|r| r.ok()).collect();

    let settings: Vec<Value> = db.prepare("SELECT key, value FROM user_settings WHERE user_id = ?1").unwrap()
        .query_map(rusqlite::params![user_id], |r| Ok(json!({"key":r.get::<_,String>(0)?,"value":r.get::<_,String>(1)?})))
        .unwrap().filter_map(|r| r.ok()).collect();

    json!({
        "contacts": contacts, "emailLog": email_log, "templates": templates,
        "apiKeys": api_keys, "quotes": quotes, "quoteItems": quote_items,
        "inbox": inbox, "sentImap": sent_imap, "settings": settings,
    })
}

pub async fn export_backup(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<axum::response::Response> {
    use axum::response::IntoResponse;
    let db = state.db.lock().unwrap();
    let is_admin = auth.claims.role == "admin";
    let mut backup = json!({"version": 1, "exported_at": chrono::Utc::now().to_rfc3339(), "type": if is_admin { "full" } else { "user" }});

    if is_admin {
        let users: Vec<Value> = db.prepare("SELECT id, email, name, active, created_at FROM users").unwrap()
            .query_map([], |r| Ok(json!({"id":r.get::<_,String>(0)?,"email":r.get::<_,String>(1)?,"name":r.get::<_,Option<String>>(2)?,"active":r.get::<_,i32>(3)?,"created_at":r.get::<_,Option<String>>(4)?})))
            .unwrap().filter_map(|r| r.ok()).collect();
        let mut users_with_data: Vec<Value> = Vec::new();
        for u in &users {
            let uid = u["id"].as_str().unwrap_or("");
            let data = export_user_data(&db, &state.enc_key, uid);
            let mut user_obj = u.as_object().unwrap().clone();
            user_obj.insert("data".into(), data);
            users_with_data.push(Value::Object(user_obj));
        }
        backup["users"] = Value::Array(users_with_data);
        backup["adminData"] = export_user_data(&db, &state.enc_key, "__admin__");
    } else {
        backup["userId"] = Value::String(auth.effective_user_id.clone());
        backup["data"] = export_user_data(&db, &state.enc_key, &auth.effective_user_id);
    }

    let filename = format!("backup-{}-{}.json", if is_admin { "full" } else { "user" }, chrono::Utc::now().format("%Y-%m-%d"));
    let body = serde_json::to_string_pretty(&backup).unwrap();
    Ok(([
        (axum::http::header::CONTENT_TYPE, "application/json".to_string()),
        (axum::http::header::CONTENT_DISPOSITION, format!("attachment; filename=\"{}\"", filename)),
    ], body).into_response())
}

fn import_user_data(db: &rusqlite::Connection, enc_key: &[u8; 32], user_id: &str, data: &Value) -> Value {
    let mut stats = json!({"contacts": 0, "emails": 0, "templates": 0, "quotes": 0, "settings": 0});

    // Import settings
    if let Some(settings) = data["settings"].as_array() {
        for s in settings {
            let key = s["key"].as_str().unwrap_or("");
            let value = s["value"].as_str().unwrap_or("");
            if !key.is_empty() {
                let val = if SENSITIVE_SETTING_KEYS.contains(&key) { decrypt_value(enc_key, value) } else { value.to_string() };
                set_user_setting(db, enc_key, user_id, key, &val);
                stats["settings"] = json!(stats["settings"].as_i64().unwrap_or(0) + 1);
            }
        }
    }

    // Import contacts
    if let Some(contacts) = data["contacts"].as_array() {
        for c in contacts {
            db.execute(
                "INSERT OR IGNORE INTO contacts (id, user_id, name, email, phone, notes, company, vat_id, street, street_number, city, zip, country, region, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)",
                rusqlite::params![c["id"].as_str().unwrap_or(""), user_id, c["name"].as_str().unwrap_or(""), c["email"].as_str().unwrap_or(""), c["phone"].as_str().unwrap_or(""), c["notes"].as_str().unwrap_or(""), c["company"].as_str().unwrap_or(""), c["vat_id"].as_str().unwrap_or(""), c["street"].as_str().unwrap_or(""), c["street_number"].as_str().unwrap_or(""), c["city"].as_str().unwrap_or(""), c["zip"].as_str().unwrap_or(""), c["country"].as_str().unwrap_or(""), c["region"].as_str().unwrap_or(""), c["created_at"].as_str().unwrap_or("")],
            ).ok();
            stats["contacts"] = json!(stats["contacts"].as_i64().unwrap_or(0) + 1);
        }
    }

    // Import email log
    if let Some(emails) = data["emailLog"].as_array() {
        for e in emails {
            db.execute(
                "INSERT OR IGNORE INTO email_log (id, user_id, contact_id, recipient_email, subject, html, sent_at, message_id, status) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                rusqlite::params![e["id"].as_str().unwrap_or(""), user_id, e["contact_id"].as_str(), e["recipient_email"].as_str().unwrap_or(""), e["subject"].as_str().unwrap_or(""), e["html"].as_str().unwrap_or(""), e["sent_at"].as_str(), e["message_id"].as_str(), e["status"].as_str().unwrap_or("sent")],
            ).ok();
            stats["emails"] = json!(stats["emails"].as_i64().unwrap_or(0) + 1);
        }
    }

    // Import templates
    if let Some(templates) = data["templates"].as_array() {
        for t in templates {
            db.execute(
                "INSERT OR IGNORE INTO custom_templates (id, user_id, name, description, category, subject, html, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                rusqlite::params![t["id"].as_str().unwrap_or(""), user_id, t["name"].as_str().unwrap_or(""), t["description"].as_str().unwrap_or(""), t["category"].as_str().unwrap_or("Custom"), t["subject"].as_str().unwrap_or(""), t["html"].as_str().unwrap_or(""), t["created_at"].as_str(), t["updated_at"].as_str()],
            ).ok();
            stats["templates"] = json!(stats["templates"].as_i64().unwrap_or(0) + 1);
        }
    }

    // Import quotes
    if let Some(quotes) = data["quotes"].as_array() {
        for q in quotes {
            db.execute(
                "INSERT OR IGNORE INTO quotes (id, user_id, quote_number, contact_id, contact_name, contact_email, status, valid_until, notes, currency, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
                rusqlite::params![q["id"].as_str().unwrap_or(""), user_id, q["quote_number"].as_str().unwrap_or(""), q["contact_id"].as_str(), q["contact_name"].as_str().unwrap_or(""), q["contact_email"].as_str().unwrap_or(""), q["status"].as_str().unwrap_or("draft"), q["valid_until"].as_str(), q["notes"].as_str().unwrap_or(""), q["currency"].as_str().unwrap_or("HUF"), q["created_at"].as_str(), q["updated_at"].as_str()],
            ).ok();
            stats["quotes"] = json!(stats["quotes"].as_i64().unwrap_or(0) + 1);
        }
    }
    if let Some(items) = data["quoteItems"].as_array() {
        for i in items {
            db.execute(
                "INSERT OR IGNORE INTO quote_items (id, quote_id, description, quantity, unit, unit_price, sort_order) VALUES (?1,?2,?3,?4,?5,?6,?7)",
                rusqlite::params![i["id"].as_str().unwrap_or(""), i["quote_id"].as_str().unwrap_or(""), i["description"].as_str().unwrap_or(""), i["quantity"].as_f64().unwrap_or(1.0), i["unit"].as_str().unwrap_or("db"), i["unit_price"].as_f64().unwrap_or(0.0), i["sort_order"].as_i64().unwrap_or(0)],
            ).ok();
        }
    }

    // Import inbox
    if let Some(inbox) = data["inbox"].as_array() {
        for m in inbox {
            db.execute(
                "INSERT OR IGNORE INTO inbox (id, user_id, uid, message_id, from_address, from_name, to_address, subject, date, text_body, html_body, has_attachments, contact_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                rusqlite::params![m["id"].as_str().unwrap_or(""), user_id, m["uid"].as_i64().unwrap_or(0), m["message_id"].as_str(), m["from_address"].as_str().unwrap_or(""), m["from_name"].as_str().unwrap_or(""), m["to_address"].as_str().unwrap_or(""), m["subject"].as_str().unwrap_or(""), m["date"].as_str(), m["text_body"].as_str().unwrap_or(""), m["html_body"].as_str().unwrap_or(""), m["has_attachments"].as_i64().unwrap_or(0), m["contact_id"].as_str()],
            ).ok();
        }
    }

    // Import sent_imap
    if let Some(sent) = data["sentImap"].as_array() {
        for m in sent {
            db.execute(
                "INSERT OR IGNORE INTO sent_imap (id, user_id, uid, message_id, from_address, from_name, to_address, subject, date, text_body, html_body, has_attachments, contact_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                rusqlite::params![m["id"].as_str().unwrap_or(""), user_id, m["uid"].as_i64().unwrap_or(0), m["message_id"].as_str(), m["from_address"].as_str().unwrap_or(""), m["from_name"].as_str().unwrap_or(""), m["to_address"].as_str().unwrap_or(""), m["subject"].as_str().unwrap_or(""), m["date"].as_str(), m["text_body"].as_str().unwrap_or(""), m["html_body"].as_str().unwrap_or(""), m["has_attachments"].as_i64().unwrap_or(0), m["contact_id"].as_str()],
            ).ok();
        }
    }

    stats
}

pub async fn import_backup(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(backup): Json<Value>) -> Result<Json<Value>> {
    if backup.get("version").is_none() { return Err(AppError::bad_request("Invalid backup file")); }
    let is_admin = auth.claims.role == "admin";
    let db = state.db.lock().unwrap();
    let mut results = Vec::new();

    let backup_type = backup["type"].as_str().unwrap_or("");

    if backup_type == "full" && is_admin {
        if let Some(users) = backup["users"].as_array() {
            for u in users {
                let uid = u["id"].as_str().unwrap_or("");
                db.execute("INSERT OR IGNORE INTO users (id, email, password, name, active, created_at) VALUES (?1,?2,?3,?4,?5,?6)",
                    rusqlite::params![uid, u["email"].as_str().unwrap_or(""), u["password"].as_str().unwrap_or(""), u["name"].as_str().unwrap_or(""), u["active"].as_i64().unwrap_or(1), u["created_at"].as_str()]).ok();
                let stats = import_user_data(&db, &state.enc_key, uid, &u["data"]);
                results.push(json!({"user": u["email"].as_str().unwrap_or(""), "stats": stats}));
            }
        }
        if backup.get("adminData").is_some() {
            let stats = import_user_data(&db, &state.enc_key, "__admin__", &backup["adminData"]);
            results.push(json!({"user": "admin", "stats": stats}));
        }
    } else if backup_type == "user" {
        if backup.get("data").is_none() { return Err(AppError::bad_request("No data in backup")); }
        let stats = import_user_data(&db, &state.enc_key, &auth.effective_user_id, &backup["data"]);
        results.push(json!({"user": "current", "stats": stats}));
    } else if backup_type == "full" && !is_admin {
        return Err(AppError::forbidden("Only admin can import full backups"));
    } else {
        return Err(AppError::bad_request("Unknown backup type"));
    }

    Ok(Json(json!({"success": true, "results": results})))
}

// Cleanup endpoint
pub async fn cleanup(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let uid = &auth.effective_user_id;
    let mut stats = json!({"orphaned_email_log": 0, "orphaned_attachments": 0, "orphaned_inbox": 0, "orphaned_inbox_attachments": 0, "orphaned_sent_imap": 0, "orphaned_sent_imap_attachments": 0, "files_deleted": 0});

    // Nullify contact_id on orphaned inbox
    let changed = db.execute("UPDATE inbox SET contact_id = NULL WHERE user_id = ?1 AND contact_id IS NOT NULL AND contact_id NOT IN (SELECT id FROM contacts WHERE user_id = ?2)", rusqlite::params![uid, uid]).unwrap_or(0);
    stats["orphaned_inbox"] = json!(changed);

    // Nullify contact_id on orphaned sent_imap
    let changed = db.execute("UPDATE sent_imap SET contact_id = NULL WHERE user_id = ?1 AND contact_id IS NOT NULL AND contact_id NOT IN (SELECT id FROM contacts WHERE user_id = ?2)", rusqlite::params![uid, uid]).unwrap_or(0);
    stats["orphaned_sent_imap"] = json!(changed);

    // Clean orphaned email_log
    let changed = db.execute("DELETE FROM email_log WHERE user_id = ?1 AND contact_id IS NOT NULL AND contact_id NOT IN (SELECT id FROM contacts WHERE user_id = ?2)", rusqlite::params![uid, uid]).unwrap_or(0);
    stats["orphaned_email_log"] = json!(changed);

    let total: i64 = stats.as_object().unwrap().values().map(|v| v.as_i64().unwrap_or(0)).sum();
    Ok(Json(json!({"success": true, "stats": stats, "totalCleaned": total})))
}
