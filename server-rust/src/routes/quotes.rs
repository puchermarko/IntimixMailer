use axum::{extract::{Path, State}, Extension, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::helpers::{find_contact_by_email, format_money, get_user_settings};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

fn next_quote_number(db: &rusqlite::Connection, enc_key: &[u8; 32], user_id: &str) -> String {
    let settings = get_user_settings(db, enc_key, user_id);
    let prefix = settings.get("quote_prefix").cloned().unwrap_or_else(|| "AJ".into()).to_uppercase();
    let smtp_user = settings.get("smtp_user").cloned().unwrap_or_default();
    let domain = if smtp_user.contains('@') {
        smtp_user.split('@').nth(1).unwrap_or("").split('.').next().unwrap_or("").to_uppercase()
    } else { String::new() };
    let year = chrono::Utc::now().format("%Y").to_string();
    let base = if domain.is_empty() { format!("{}-{}", prefix, year) } else { format!("{}-{}-{}", prefix, domain, year) };
    let last: Option<String> = db.query_row(
        "SELECT quote_number FROM quotes WHERE quote_number LIKE ?1 AND user_id = ?2 ORDER BY created_at DESC LIMIT 1",
        rusqlite::params![format!("{}-%", base), user_id], |r| r.get(0),
    ).ok();
    let mut seq = 1;
    if let Some(ref last_num) = last {
        if let Some(last_part) = last_num.split('-').last() {
            seq = last_part.parse::<i32>().unwrap_or(0) + 1;
        }
    }
    format!("{}-{:04}", base, seq)
}

pub async fn list_quotes(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    // Auto-link unlinked quotes
    let unlinked: Vec<(String, String)> = db.prepare("SELECT id, contact_email FROM quotes WHERE user_id = ?1 AND (contact_id IS NULL OR contact_id = '') AND contact_email != ''")?
        .query_map(rusqlite::params![auth.effective_user_id], |r| Ok((r.get(0)?, r.get(1)?)))?.filter_map(|r| r.ok()).collect();
    for (qid, qemail) in &unlinked {
        if let Some(cid) = find_contact_by_email(&db, qemail, &auth.effective_user_id) {
            db.execute("UPDATE quotes SET contact_id = ?1 WHERE id = ?2", rusqlite::params![cid, qid]).ok();
        }
    }
    let mut stmt = db.prepare("SELECT * FROM quotes WHERE user_id = ?1 ORDER BY created_at DESC")?;
    let quotes: Vec<Value> = stmt.query_map(rusqlite::params![auth.effective_user_id], |r| {
        Ok(json!({
            "id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"quote_number":r.get::<_,String>(2)?,"title":r.get::<_,Option<String>>(3)?,
            "contact_id":r.get::<_,Option<String>>(4)?,"contact_name":r.get::<_,Option<String>>(5)?,"contact_email":r.get::<_,Option<String>>(6)?,
            "contact_phone":r.get::<_,Option<String>>(7)?,"contact_address":r.get::<_,Option<String>>(8)?,"contact_vat":r.get::<_,Option<String>>(9)?,
            "currency":r.get::<_,Option<String>>(10)?,"vat_rate":r.get::<_,f64>(11)?,"subtotal":r.get::<_,f64>(12)?,
            "vat_amount":r.get::<_,f64>(13)?,"total":r.get::<_,f64>(14)?,"notes":r.get::<_,Option<String>>(15)?,
            "status":r.get::<_,Option<String>>(16)?,"valid_until":r.get::<_,Option<String>>(17)?,
            "created_at":r.get::<_,Option<String>>(18)?,"updated_at":r.get::<_,Option<String>>(19)?
        }))
    })?.filter_map(|r| r.ok()).collect();
    Ok(Json(json!({"quotes": quotes})))
}

pub async fn get_quote(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let quote: Value = db.query_row("SELECT * FROM quotes WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"user_id":r.get::<_,String>(1)?,"quote_number":r.get::<_,String>(2)?,"title":r.get::<_,Option<String>>(3)?,"contact_id":r.get::<_,Option<String>>(4)?,"contact_name":r.get::<_,Option<String>>(5)?,"contact_email":r.get::<_,Option<String>>(6)?,"contact_phone":r.get::<_,Option<String>>(7)?,"contact_address":r.get::<_,Option<String>>(8)?,"contact_vat":r.get::<_,Option<String>>(9)?,"currency":r.get::<_,Option<String>>(10)?,"vat_rate":r.get::<_,f64>(11)?,"subtotal":r.get::<_,f64>(12)?,"vat_amount":r.get::<_,f64>(13)?,"total":r.get::<_,f64>(14)?,"notes":r.get::<_,Option<String>>(15)?,"status":r.get::<_,Option<String>>(16)?,"valid_until":r.get::<_,Option<String>>(17)?,"created_at":r.get::<_,Option<String>>(18)?,"updated_at":r.get::<_,Option<String>>(19)?}))
    }).map_err(|_| AppError::not_found("Quote not found"))?;
    let items: Vec<Value> = db.prepare("SELECT * FROM quote_items WHERE quote_id = ?1 ORDER BY sort_order")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"id":r.get::<_,String>(0)?,"quote_id":r.get::<_,String>(1)?,"description":r.get::<_,String>(2)?,"quantity":r.get::<_,f64>(3)?,"unit":r.get::<_,Option<String>>(4)?,"unit_price":r.get::<_,f64>(5)?,"total":r.get::<_,f64>(6)?,"sort_order":r.get::<_,i32>(7)?})))?.filter_map(|r| r.ok()).collect();
    let mut result = quote.as_object().unwrap().clone();
    result.insert("items".into(), Value::Array(items));
    Ok(Json(Value::Object(result)))
}

#[derive(Deserialize)]
pub struct QuoteBody {
    pub title: Option<String>, pub contact_id: Option<String>, pub contact_name: Option<String>,
    pub contact_email: Option<String>, pub contact_phone: Option<String>, pub contact_address: Option<String>,
    pub contact_vat: Option<String>, pub currency: Option<String>, pub vat_rate: Option<f64>,
    pub notes: Option<String>, pub valid_until: Option<String>, pub status: Option<String>,
    pub items: Option<Vec<QuoteItemBody>>,
}

#[derive(Deserialize, Clone)]
pub struct QuoteItemBody {
    pub description: Option<String>, pub quantity: Option<f64>, pub unit: Option<String>, pub unit_price: Option<f64>,
}

pub async fn create_quote(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<QuoteBody>) -> Result<Json<Value>> {
    let id = {
        let db = state.db.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let quote_number = next_quote_number(&db, &state.enc_key, &auth.effective_user_id);
        let vat_rate = body.vat_rate.unwrap_or(27.0);
        let items = body.items.clone().unwrap_or_default();
        let mut subtotal = 0.0;
        let parsed_items: Vec<(String, f64, String, f64, f64, i32)> = items.iter().enumerate().map(|(i, item)| {
            let qty = item.quantity.unwrap_or(1.0);
            let price = item.unit_price.unwrap_or(0.0);
            let total = qty * price;
            subtotal += total;
            (item.description.clone().unwrap_or_default(), qty, item.unit.clone().unwrap_or_else(|| "db".into()), price, total, i as i32)
        }).collect();
        let vat_amount = (subtotal * vat_rate / 100.0).round();
        let total = subtotal + vat_amount;
        db.execute(
            "INSERT INTO quotes (id, user_id, quote_number, title, contact_id, contact_name, contact_email, contact_phone, contact_address, contact_vat, currency, vat_rate, subtotal, vat_amount, total, notes, status, valid_until) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,'draft',?17)",
            rusqlite::params![id, auth.effective_user_id, quote_number, body.title.as_deref().unwrap_or(""), body.contact_id, body.contact_name.as_deref().unwrap_or(""), body.contact_email.as_deref().unwrap_or(""), body.contact_phone.as_deref().unwrap_or(""), body.contact_address.as_deref().unwrap_or(""), body.contact_vat.as_deref().unwrap_or(""), body.currency.as_deref().unwrap_or("HUF"), vat_rate, subtotal, vat_amount, total, body.notes.as_deref().unwrap_or(""), body.valid_until.as_deref().unwrap_or("")],
        )?;
        for (desc, qty, unit, price, total, sort) in &parsed_items {
            db.execute("INSERT INTO quote_items (id, quote_id, description, quantity, unit, unit_price, total, sort_order) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                rusqlite::params![Uuid::new_v4().to_string(), id, desc, qty, unit, price, total, sort])?;
        }
        id
    };
    get_quote(State(state), Extension(auth), Path(id)).await
}

pub async fn update_quote(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>, Json(body): Json<QuoteBody>) -> Result<Json<Value>> {
    {
        let db = state.db.lock().unwrap();
        let existing: Value = db.query_row("SELECT vat_rate, status FROM quotes WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| {
            Ok(json!({"vat_rate": r.get::<_,f64>(0)?, "status": r.get::<_,Option<String>>(1)?}))
        }).map_err(|_| AppError::not_found("Quote not found"))?;

        let vat_rate = body.vat_rate.unwrap_or(existing["vat_rate"].as_f64().unwrap_or(27.0));
        let items = body.items.clone().unwrap_or_default();
        let mut subtotal = 0.0;
        let parsed_items: Vec<(String, f64, String, f64, f64, i32)> = items.iter().enumerate().map(|(i, item)| {
            let qty = item.quantity.unwrap_or(1.0);
            let price = item.unit_price.unwrap_or(0.0);
            let total = qty * price;
            subtotal += total;
            (item.description.clone().unwrap_or_default(), qty, item.unit.clone().unwrap_or_else(|| "db".into()), price, total, i as i32)
        }).collect();
        let vat_amount = (subtotal * vat_rate / 100.0).round();
        let total = subtotal + vat_amount;

        db.execute(
            "UPDATE quotes SET title=?1, contact_id=?2, contact_name=?3, contact_email=?4, contact_phone=?5, contact_address=?6, contact_vat=?7, currency=?8, vat_rate=?9, subtotal=?10, vat_amount=?11, total=?12, notes=?13, status=?14, valid_until=?15, updated_at=datetime('now') WHERE id=?16",
            rusqlite::params![body.title.as_deref().unwrap_or(""), body.contact_id, body.contact_name.as_deref().unwrap_or(""), body.contact_email.as_deref().unwrap_or(""), body.contact_phone.as_deref().unwrap_or(""), body.contact_address.as_deref().unwrap_or(""), body.contact_vat.as_deref().unwrap_or(""), body.currency.as_deref().unwrap_or("HUF"), vat_rate, subtotal, vat_amount, total, body.notes.as_deref().unwrap_or(""), body.status.as_deref().or(existing["status"].as_str()).unwrap_or("draft"), body.valid_until.as_deref().unwrap_or(""), id],
        )?;
        db.execute("DELETE FROM quote_items WHERE quote_id = ?1", rusqlite::params![id])?;
        for (desc, qty, unit, price, total, sort) in &parsed_items {
            db.execute("INSERT INTO quote_items (id, quote_id, description, quantity, unit, unit_price, total, sort_order) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                rusqlite::params![Uuid::new_v4().to_string(), id, desc, qty, unit, price, total, sort])?;
        }
    }
    get_quote(State(state), Extension(auth), Path(id)).await
}

pub async fn delete_quote(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM quotes WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| r.get(0)).map_err(|_| AppError::not_found("Quote not found"))?;
    db.execute("DELETE FROM quote_items WHERE quote_id = ?1", rusqlite::params![id])?;
    db.execute("DELETE FROM quotes WHERE id = ?1", rusqlite::params![id])?;
    let pdf_path = std::path::Path::new("quotes").join(format!("{}.pdf", id));
    let _ = std::fs::remove_file(pdf_path);
    Ok(Json(json!({"success": true})))
}

#[derive(Deserialize)]
pub struct StatusBody { pub status: Option<String> }

pub async fn update_quote_status(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>, Json(body): Json<StatusBody>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let _: String = db.query_row("SELECT id FROM quotes WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| r.get(0)).map_err(|_| AppError::not_found("Quote not found"))?;
    let status = body.status.as_deref().unwrap_or("");
    let allowed = ["draft", "sent", "accepted", "rejected"];
    if !allowed.contains(&status) { return Err(AppError::bad_request(format!("Invalid status. Allowed: {}", allowed.join(", ")))); }
    db.execute("UPDATE quotes SET status = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![status, id])?;
    Ok(Json(json!({"success": true, "status": status})))
}

// PDF generation endpoint (simplified - returns a basic PDF)
pub async fn get_quote_pdf(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>) -> Result<axum::response::Response> {
    use axum::response::IntoResponse;
    let db = state.db.lock().unwrap();
    let quote: Value = db.query_row("SELECT * FROM quotes WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"quote_number":r.get::<_,String>(2)?,"title":r.get::<_,Option<String>>(3)?,"contact_name":r.get::<_,Option<String>>(5)?,"contact_email":r.get::<_,Option<String>>(6)?,"currency":r.get::<_,Option<String>>(10)?,"vat_rate":r.get::<_,f64>(11)?,"subtotal":r.get::<_,f64>(12)?,"vat_amount":r.get::<_,f64>(13)?,"total":r.get::<_,f64>(14)?,"notes":r.get::<_,Option<String>>(15)?,"valid_until":r.get::<_,Option<String>>(17)?,"created_at":r.get::<_,Option<String>>(18)?}))
    }).map_err(|_| AppError::not_found("Quote not found"))?;
    let items: Vec<Value> = db.prepare("SELECT description, quantity, unit, unit_price, total FROM quote_items WHERE quote_id = ?1 ORDER BY sort_order")?
        .query_map(rusqlite::params![id], |r| Ok(json!({"description":r.get::<_,String>(0)?,"quantity":r.get::<_,f64>(1)?,"unit":r.get::<_,Option<String>>(2)?,"unit_price":r.get::<_,f64>(3)?,"total":r.get::<_,f64>(4)?})))?.filter_map(|r| r.ok()).collect();

    // Generate a simple text-based PDF placeholder
    // Full PDF generation with printpdf would require significant layout code
    let quote_number = quote["quote_number"].as_str().unwrap_or("N/A");
    let _pdf_content = format!("Quote: {}\nThis is a PDF placeholder. Full PDF generation is available.", quote_number);

    // For now, use printpdf to generate a basic PDF
    use printpdf::*;
    let (doc, page1, layer1) = PdfDocument::new("Quote", Mm(210.0), Mm(297.0), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    current_layer.use_text(format!("ÁRAJÁNLAT - {}", quote_number), 18.0, Mm(50.0), Mm(270.0), &font);

    let mut y = 250.0;
    if let Some(title) = quote["title"].as_str() {
        current_layer.use_text(title, 12.0, Mm(50.0), Mm(y), &font);
        y -= 8.0;
    }
    y -= 10.0;
    for (i, item) in items.iter().enumerate() {
        let desc = item["description"].as_str().unwrap_or("");
        let qty = item["quantity"].as_f64().unwrap_or(0.0);
        let price = item["unit_price"].as_f64().unwrap_or(0.0);
        let total = item["total"].as_f64().unwrap_or(0.0);
        let currency = quote["currency"].as_str().unwrap_or("HUF");
        current_layer.use_text(format!("{}. {} - {} x {} = {}", i+1, desc, qty, format_money(price, currency), format_money(total, currency)), 10.0, Mm(50.0), Mm(y), &font);
        y -= 7.0;
        if y < 30.0 { break; }
    }
    y -= 10.0;
    let currency = quote["currency"].as_str().unwrap_or("HUF");
    current_layer.use_text(format!("Nettó: {}", format_money(quote["subtotal"].as_f64().unwrap_or(0.0), currency)), 10.0, Mm(50.0), Mm(y), &font);
    y -= 7.0;
    current_layer.use_text(format!("ÁFA ({}%): {}", quote["vat_rate"].as_f64().unwrap_or(27.0), format_money(quote["vat_amount"].as_f64().unwrap_or(0.0), currency)), 10.0, Mm(50.0), Mm(y), &font);
    y -= 7.0;
    current_layer.use_text(format!("Összesen: {}", format_money(quote["total"].as_f64().unwrap_or(0.0), currency)), 12.0, Mm(50.0), Mm(y), &font);

    let pdf_bytes = doc.save_to_bytes().map_err(|e| AppError::internal(e.to_string()))?;

    Ok((
        [(axum::http::header::CONTENT_TYPE, "application/pdf".to_string()),
         (axum::http::header::CONTENT_DISPOSITION, format!("attachment; filename=\"{}.pdf\"", quote_number))],
        pdf_bytes,
    ).into_response())
}

// Send quote via email
pub async fn send_quote(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Path(id): Path<String>, Json(body): Json<Value>) -> Result<Json<Value>> {
    use lettre::{Message, SmtpTransport, Transport};
    use lettre::transport::smtp::authentication::Credentials;
    use lettre::message::header::ContentType;

    let db = state.db.lock().unwrap();
    let quote: Value = db.query_row("SELECT * FROM quotes WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, auth.effective_user_id], |r| {
        Ok(json!({"contact_email":r.get::<_,Option<String>>(6)?,"quote_number":r.get::<_,String>(2)?,"contact_name":r.get::<_,Option<String>>(5)?,"currency":r.get::<_,Option<String>>(10)?,"subtotal":r.get::<_,f64>(12)?,"vat_rate":r.get::<_,f64>(11)?,"vat_amount":r.get::<_,f64>(13)?,"total":r.get::<_,f64>(14)?,"valid_until":r.get::<_,Option<String>>(17)?,"notes":r.get::<_,Option<String>>(15)?}))
    }).map_err(|_| AppError::not_found("Quote not found"))?;

    let contact_email = quote["contact_email"].as_str().unwrap_or("");
    if contact_email.is_empty() { return Err(AppError::bad_request("Nincs email cím megadva a vevőnél")); }

    let settings = get_user_settings(&db, &state.enc_key, &auth.effective_user_id);
    let smtp_host = settings.get("smtp_host").cloned().unwrap_or_default();
    let smtp_user = settings.get("smtp_user").cloned().unwrap_or_default();
    let smtp_pass = settings.get("smtp_pass").cloned().unwrap_or_default();
    let smtp_port: u16 = settings.get("smtp_port").and_then(|s| s.parse().ok()).unwrap_or(465);
    let company_name = settings.get("company_name").or(settings.get("app_name")).cloned().unwrap_or_else(|| "Cég".into());

    if smtp_user.is_empty() { return Err(AppError::bad_request("SMTP nincs konfigurálva.")); }

    let quote_number = quote["quote_number"].as_str().unwrap_or("N/A");
    let default_subject = format!("Árajánlat - {} | {}", quote_number, company_name);
    let custom_subject = body["subject"].as_str().unwrap_or("");
    let subject = if custom_subject.is_empty() { &default_subject } else { custom_subject };

    let currency = quote["currency"].as_str().unwrap_or("HUF");
    let default_html = format!(
        "<div style=\"font-family: Arial; max-width: 600px; margin: 0 auto;\"><h2 style=\"color: #1AA19C;\">Árajánlat</h2><p>{}</p><p>Összesen: <strong>{}</strong></p></div>",
        quote_number, format_money(quote["total"].as_f64().unwrap_or(0.0), currency)
    );
    let custom_html = body["html"].as_str().unwrap_or("");
    let html = if custom_html.is_empty() { &default_html } else { custom_html };

    let from_addr = format!("\"{}\" <{}>", company_name, smtp_user);
    let email = Message::builder()
        .from(from_addr.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?)
        .to(contact_email.parse().map_err(|e: lettre::address::AddressError| AppError::internal(e.to_string()))?)
        .subject(subject)
        .header(ContentType::TEXT_HTML)
        .body(html.to_string())
        .map_err(|e| AppError::internal(e.to_string()))?;

    let creds = Credentials::new(smtp_user, smtp_pass);
    let mailer = if smtp_port == 465 {
        SmtpTransport::relay(&smtp_host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(smtp_port).build()
    } else {
        SmtpTransport::starttls_relay(&smtp_host).map_err(|e| AppError::internal(e.to_string()))?.credentials(creds).port(smtp_port).build()
    };

    let response = mailer.send(&email).map_err(|e| AppError::internal(e.to_string()))?;
    db.execute("UPDATE quotes SET status = 'sent', updated_at = datetime('now') WHERE id = ?1", rusqlite::params![id]).ok();
    let mid = response.message().collect::<Vec<_>>().join("");
    Ok(Json(json!({"success": true, "messageId": mid})))
}
