use axum::{extract::State, Extension, Json};
use serde_json::{json, Value};

use crate::error::{AppError, Result};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

pub async fn create_checkout(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<Value>) -> Result<Json<Value>> {
    let stripe_key = state.config.stripe_secret_key.as_ref().ok_or_else(|| AppError::internal("Stripe nincs konfigurálva"))?.clone();
    let price_id = body["price_id"].as_str().ok_or_else(|| AppError::bad_request("price_id szükséges"))?.to_string();

    let (user_email, stripe_cid) = {
        let db = state.db.lock().unwrap();
        let (user_email, _user_name, stripe_cid): (String, Option<String>, Option<String>) = db.query_row(
            "SELECT email, name, stripe_customer_id FROM users WHERE id = ?1",
            rusqlite::params![auth.effective_user_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).map_err(|_| AppError::not_found("Felhasználó nem található"))?;
        (user_email, stripe_cid)
    };

    let client = reqwest::Client::new();

    // Create or reuse Stripe customer
    let customer_id = if let Some(ref cid) = stripe_cid {
        if !cid.is_empty() { cid.clone() } else {
            let res = client.post("https://api.stripe.com/v1/customers")
                .bearer_auth(&stripe_key)
                .form(&[("email", user_email.as_str()), ("metadata[user_id]", auth.effective_user_id.as_str())])
                .send().await?.json::<Value>().await?;
            let new_cid = res["id"].as_str().unwrap_or("").to_string();
            let db = state.db.lock().unwrap();
            db.execute("UPDATE users SET stripe_customer_id = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![new_cid, auth.effective_user_id]).ok();
            new_cid
        }
    } else {
        let res = client.post("https://api.stripe.com/v1/customers")
            .bearer_auth(&stripe_key)
            .form(&[("email", user_email.as_str()), ("metadata[user_id]", auth.effective_user_id.as_str())])
            .send().await?.json::<Value>().await?;
        let new_cid = res["id"].as_str().unwrap_or("").to_string();
        let db = state.db.lock().unwrap();
        db.execute("UPDATE users SET stripe_customer_id = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![new_cid, auth.effective_user_id]).ok();
        new_cid
    };

    let origin = "https://pultify.hu";
    let success_url = format!("{}/dashboard/settings?tab=subscription&stripe=success", origin);
    let cancel_url = format!("{}/dashboard/settings?tab=subscription&stripe=cancelled", origin);
    let res = client.post("https://api.stripe.com/v1/checkout/sessions")
        .bearer_auth(&stripe_key)
        .form(&[
            ("customer", customer_id.as_str()),
            ("mode", "subscription"),
            ("line_items[0][price]", price_id.as_str()),
            ("line_items[0][quantity]", "1"),
            ("success_url", success_url.as_str()),
            ("cancel_url", cancel_url.as_str()),
            ("metadata[user_id]", auth.effective_user_id.as_str()),
        ])
        .send().await?.json::<Value>().await?;

    if let Some(url) = res["url"].as_str() {
        Ok(Json(json!({"url": url})))
    } else {
        Err(AppError::internal(res["error"]["message"].as_str().unwrap_or("Stripe error").to_string()))
    }
}

pub async fn create_portal(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let stripe_key = state.config.stripe_secret_key.as_ref().ok_or_else(|| AppError::internal("Stripe nincs konfigurálva"))?.clone();
    let cid = {
        let db = state.db.lock().unwrap();
        let stripe_cid: Option<String> = db.query_row("SELECT stripe_customer_id FROM users WHERE id = ?1", rusqlite::params![auth.effective_user_id], |r| r.get(0)).ok();
        stripe_cid.filter(|s| !s.is_empty()).ok_or_else(|| AppError::bad_request("Nincs Stripe fiók társítva"))?
    };

    let origin = "https://pultify.hu";
    let client = reqwest::Client::new();
    let res = client.post("https://api.stripe.com/v1/billing_portal/sessions")
        .bearer_auth(stripe_key)
        .form(&[("customer", cid.as_str()), ("return_url", &format!("{}/dashboard/settings?tab=subscription", origin))])
        .send().await?.json::<Value>().await?;

    if let Some(url) = res["url"].as_str() {
        Ok(Json(json!({"url": url})))
    } else {
        Err(AppError::internal(res["error"]["message"].as_str().unwrap_or("Stripe error").to_string()))
    }
}

pub async fn list_prices(State(state): State<AppState>) -> Result<Json<Value>> {
    let stripe_key = state.config.stripe_secret_key.as_ref().ok_or_else(|| AppError::internal("Stripe nincs konfigurálva"))?;
    let client = reqwest::Client::new();
    let res = client.get("https://api.stripe.com/v1/prices?active=true&type=recurring&expand[]=data.product&limit=10")
        .bearer_auth(stripe_key).send().await?.json::<Value>().await?;

    let items: Vec<Value> = res["data"].as_array().unwrap_or(&vec![]).iter()
        .filter(|p| p["product"]["active"].as_bool() != Some(false))
        .map(|p| json!({
            "id": p["id"], "product_name": p["product"]["name"].as_str().unwrap_or("Előfizetés"),
            "unit_amount": p["unit_amount"], "currency": p["currency"],
            "interval": p["recurring"]["interval"], "interval_count": p["recurring"]["interval_count"],
        })).collect();

    Ok(Json(json!({"prices": items})))
}

// Stripe webhook handler
pub async fn webhook(State(state): State<AppState>, body: axum::body::Bytes) -> Result<Json<Value>> {
    let event: Value = serde_json::from_slice(&body).map_err(|_| AppError::bad_request("Invalid webhook payload"))?;
    let event_type = event["type"].as_str().unwrap_or("");
    let data = &event["data"]["object"];

    let db = state.db.lock().unwrap();

    match event_type {
        "checkout.session.completed" => {
            let user_id = data["metadata"]["user_id"].as_str().unwrap_or("");
            let customer_id = data["customer"].as_str().unwrap_or("");
            let subscription_id = data["subscription"].as_str().unwrap_or("");
            if !user_id.is_empty() {
                db.execute(
                    "UPDATE users SET subscription_status = 'active', subscription_type = 'paid', stripe_customer_id = ?1, stripe_subscription_id = ?2, subscription_start = datetime('now'), updated_at = datetime('now') WHERE id = ?3",
                    rusqlite::params![customer_id, subscription_id, user_id],
                ).ok();
                tracing::info!("[Stripe] Subscription activated for user {}", user_id);
            }
        }
        "customer.subscription.deleted" => {
            let customer_id = data["customer"].as_str().unwrap_or("");
            if !customer_id.is_empty() {
                db.execute(
                    "UPDATE users SET subscription_status = 'cancelled', subscription_end = datetime('now'), updated_at = datetime('now') WHERE stripe_customer_id = ?1",
                    rusqlite::params![customer_id],
                ).ok();
                tracing::info!("[Stripe] Subscription cancelled for customer {}", customer_id);
            }
        }
        "customer.subscription.updated" => {
            let customer_id = data["customer"].as_str().unwrap_or("");
            let status = data["status"].as_str().unwrap_or("");
            if !customer_id.is_empty() {
                let db_status = match status {
                    "active" | "trialing" => "active",
                    "past_due" | "unpaid" => "past_due",
                    "canceled" | "incomplete_expired" => "cancelled",
                    _ => "active",
                };
                db.execute(
                    "UPDATE users SET subscription_status = ?1, updated_at = datetime('now') WHERE stripe_customer_id = ?2",
                    rusqlite::params![db_status, customer_id],
                ).ok();
            }
        }
        _ => {}
    }

    Ok(Json(json!({"received": true})))
}
