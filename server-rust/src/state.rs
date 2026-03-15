use crate::config::Config;
use crate::db::Db;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub config: Arc<Config>,
    pub enc_key: [u8; 32],
    pub admin_password_hash: Option<String>,
}
