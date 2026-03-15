use std::sync::LazyLock;

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub jwt_secret: String,
    pub admin_email: String,
    pub admin_password: Option<String>,
    pub encryption_key: String,
    pub stripe_secret_key: Option<String>,
    pub stripe_webhook_secret: Option<String>,
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub google_redirect_uri: Option<String>,
    pub microsoft_client_id: Option<String>,
    pub microsoft_client_secret: Option<String>,
    pub microsoft_redirect_uri: Option<String>,
    pub mfa_smtp_host: Option<String>,
    pub mfa_smtp_port: Option<u16>,
    pub mfa_smtp_user: Option<String>,
    pub mfa_smtp_pass: Option<String>,
    pub cors_origins: Vec<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(3001),
            jwt_secret: std::env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            admin_email: std::env::var("ADMIN_EMAIL").unwrap_or_default(),
            admin_password: std::env::var("ADMIN_PASSWORD").ok(),
            encryption_key: std::env::var("ENCRYPTION_KEY").unwrap_or_else(|_| {
                eprintln!("[SECURITY WARNING] ENCRYPTION_KEY is not set — falling back to JWT_SECRET.");
                std::env::var("JWT_SECRET").unwrap_or_default()
            }),
            stripe_secret_key: std::env::var("STRIPE_SECRET_KEY").ok(),
            stripe_webhook_secret: std::env::var("STRIPE_WEBHOOK_SECRET").ok(),
            google_client_id: std::env::var("GOOGLE_CLIENT_ID").ok(),
            google_client_secret: std::env::var("GOOGLE_CLIENT_SECRET").ok(),
            google_redirect_uri: std::env::var("GOOGLE_REDIRECT_URI").ok(),
            microsoft_client_id: std::env::var("MICROSOFT_CLIENT_ID").ok(),
            microsoft_client_secret: std::env::var("MICROSOFT_CLIENT_SECRET").ok(),
            microsoft_redirect_uri: std::env::var("MICROSOFT_REDIRECT_URI").ok(),
            mfa_smtp_host: std::env::var("MFA_SMTP_HOST").ok(),
            mfa_smtp_port: std::env::var("MFA_SMTP_PORT").ok().and_then(|p| p.parse().ok()),
            mfa_smtp_user: std::env::var("MFA_SMTP_USER").ok(),
            mfa_smtp_pass: std::env::var("MFA_SMTP_PASS").ok(),
            cors_origins: vec![
                "https://marketing.intimix.hu".into(),
                "https://pult.lakicsfesto.com".into(),
                "https://pultify.hu".into(),
            ],
        }
    }
}

pub static SENSITIVE_SETTING_KEYS: LazyLock<Vec<&str>> = LazyLock::new(|| vec!["smtp_pass", "imap_pass"]);

pub static USER_SETTING_KEYS: LazyLock<Vec<&str>> = LazyLock::new(|| vec![
    "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_name",
    "imap_host", "imap_port", "imap_user", "imap_pass", "auto_sync",
]);
