use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub role: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub email: String,
    pub impersonating: Option<String>,
    #[serde(rename = "impersonatingName")]
    pub impersonating_name: Option<String>,
    #[serde(rename = "impersonatingEmail")]
    pub impersonating_email: Option<String>,
    pub purpose: Option<String>,
    pub exp: usize,
}

#[derive(Clone, Debug)]
pub struct AuthUser {
    pub claims: Claims,
    pub effective_user_id: String,
}

pub async fn authenticate(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let auth_header = req.headers().get("authorization").and_then(|v| v.to_str().ok());
    let token = match auth_header {
        Some(h) if h.starts_with("Bearer ") => &h[7..],
        _ => return Err((StatusCode::UNAUTHORIZED, Json(json!({"error": "Unauthorized"})))),
    };

    let decoded = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token"}))))?;

    let claims = decoded.claims;
    let effective_user_id = claims.impersonating.clone().unwrap_or_else(|| claims.user_id.clone());

    req.extensions_mut().insert(AuthUser {
        claims,
        effective_user_id,
    });

    Ok(next.run(req).await)
}

pub async fn admin_only(
    req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let auth_user = req.extensions().get::<AuthUser>().cloned();
    match auth_user {
        Some(u) if u.claims.role == "admin" => Ok(next.run(req).await),
        _ => Err((StatusCode::FORBIDDEN, Json(json!({"error": "Admin access required"})))),
    }
}

pub async fn require_subscription(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let auth_user = req.extensions().get::<AuthUser>().cloned();
    let auth_user = match auth_user {
        Some(u) => u,
        None => return Err((StatusCode::UNAUTHORIZED, Json(json!({"error": "Unauthorized"})))),
    };

    if auth_user.claims.role == "admin" {
        return Ok(next.run(req).await);
    }

    let db = state.db.lock().unwrap();
    let result: Result<(String, Option<String>), _> = db.query_row(
        "SELECT COALESCE(subscription_status, 'none'), trial_end FROM users WHERE id = ?1",
        rusqlite::params![auth_user.effective_user_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    match result {
        Ok((mut status, trial_end)) => {
            if status == "trial" {
                if let Some(ref end) = trial_end {
                    if let Ok(end_dt) = chrono::NaiveDateTime::parse_from_str(end, "%Y-%m-%d %H:%M:%S") {
                        if chrono::Utc::now().naive_utc() > end_dt {
                            let _ = db.execute(
                                "UPDATE users SET subscription_status = 'expired', updated_at = datetime('now') WHERE id = ?1",
                                rusqlite::params![auth_user.effective_user_id],
                            );
                            status = "expired".to_string();
                        }
                    }
                }
            }
            if status == "active" || status == "trial" {
                drop(db);
                Ok(next.run(req).await)
            } else {
                Err((StatusCode::FORBIDDEN, Json(json!({"error": "Nincs aktív előfizetés. Kérjük, aktiváld az előfizetésed."}))))
            }
        }
        Err(_) => Err((StatusCode::FORBIDDEN, Json(json!({"error": "Nincs aktív előfizetés. Kérjük, aktiváld az előfizetésed."})))),
    }
}

/// Extract user ID from token in query param or Authorization header (for download endpoints)
pub fn get_user_id_from_token(token: &str, jwt_secret: &str) -> Option<String> {
    let decoded = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    ).ok()?;
    let claims = decoded.claims;
    Some(claims.impersonating.unwrap_or(claims.user_id))
}
