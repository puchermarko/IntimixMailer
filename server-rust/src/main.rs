mod config;
mod crypto;
mod db;
mod error;
mod helpers;
mod middleware;
mod routes;
mod state;

use axum::{
    extract::DefaultBodyLimit,
    middleware as axum_mw,
    routing::{delete, get, patch, post, put},
    Router,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use config::Config;
use state::AppState;

#[tokio::main]
async fn main() {
    // Load .env file from parent directory (same as Node.js server)
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("server").join(".env");
    if env_path.exists() {
        dotenvy::from_path(&env_path).ok();
    } else {
        dotenvy::dotenv().ok();
    }

    tracing_subscriber::fmt::init();

    let config = Config::from_env();
    let port = config.port;

    // Initialize database (use the same data.db as the Node.js server)
    let db_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("server").join("data.db");
    let db = db::init_db(db_path.to_str().unwrap());

    // Derive encryption key
    let enc_key = crypto::derive_key(&config.encryption_key);

    // Hash admin password if set
    let admin_password_hash = config.admin_password.as_ref().map(|pw| bcrypt::hash(pw, 10).unwrap());

    // Ensure directories exist
    for dir in &["uploads", "branding", "quotes"] {
        let p = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("server").join(dir);
        std::fs::create_dir_all(&p).ok();
    }

    // Ensure admin user settings exist and migrate passwords
    {
        let conn = db.lock().unwrap();
        // Seed admin if needed
        if !config.admin_email.is_empty() {
            let existing: Option<String> = conn.query_row(
                "SELECT id FROM users WHERE email = ?1",
                rusqlite::params![config.admin_email],
                |r| r.get(0),
            ).ok();
            if existing.is_none() {
                if let Some(ref hash) = admin_password_hash {
                    conn.execute(
                        "INSERT OR IGNORE INTO users (id, email, password, name, active) VALUES ('__admin__', ?1, ?2, 'Admin', 1)",
                        rusqlite::params![config.admin_email, hash],
                    ).ok();
                }
            }
        }

        // Migrate plaintext passwords to encrypted (same as Node.js)
        let mut stmt = conn.prepare("SELECT user_id, key, value FROM user_settings WHERE key IN ('smtp_pass', 'imap_pass')").unwrap();
        let rows: Vec<(String, String, String)> = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
            .unwrap().filter_map(|r| r.ok()).collect();
        for (uid, key, value) in rows {
            if !value.is_empty() && !value.starts_with("enc:") {
                let encrypted = crypto::encrypt_value(&enc_key, &value);
                conn.execute("UPDATE user_settings SET value = ?1 WHERE user_id = ?2 AND key = ?3",
                    rusqlite::params![encrypted, uid, key]).ok();
                tracing::info!("[MIGRATION] Encrypted {} for user {}", key, uid);
            }
        }
    }

    let state = AppState {
        db,
        config: Arc::new(config.clone()),
        enc_key,
        admin_password_hash,
    };

    // CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // ─── Routes ─────────────────────────────────────────────────

    // Public routes (no auth)
    let public_routes = Router::new()
        .route("/api/login", post(routes::auth::login))
        .route("/api/register", post(routes::auth::register))
        .route("/api/site-config", get(routes::auth::site_config))
        .route("/api/oauth2/google/callback", get(routes::oauth2::google_callback))
        .route("/api/oauth2/microsoft/callback", get(routes::oauth2::microsoft_callback))
        .route("/api/branding/logo-file/{userId}/{filename}", get(routes::branding::serve_logo))
        .route("/api/attachments/{id}/download", get(routes::email::download_attachment))
        .route("/api/inbox-attachments/{id}/download", get(routes::inbox::download_inbox_attachment))
        .route("/api/sent-imap-attachments/{id}/download", get(routes::sent::download_sent_imap_attachment))
        .route("/api/stripe/webhook", post(routes::stripe_routes::webhook));

    // External API routes (API key auth, no JWT)
    let external_api = Router::new()
        .route("/api/v1/templates", get(routes::external_api::list_templates))
        .route("/api/v1/templates/{id}", get(routes::external_api::get_template))
        .route("/api/v1/contacts", get(routes::external_api::list_contacts).post(routes::external_api::create_contact))
        .route("/api/v1/contacts/{id}", get(routes::external_api::get_contact).put(routes::external_api::update_contact).delete(routes::external_api::delete_contact))
        .route("/api/v1/send", post(routes::external_api::send_email));

    // Authenticated routes
    let auth_routes = Router::new()
        // Auth
        .route("/api/setup-complete", post(routes::auth::setup_complete))
        // Features
        .route("/api/features", get(routes::admin::get_features))
        .route("/api/features/mfa", put(routes::admin::toggle_mfa))
        // OAuth2
        .route("/api/oauth2/{provider}/auth-url", get(routes::oauth2::get_auth_url))
        .route("/api/oauth2/status", get(routes::oauth2::oauth_status))
        .route("/api/oauth2/{provider}", delete(routes::oauth2::disconnect_oauth))
        // User settings
        .route("/api/env", get(routes::settings::get_env).put(routes::settings::put_env))
        .route("/api/test-smtp", get(routes::settings::test_smtp))
        .route("/api/subscription", get(routes::settings::get_subscription))
        .route("/api/change-password", post(routes::settings::change_password))
        .route("/api/account", delete(routes::settings::delete_account))
        .route("/api/download-token", get(routes::settings::download_token))
        // Branding
        .route("/api/branding", get(routes::branding::get_branding).put(routes::branding::put_branding))
        .route("/api/branding/logo", post(routes::branding::upload_logo))
        // Contacts
        .route("/api/contacts", get(routes::contacts::list_contacts).post(routes::contacts::create_contact))
        .route("/api/contacts/{id}", get(routes::contacts::get_contact).put(routes::contacts::update_contact).delete(routes::contacts::delete_contact))
        // Templates
        .route("/api/templates", get(routes::templates::list_templates).post(routes::templates::create_template))
        .route("/api/templates/{id}", put(routes::templates::update_template).delete(routes::templates::delete_template))
        // API Keys
        .route("/api/api-keys", get(routes::api_keys::list_api_keys).post(routes::api_keys::create_api_key))
        .route("/api/api-keys/{id}", delete(routes::api_keys::delete_api_key))
        .route("/api/api-keys/{id}/toggle", put(routes::api_keys::toggle_api_key))
        // Email
        .route("/api/send-email", post(routes::email::send_email))
        .route("/api/send-bulk", post(routes::email::send_bulk))
        .route("/api/emails/{id}", get(routes::email::get_email_detail))
        // Sent
        .route("/api/sent", get(routes::sent::list_sent))
        .route("/api/sent/sync", post(routes::sent::sync_sent))
        .route("/api/sent-imap/{id}", get(routes::sent::get_sent_imap))
        // Inbox
        .route("/api/inbox", get(routes::inbox::list_inbox))
        .route("/api/inbox/sync", post(routes::inbox::sync_inbox))
        .route("/api/inbox/{id}", get(routes::inbox::get_inbox_email).delete(routes::inbox::delete_inbox_email))
        // Quotes
        .route("/api/quotes", get(routes::quotes::list_quotes).post(routes::quotes::create_quote))
        .route("/api/quotes/{id}", get(routes::quotes::get_quote).put(routes::quotes::update_quote).delete(routes::quotes::delete_quote))
        .route("/api/quotes/{id}/status", patch(routes::quotes::update_quote_status))
        .route("/api/quotes/{id}/pdf", get(routes::quotes::get_quote_pdf))
        .route("/api/quotes/{id}/send", post(routes::quotes::send_quote))
        // Analytics
        .route("/api/analytics", get(routes::analytics::get_analytics))
        .route("/api/analytics/export/csv", get(routes::analytics::export_csv))
        .route("/api/analytics/export/pdf", get(routes::analytics::export_pdf))
        // Backup
        .route("/api/backup/export", get(routes::backup::export_backup))
        .route("/api/backup/import", post(routes::backup::import_backup))
        .route("/api/cleanup", post(routes::backup::cleanup))
        // Stripe
        .route("/api/stripe/create-checkout", post(routes::stripe_routes::create_checkout))
        .route("/api/stripe/portal", post(routes::stripe_routes::create_portal))
        .route("/api/stripe/prices", get(routes::stripe_routes::list_prices))
        .route_layer(axum_mw::from_fn_with_state(state.clone(), middleware::auth::authenticate));

    // Admin routes
    let admin_routes = Router::new()
        .route("/api/admin/settings", get(routes::admin::get_global_settings).put(routes::admin::put_global_settings))
        .route("/api/admin/users", get(routes::admin::list_users).post(routes::admin::create_user))
        .route("/api/admin/users/{id}", put(routes::admin::update_user).delete(routes::admin::delete_user))
        .route("/api/admin/users/{id}/impersonate", post(routes::admin::impersonate))
        .route("/api/admin/users/{id}/subscription", put(routes::admin::update_subscription))
        .route("/api/admin/users/{id}/features", put(routes::admin::update_features))
        .route("/api/admin/users/{id}/settings", get(routes::admin::get_user_settings_admin).put(routes::admin::put_user_settings_admin))
        .route_layer(axum_mw::from_fn(middleware::auth::admin_only))
        .route_layer(axum_mw::from_fn_with_state(state.clone(), middleware::auth::authenticate));

    // Combine all routes
    let app = Router::new()
        .merge(public_routes)
        .merge(external_api)
        .merge(auth_routes)
        .merge(admin_routes)
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024)) // 100MB
        .layer(cors)
        .with_state(state);

    // Serve static files (built frontend) if exists
    let client_dist = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("client").join("dist");
    let app = if client_dist.exists() {
        let serve_dir = tower_http::services::ServeDir::new(&client_dist)
            .fallback(tower_http::services::ServeFile::new(client_dist.join("index.html")));
        app.fallback_service(serve_dir)
    } else {
        app
    };

    let addr = format!("0.0.0.0:{}", port);
    tracing::info!("🚀 Pultify Rust server running on port {}", port);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
