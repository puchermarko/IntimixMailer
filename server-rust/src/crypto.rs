use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use scrypt::{scrypt, Params};

/// Derive a 32-byte key from the encryption key string using scrypt (matching Node.js scryptSync)
pub fn derive_key(key_material: &str) -> [u8; 32] {
    let mut derived = [0u8; 32];
    let params = Params::new(15, 8, 1, 32).unwrap();
    scrypt(key_material.as_bytes(), b"intimix-salt", &params, &mut derived).unwrap();
    derived
}

/// Encrypt a plaintext string to format: enc:<iv_hex>:<tag_hex>:<ciphertext_hex>
/// Compatible with the Node.js AES-256-GCM encryption format
pub fn encrypt_value(key: &[u8; 32], plaintext: &str) -> String {
    if plaintext.is_empty() {
        return String::new();
    }
    let cipher = Aes256Gcm::new_from_slice(key).unwrap();
    let mut iv_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut iv_bytes);
    let nonce = Nonce::from_slice(&iv_bytes);

    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes()).unwrap();

    // AES-GCM appends the 16-byte tag to the ciphertext
    let ct_len = ciphertext.len() - 16;
    let encrypted = &ciphertext[..ct_len];
    let tag = &ciphertext[ct_len..];

    format!(
        "enc:{}:{}:{}",
        hex::encode(iv_bytes),
        hex::encode(tag),
        hex::encode(encrypted)
    )
}

/// Decrypt a value in format: enc:<iv_hex>:<tag_hex>:<ciphertext_hex>
/// Returns the original plaintext, or the input if not encrypted
pub fn decrypt_value(key: &[u8; 32], stored: &str) -> String {
    if !stored.starts_with("enc:") {
        return stored.to_string();
    }
    let parts: Vec<&str> = stored.splitn(4, ':').collect();
    if parts.len() != 4 {
        return stored.to_string();
    }

    let iv_bytes = match hex::decode(parts[1]) {
        Ok(v) => v,
        Err(_) => return stored.to_string(),
    };
    let tag_bytes = match hex::decode(parts[2]) {
        Ok(v) => v,
        Err(_) => return stored.to_string(),
    };
    let encrypted_bytes = match hex::decode(parts[3]) {
        Ok(v) => v,
        Err(_) => return stored.to_string(),
    };

    let cipher = Aes256Gcm::new_from_slice(key).unwrap();
    let nonce = Nonce::from_slice(&iv_bytes);

    // Reconstruct ciphertext with appended tag (as aes-gcm expects)
    let mut combined = encrypted_bytes;
    combined.extend_from_slice(&tag_bytes);

    match cipher.decrypt(nonce, combined.as_ref()) {
        Ok(plaintext) => String::from_utf8(plaintext).unwrap_or_else(|_| stored.to_string()),
        Err(_) => stored.to_string(),
    }
}

// We need the hex crate - add it as a dependency via base16ct or use a simple impl
mod hex {
    pub fn encode(data: impl AsRef<[u8]>) -> String {
        data.as_ref().iter().map(|b| format!("{:02x}", b)).collect()
    }

    pub fn decode(s: &str) -> Result<Vec<u8>, ()> {
        if s.len() % 2 != 0 {
            return Err(());
        }
        (0..s.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|_| ()))
            .collect()
    }
}
