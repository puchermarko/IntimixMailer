use axum::{extract::{Multipart, Path, State}, Extension, Json};
use serde_json::{json, Value};

use crate::error::{AppError, Result};
use crate::helpers::{get_user_settings, set_user_setting};
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

pub async fn get_branding(State(state): State<AppState>, Extension(auth): Extension<AuthUser>) -> Result<Json<Value>> {
    let db = state.db.lock().unwrap();
    let settings = get_user_settings(&db, &state.enc_key, &auth.effective_user_id);
    let mut result = serde_json::Map::new();
    result.insert("app_name".into(), Value::String(settings.get("app_name").cloned().unwrap_or_else(|| "Mailer".into())));
    result.insert("app_subtitle".into(), Value::String(settings.get("app_subtitle").cloned().unwrap_or_default()));
    result.insert("app_logo".into(), Value::String(settings.get("app_logo").cloned().unwrap_or_else(|| "/logo-header.png".into())));
    for (key, val) in &settings {
        if !val.is_empty() { result.insert(key.clone(), Value::String(val.clone())); }
    }
    if let Some(smtp_user) = settings.get("smtp_user") {
        if smtp_user.contains('@') {
            result.insert("login_domain".into(), Value::String(smtp_user.split('@').nth(1).unwrap_or("").to_lowercase()));
        }
    }
    Ok(Json(Value::Object(result)))
}

pub async fn put_branding(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, Json(body): Json<Value>) -> Result<Json<Value>> {
    let allowed = ["app_name", "app_subtitle", "company_name", "company_vat", "company_email",
        "company_phone", "company_street", "company_city", "company_zip", "company_country",
        "company_bank_name", "company_bank_iban", "quote_prefix"];
    let db = state.db.lock().unwrap();
    if let Some(obj) = body.as_object() {
        for (key, val) in obj {
            if allowed.contains(&key.as_str()) {
                if let Some(v) = val.as_str() {
                    set_user_setting(&db, &state.enc_key, &auth.effective_user_id, key, v);
                }
            }
        }
    }
    Ok(Json(json!({"success": true})))
}

pub async fn upload_logo(State(state): State<AppState>, Extension(auth): Extension<AuthUser>, mut multipart: Multipart) -> Result<Json<Value>> {
    let mut file_data: Option<(String, Vec<u8>, String)> = None;
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::bad_request(e.to_string()))? {
        if field.name() == Some("logo") {
            let filename = field.file_name().unwrap_or("logo.png").to_string();
            let content_type = field.content_type().unwrap_or("image/png").to_string();
            let data = field.bytes().await.map_err(|e| AppError::bad_request(e.to_string()))?;
            file_data = Some((filename, data.to_vec(), content_type));
        }
    }
    let (filename, data, mimetype) = file_data.ok_or_else(|| AppError::bad_request("Nincs fájl feltöltve"))?;
    let allowed_types = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"];
    if !allowed_types.contains(&mimetype.as_str()) {
        return Err(AppError::bad_request("Csak kép fájl engedélyezett (PNG, JPG, SVG, WebP, GIF)"));
    }

    let branding_dir = std::path::Path::new("branding").join(&auth.effective_user_id);
    std::fs::create_dir_all(&branding_dir).ok();
    let ext = std::path::Path::new(&filename).extension().and_then(|e| e.to_str()).unwrap_or("png");
    let logo_filename = format!("logo.{}", ext);
    let filepath = branding_dir.join(&logo_filename);
    std::fs::write(&filepath, &data)?;

    let logo_url = format!("/api/branding/logo-file/{}/{}", auth.effective_user_id, logo_filename);
    let db = state.db.lock().unwrap();
    set_user_setting(&db, &state.enc_key, &auth.effective_user_id, "app_logo", &logo_url);

    Ok(Json(json!({"success": true, "logo": logo_url})))
}

pub async fn serve_logo(Path((user_id, filename)): Path<(String, String)>) -> Result<axum::response::Response> {
    use axum::response::IntoResponse;
    let branding_dir = std::path::Path::new("branding").join(&user_id);
    let safe_filename = std::path::Path::new(&filename).file_name().and_then(|f| f.to_str()).unwrap_or("");
    let fp = branding_dir.join(safe_filename);
    if !fp.exists() { return Err(AppError::not_found("Logo not found")); }
    let data = std::fs::read(&fp)?;
    let mime = mime_guess::from_path(&fp).first_or_octet_stream().to_string();
    Ok(([
        (axum::http::header::CONTENT_TYPE, mime),
    ], data).into_response())
}
