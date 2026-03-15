use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub struct AppError {
    pub status: StatusCode,
    pub message: String,
}

impl AppError {
    pub fn new(status: StatusCode, msg: impl Into<String>) -> Self {
        Self { status, message: msg.into() }
    }
    pub fn bad_request(msg: impl Into<String>) -> Self { Self::new(StatusCode::BAD_REQUEST, msg) }
    pub fn unauthorized(msg: impl Into<String>) -> Self { Self::new(StatusCode::UNAUTHORIZED, msg) }
    pub fn forbidden(msg: impl Into<String>) -> Self { Self::new(StatusCode::FORBIDDEN, msg) }
    pub fn not_found(msg: impl Into<String>) -> Self { Self::new(StatusCode::NOT_FOUND, msg) }
    pub fn conflict(msg: impl Into<String>) -> Self { Self::new(StatusCode::CONFLICT, msg) }
    pub fn internal(msg: impl Into<String>) -> Self { Self::new(StatusCode::INTERNAL_SERVER_ERROR, msg) }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (self.status, Json(json!({ "error": self.message }))).into_response()
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::internal(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::bad_request(e.to_string())
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(_: jsonwebtoken::errors::Error) -> Self {
        AppError::unauthorized("Invalid token")
    }
}

impl From<bcrypt::BcryptError> for AppError {
    fn from(e: bcrypt::BcryptError) -> Self {
        AppError::internal(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::internal(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::internal(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
