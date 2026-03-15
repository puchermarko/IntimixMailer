use axum::{extract::{Query, State}, Extension, Json};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct AnalyticsQuery { pub days: Option<i32> }

fn get_analytics_data(db: &rusqlite::Connection, uid: &str, days: i32) -> Value {
    let date_filter = format!("-{} days", days);

    let mut sent_per_day = db.prepare(
        "SELECT date(d) as day, SUM(cnt) as count FROM (\
         SELECT sent_at as d, 1 as cnt FROM email_log WHERE user_id = ?1 \
         UNION ALL SELECT date as d, 1 as cnt FROM sent_imap WHERE user_id = ?2 \
         ) WHERE d >= date('now', ?3) GROUP BY date(d) ORDER BY day"
    ).unwrap();
    let sent_rows: Vec<(String, i64)> = sent_per_day.query_map(rusqlite::params![uid, uid, date_filter], |r| Ok((r.get(0)?, r.get(1)?))).unwrap().filter_map(|r| r.ok()).collect();

    let mut recv_per_day = db.prepare(
        "SELECT date(date) as day, COUNT(*) as count FROM inbox WHERE user_id = ?1 AND date >= date('now', ?2) GROUP BY date(date) ORDER BY day"
    ).unwrap();
    let recv_rows: Vec<(String, i64)> = recv_per_day.query_map(rusqlite::params![uid, date_filter], |r| Ok((r.get(0)?, r.get(1)?))).unwrap().filter_map(|r| r.ok()).collect();

    // Build timeline
    let mut timeline = Vec::new();
    let now = chrono::Utc::now().date_naive();
    for i in (0..days).rev() {
        let d = now - chrono::Duration::days(i as i64);
        let key = d.format("%Y-%m-%d").to_string();
        let sent = sent_rows.iter().find(|(k, _)| k == &key).map(|(_, v)| *v).unwrap_or(0);
        let received = recv_rows.iter().find(|(k, _)| k == &key).map(|(_, v)| *v).unwrap_or(0);
        timeline.push(json!({"day": key, "sent": sent, "received": received}));
    }

    let top_contacts: Vec<Value> = db.prepare(
        "SELECT c.id, c.name, c.email, \
         (SELECT COUNT(*) FROM email_log WHERE contact_id = c.id AND user_id = ?1 AND sent_at >= date('now', ?2)) \
           + (SELECT COUNT(*) FROM sent_imap WHERE contact_id = c.id AND user_id = ?3 AND date >= date('now', ?4)) as sent_count, \
         (SELECT COUNT(*) FROM inbox WHERE contact_id = c.id AND user_id = ?5 AND date >= date('now', ?6)) as received_count \
         FROM contacts c WHERE c.user_id = ?7 ORDER BY (sent_count + received_count) DESC LIMIT 10"
    ).unwrap().query_map(rusqlite::params![uid, date_filter, uid, date_filter, uid, date_filter, uid], |r| {
        Ok(json!({"id":r.get::<_,String>(0)?,"name":r.get::<_,Option<String>>(1)?,"email":r.get::<_,String>(2)?,"sent_count":r.get::<_,i64>(3)?,"received_count":r.get::<_,i64>(4)?}))
    }).unwrap().filter_map(|r| r.ok()).collect();

    let total_sent: i64 = db.query_row(
        "SELECT (SELECT COUNT(*) FROM email_log WHERE user_id = ?1 AND sent_at >= date('now', ?2)) + (SELECT COUNT(*) FROM sent_imap WHERE user_id = ?3 AND date >= date('now', ?4)) as total",
        rusqlite::params![uid, date_filter, uid, date_filter], |r| r.get(0),
    ).unwrap_or(0);

    let total_received: i64 = db.query_row("SELECT COUNT(*) FROM inbox WHERE user_id = ?1 AND date >= date('now', ?2)", rusqlite::params![uid, date_filter], |r| r.get(0)).unwrap_or(0);
    let total_contacts: i64 = db.query_row("SELECT COUNT(*) FROM contacts WHERE user_id = ?1", rusqlite::params![uid], |r| r.get(0)).unwrap_or(0);
    let total_quotes: i64 = db.query_row("SELECT COUNT(*) FROM quotes WHERE user_id = ?1 AND created_at >= date('now', ?2)", rusqlite::params![uid, date_filter], |r| r.get(0)).unwrap_or(0);
    let accepted_quotes: i64 = db.query_row("SELECT COUNT(*) FROM quotes WHERE user_id = ?1 AND status = 'accepted' AND created_at >= date('now', ?2)", rusqlite::params![uid, date_filter], |r| r.get(0)).unwrap_or(0);
    let rejected_quotes: i64 = db.query_row("SELECT COUNT(*) FROM quotes WHERE user_id = ?1 AND status = 'rejected' AND created_at >= date('now', ?2)", rusqlite::params![uid, date_filter], |r| r.get(0)).unwrap_or(0);

    let contacts_we_emailed: i64 = db.prepare(
        "SELECT COUNT(DISTINCT contact_id) FROM (\
         SELECT contact_id FROM email_log WHERE user_id = ?1 AND contact_id IS NOT NULL AND sent_at >= date('now', ?2) \
         UNION SELECT contact_id FROM sent_imap WHERE user_id = ?3 AND contact_id IS NOT NULL AND date >= date('now', ?4))"
    ).unwrap().query_row(rusqlite::params![uid, date_filter, uid, date_filter], |r| r.get(0)).unwrap_or(0);

    let contacts_who_replied: i64 = db.query_row(
        "SELECT COUNT(DISTINCT i.contact_id) FROM inbox i WHERE i.user_id = ?1 AND i.contact_id IS NOT NULL AND i.date >= date('now', ?2) \
         AND i.contact_id IN (SELECT contact_id FROM email_log WHERE user_id = ?3 AND contact_id IS NOT NULL AND sent_at >= date('now', ?4) \
         UNION SELECT contact_id FROM sent_imap WHERE user_id = ?5 AND contact_id IS NOT NULL AND date >= date('now', ?6))",
        rusqlite::params![uid, date_filter, uid, date_filter, uid, date_filter], |r| r.get(0),
    ).unwrap_or(0);

    let response_rate = if contacts_we_emailed > 0 { ((contacts_who_replied as f64 / contacts_we_emailed as f64) * 100.0).round() as i64 } else { 0 };

    let half_days = days / 2;
    let half_filter = format!("-{} days", half_days);
    let sent_this_half: i64 = db.prepare("SELECT COUNT(*) FROM (SELECT sent_at as d FROM email_log WHERE user_id=?1 UNION ALL SELECT date as d FROM sent_imap WHERE user_id=?2) WHERE d >= date('now', ?3)")
        .unwrap().query_row(rusqlite::params![uid, uid, half_filter], |r| r.get(0)).unwrap_or(0);
    let sent_last_half: i64 = db.prepare("SELECT COUNT(*) FROM (SELECT sent_at as d FROM email_log WHERE user_id=?1 UNION ALL SELECT date as d FROM sent_imap WHERE user_id=?2) WHERE d >= date('now', ?3) AND d < date('now', ?4)")
        .unwrap().query_row(rusqlite::params![uid, uid, date_filter, half_filter], |r| r.get(0)).unwrap_or(0);
    let received_this_half: i64 = db.query_row("SELECT COUNT(*) FROM inbox WHERE user_id=?1 AND date >= date('now', ?2)", rusqlite::params![uid, half_filter], |r| r.get(0)).unwrap_or(0);
    let received_last_half: i64 = db.query_row("SELECT COUNT(*) FROM inbox WHERE user_id=?1 AND date >= date('now', ?2) AND date < date('now', ?3)", rusqlite::params![uid, date_filter, half_filter], |r| r.get(0)).unwrap_or(0);

    json!({
        "timeline": timeline, "topContacts": top_contacts, "days": days,
        "summary": {
            "totalSent": total_sent, "totalReceived": total_received, "totalContacts": total_contacts,
            "totalQuotes": total_quotes, "acceptedQuotes": accepted_quotes, "rejectedQuotes": rejected_quotes,
            "responseRate": response_rate, "sentThisHalf": sent_this_half, "sentLastHalf": sent_last_half,
            "receivedThisHalf": received_this_half, "receivedLastHalf": received_last_half,
        }
    })
}

pub async fn get_analytics(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Query(q): Query<AnalyticsQuery>) -> Result<Json<Value>> {
    let days = q.days.unwrap_or(30);
    let db = state.db.lock().unwrap();
    Ok(Json(get_analytics_data(&db, &auth.effective_user_id, days)))
}

pub async fn export_csv(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Query(q): Query<AnalyticsQuery>) -> Result<axum::response::Response> {
    use axum::response::IntoResponse;
    let days = q.days.unwrap_or(30);
    let db = state.db.lock().unwrap();
    let data = get_analytics_data(&db, &auth.effective_user_id, days);
    let summary = &data["summary"];
    let timeline = data["timeline"].as_array().unwrap();
    let top_contacts = data["topContacts"].as_array().unwrap();

    let mut csv = String::from("Analitika riport\n");
    csv += &format!("Időszak: {} nap\n", days);
    csv += &format!("Generálva: {}\n\n", chrono::Utc::now().format("%Y-%m-%d"));
    csv += "Összesítés\n";
    csv += &format!("Küldött;{}\n", summary["totalSent"]);
    csv += &format!("Fogadott;{}\n", summary["totalReceived"]);
    csv += &format!("Kapcsolatok;{}\n", summary["totalContacts"]);
    csv += &format!("Árajánlatok;{}\n", summary["totalQuotes"]);
    csv += &format!("Elfogadott;{}\n", summary["acceptedQuotes"]);
    csv += &format!("Elutasított;{}\n", summary["rejectedQuotes"]);
    csv += &format!("Válaszadási arány;{}%\n\n", summary["responseRate"]);
    csv += "Napi forgalom\nDátum;Küldött;Fogadott\n";
    for row in timeline {
        csv += &format!("{};{};{}\n", row["day"].as_str().unwrap_or(""), row["sent"], row["received"]);
    }
    if !top_contacts.is_empty() {
        csv += "\nLegaktívabb kapcsolatok\nNév;Email;Küldött;Fogadott;Összesen\n";
        for c in top_contacts {
            let sc = c["sent_count"].as_i64().unwrap_or(0);
            let rc = c["received_count"].as_i64().unwrap_or(0);
            csv += &format!("{};{};{};{};{}\n", c["name"].as_str().unwrap_or(""), c["email"].as_str().unwrap_or(""), sc, rc, sc + rc);
        }
    }

    let filename = format!("analitika-{}nap-{}.csv", days, chrono::Utc::now().format("%Y-%m-%d"));
    let bom_csv = format!("\u{FEFF}{}", csv);
    Ok(([
        (axum::http::header::CONTENT_TYPE, "text/csv; charset=utf-8".to_string()),
        (axum::http::header::CONTENT_DISPOSITION, format!("attachment; filename=\"{}\"", filename)),
    ], bom_csv).into_response())
}

pub async fn export_pdf(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Query(q): Query<AnalyticsQuery>) -> Result<axum::response::Response> {
    use axum::response::IntoResponse;
    use printpdf::*;

    let days = q.days.unwrap_or(30);
    let db = state.db.lock().unwrap();
    let data = get_analytics_data(&db, &auth.effective_user_id, days);
    let summary = &data["summary"];

    let (doc, page1, layer1) = PdfDocument::new("Analytics Report", Mm(210.0), Mm(297.0), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();

    current_layer.use_text("Analitika riport", 18.0, Mm(50.0), Mm(270.0), &font);
    current_layer.use_text(format!("Időszak: {} nap", days), 10.0, Mm(50.0), Mm(258.0), &font);
    current_layer.use_text(format!("Küldött: {} | Fogadott: {} | Kapcsolatok: {}", summary["totalSent"], summary["totalReceived"], summary["totalContacts"]), 10.0, Mm(50.0), Mm(245.0), &font);
    current_layer.use_text(format!("Árajánlatok: {} | Elfogadva: {} | Elutasítva: {}", summary["totalQuotes"], summary["acceptedQuotes"], summary["rejectedQuotes"]), 10.0, Mm(50.0), Mm(235.0), &font);
    current_layer.use_text(format!("Válaszadási arány: {}%", summary["responseRate"]), 10.0, Mm(50.0), Mm(225.0), &font);

    let pdf_bytes = doc.save_to_bytes().map_err(|e| AppError::internal(e.to_string()))?;
    let filename = format!("analitika-{}nap-{}.pdf", days, chrono::Utc::now().format("%Y-%m-%d"));
    Ok(([
        (axum::http::header::CONTENT_TYPE, "application/pdf".to_string()),
        (axum::http::header::CONTENT_DISPOSITION, format!("attachment; filename=\"{}\"", filename)),
    ], pdf_bytes).into_response())
}
