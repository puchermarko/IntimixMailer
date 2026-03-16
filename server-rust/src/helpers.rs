use crate::config::SENSITIVE_SETTING_KEYS;
use crate::crypto::{decrypt_value, encrypt_value};
use rusqlite::{params, Connection};
use std::collections::HashMap;

/// Get all user settings as a HashMap, auto-decrypting sensitive values
pub fn get_user_settings(conn: &Connection, enc_key: &[u8; 32], user_id: &str) -> HashMap<String, String> {
    let mut stmt = conn.prepare("SELECT key, value FROM user_settings WHERE user_id = ?1").unwrap();
    let rows = stmt.query_map(params![user_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).unwrap();

    let mut settings = HashMap::new();
    for row in rows {
        if let Ok((key, value)) = row {
            let val = if SENSITIVE_SETTING_KEYS.contains(&key.as_str()) {
                decrypt_value(enc_key, &value)
            } else {
                value
            };
            settings.insert(key, val);
        }
    }
    settings
}

/// Upsert a user setting, auto-encrypting sensitive values
pub fn set_user_setting(conn: &Connection, enc_key: &[u8; 32], user_id: &str, key: &str, value: &str) {
    let stored = if SENSITIVE_SETTING_KEYS.contains(&key) {
        encrypt_value(enc_key, value)
    } else {
        value.to_string()
    };
    conn.execute(
        "INSERT INTO user_settings (user_id, key, value) VALUES (?1, ?2, ?3) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value",
        params![user_id, key, stored],
    ).ok();
}

/// Find contact by email for a given user
pub fn find_contact_by_email(conn: &Connection, email: &str, user_id: &str) -> Option<String> {
    conn.query_row(
        "SELECT id FROM contacts WHERE email = ?1 AND user_id = ?2",
        params![email, user_id],
        |row| row.get::<_, String>(0),
    ).ok()
}

/// Detect OAuth provider from SMTP/IMAP host
pub fn detect_oauth_provider(host: &str) -> Option<&'static str> {
    let h = host.to_lowercase();
    if h.contains("gmail") || h.contains("google") || h == "smtp.gmail.com" || h == "imap.gmail.com" {
        Some("google")
    } else if h.contains("outlook") || h.contains("office365") || h.contains("microsoft")
        || h == "smtp.office365.com" || h == "smtp-mail.outlook.com" || h == "outlook.office365.com"
    {
        Some("microsoft")
    } else {
        None
    }
}

/// Get stored OAuth2 tokens for a user + provider (auto-decrypts)
pub fn get_oauth_tokens(conn: &Connection, enc_key: &[u8; 32], user_id: &str, provider: &str) -> Option<OAuthTokens> {
    conn.query_row(
        "SELECT id, user_id, provider, email, access_token, refresh_token, expires_at, scope FROM oauth_tokens WHERE user_id = ?1 AND provider = ?2",
        params![user_id, provider],
        |row| {
            Ok(OAuthTokens {
                id: row.get(0)?,
                user_id: row.get(1)?,
                provider: row.get(2)?,
                email: row.get(3)?,
                access_token: row.get(4)?,
                refresh_token: row.get(5)?,
                expires_at: row.get(6)?,
                scope: row.get(7)?,
            })
        },
    ).ok().map(|mut t| {
        t.access_token = decrypt_value(enc_key, &t.access_token);
        t.refresh_token = decrypt_value(enc_key, &t.refresh_token);
        t
    })
}

/// Save/update OAuth2 tokens (auto-encrypts)
pub fn save_oauth_tokens(conn: &Connection, enc_key: &[u8; 32], user_id: &str, provider: &str, data: &OAuthSaveData) {
    let id = uuid::Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::seconds(data.expires_in.unwrap_or(3600) as i64))
        .unwrap()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();
    let enc_access = encrypt_value(enc_key, &data.access_token);
    let enc_refresh = encrypt_value(enc_key, &data.refresh_token);

    conn.execute(
        "INSERT INTO oauth_tokens (id, user_id, provider, email, access_token, refresh_token, expires_at, scope) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) \
         ON CONFLICT(user_id, provider) DO UPDATE SET \
           email = excluded.email, \
           access_token = excluded.access_token, \
           refresh_token = CASE WHEN excluded.refresh_token = '' THEN oauth_tokens.refresh_token ELSE excluded.refresh_token END, \
           expires_at = excluded.expires_at, \
           scope = excluded.scope, \
           updated_at = datetime('now')",
        params![id, user_id, provider, data.email, enc_access, enc_refresh, expires_at, data.scope],
    ).ok();
}

#[derive(Debug, Clone)]
pub struct OAuthTokens {
    pub id: String,
    pub user_id: String,
    pub provider: String,
    pub email: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: String,
    pub scope: String,
}

#[derive(Debug, Clone)]
pub struct OAuthSaveData {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: Option<i64>,
    pub email: String,
    pub scope: String,
}

/// Get a valid OAuth2 access token, refreshing if expired.
/// Takes pre-fetched tokens so the caller can drop the DB lock before calling this async fn.
/// Returns (access_token, Option<OAuthSaveData>) — if OAuthSaveData is Some, caller should save it.
pub async fn get_valid_access_token(
    tokens: &OAuthTokens,
    config: &crate::config::Config,
    provider: &str,
) -> std::result::Result<(String, Option<OAuthSaveData>), String> {
    // Check if token is still valid (with 5 min buffer)
    if let Ok(expires_at) = chrono::NaiveDateTime::parse_from_str(&tokens.expires_at, "%Y-%m-%d %H:%M:%S") {
        let now = chrono::Utc::now().naive_utc();
        if expires_at > now + chrono::Duration::minutes(5) {
            return Ok((tokens.access_token.clone(), None));
        }
    }

    // Token expired — refresh it
    let client = reqwest::Client::new();
    let refreshed: serde_json::Value = if provider == "google" {
        let gcid = config.google_client_id.as_deref().unwrap_or("");
        let gcs = config.google_client_secret.as_deref().unwrap_or("");
        client.post("https://oauth2.googleapis.com/token")
            .form(&[
                ("client_id", gcid),
                ("client_secret", gcs),
                ("refresh_token", tokens.refresh_token.as_str()),
                ("grant_type", "refresh_token"),
            ])
            .send().await.map_err(|e| e.to_string())?
            .json().await.map_err(|e| e.to_string())?
    } else if provider == "microsoft" {
        let mcid = config.microsoft_client_id.as_deref().unwrap_or("");
        let mcs = config.microsoft_client_secret.as_deref().unwrap_or("");
        client.post("https://login.microsoftonline.com/common/oauth2/v2.0/token")
            .form(&[
                ("client_id", mcid),
                ("client_secret", mcs),
                ("refresh_token", tokens.refresh_token.as_str()),
                ("grant_type", "refresh_token"),
                ("scope", "https://outlook.office365.com/SMTP.Send https://outlook.office365.com/IMAP.AccessAsUser.All offline_access openid email"),
            ])
            .send().await.map_err(|e| e.to_string())?
            .json().await.map_err(|e| e.to_string())?
    } else {
        return Err(format!("Unknown OAuth provider: {}", provider));
    };

    if let Some(err) = refreshed.get("error") {
        return Err(format!("Token refresh failed: {}", err));
    }

    let new_access = refreshed["access_token"].as_str().unwrap_or("").to_string();
    let new_refresh = refreshed["refresh_token"].as_str().unwrap_or("").to_string();
    let expires_in = refreshed["expires_in"].as_i64();
    let scope = refreshed["scope"].as_str().unwrap_or(&tokens.scope).to_string();

    let save_data = OAuthSaveData {
        access_token: new_access.clone(),
        refresh_token: new_refresh,
        expires_in,
        email: tokens.email.clone(),
        scope,
    };

    Ok((new_access, Some(save_data)))
}

/// Format money for Hungarian locale
pub fn format_money(amount: f64, currency: &str) -> String {
    if currency == "HUF" {
        format!("{} Ft", (amount.round() as i64).to_string()
            .as_bytes()
            .rchunks(3)
            .rev()
            .map(|c| std::str::from_utf8(c).unwrap())
            .collect::<Vec<_>>()
            .join("\u{a0}"))
    } else {
        format!("{:.2} €", amount)
    }
}

/// Log an email send event
pub fn log_email(
    conn: &Connection,
    user_id: &str,
    contact_id: Option<&str>,
    recipient_email: &str,
    subject: &str,
    html: &str,
    message_id: &str,
) -> String {
    let email_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO email_log (id, user_id, contact_id, recipient_email, subject, html, message_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![email_id, user_id, contact_id, recipient_email, subject, html, message_id],
    ).ok();
    email_id
}
