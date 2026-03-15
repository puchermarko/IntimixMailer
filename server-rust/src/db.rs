use rusqlite::{Connection, params};
use std::sync::{Arc, Mutex};

pub type Db = Arc<Mutex<Connection>>;

pub fn init_db(db_path: &str) -> Db {
    let conn = Connection::open(db_path).expect("Failed to open database");
    conn.pragma_update(None, "journal_mode", "WAL").unwrap();
    conn.pragma_update(None, "foreign_keys", "ON").unwrap();

    create_tables(&conn);
    run_migrations(&conn);

    Arc::new(Mutex::new(conn))
}

fn create_tables(conn: &Connection) {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            name TEXT DEFAULT '',
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '',
            UNIQUE(user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            company TEXT DEFAULT '',
            vat_id TEXT DEFAULT '',
            street TEXT DEFAULT '',
            street_number TEXT DEFAULT '',
            city TEXT DEFAULT '',
            zip TEXT DEFAULT '',
            country TEXT DEFAULT '',
            region TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS email_log (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            contact_id TEXT,
            recipient_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            html TEXT NOT NULL,
            sent_at TEXT DEFAULT (datetime('now')),
            message_id TEXT,
            status TEXT DEFAULT 'sent',
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            email_log_id TEXT NOT NULL,
            contact_id TEXT,
            filename TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size INTEGER NOT NULL,
            stored_path TEXT NOT NULL,
            uploaded_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (email_log_id) REFERENCES email_log(id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_email_log_contact ON email_log(contact_id);
        CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log(recipient_email);
        CREATE INDEX IF NOT EXISTS idx_attachments_contact ON attachments(contact_id);
        CREATE INDEX IF NOT EXISTS idx_attachments_email ON attachments(email_log_id);

        CREATE TABLE IF NOT EXISTS inbox (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            uid INTEGER NOT NULL,
            message_id TEXT,
            from_address TEXT NOT NULL,
            from_name TEXT DEFAULT '',
            to_address TEXT DEFAULT '',
            subject TEXT DEFAULT '',
            text_body TEXT DEFAULT '',
            html_body TEXT DEFAULT '',
            date TEXT,
            flags TEXT DEFAULT '',
            contact_id TEXT,
            has_attachments INTEGER DEFAULT 0,
            fetched_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS inbox_attachments (
            id TEXT PRIMARY KEY,
            inbox_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size INTEGER NOT NULL,
            stored_path TEXT NOT NULL,
            FOREIGN KEY (inbox_id) REFERENCES inbox(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_inbox_from ON inbox(from_address);
        CREATE INDEX IF NOT EXISTS idx_inbox_contact ON inbox(contact_id);
        CREATE INDEX IF NOT EXISTS idx_inbox_attachments_inbox ON inbox_attachments(inbox_id);

        CREATE TABLE IF NOT EXISTS sent_imap (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            uid INTEGER NOT NULL,
            message_id TEXT,
            from_address TEXT NOT NULL,
            from_name TEXT DEFAULT '',
            to_address TEXT DEFAULT '',
            subject TEXT DEFAULT '',
            text_body TEXT DEFAULT '',
            html_body TEXT DEFAULT '',
            date TEXT,
            contact_id TEXT,
            has_attachments INTEGER DEFAULT 0,
            fetched_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS sent_imap_attachments (
            id TEXT PRIMARY KEY,
            sent_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size INTEGER NOT NULL,
            stored_path TEXT NOT NULL,
            FOREIGN KEY (sent_id) REFERENCES sent_imap(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sent_imap_to ON sent_imap(to_address);
        CREATE INDEX IF NOT EXISTS idx_sent_imap_contact ON sent_imap(contact_id);
        CREATE INDEX IF NOT EXISTS idx_sent_imap_att ON sent_imap_attachments(sent_id);

        CREATE TABLE IF NOT EXISTS custom_templates (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'Custom',
            subject TEXT DEFAULT '',
            html TEXT DEFAULT '',
            blocks_json TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL,
            key TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now')),
            last_used_at TEXT,
            active INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS quotes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT '',
            quote_number TEXT NOT NULL,
            title TEXT DEFAULT '',
            contact_id TEXT,
            contact_name TEXT DEFAULT '',
            contact_email TEXT DEFAULT '',
            contact_phone TEXT DEFAULT '',
            contact_address TEXT DEFAULT '',
            contact_vat TEXT DEFAULT '',
            currency TEXT DEFAULT 'HUF',
            vat_rate REAL DEFAULT 27,
            subtotal REAL DEFAULT 0,
            vat_amount REAL DEFAULT 0,
            total REAL DEFAULT 0,
            notes TEXT DEFAULT '',
            status TEXT DEFAULT 'draft',
            valid_until TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS quote_items (
            id TEXT PRIMARY KEY,
            quote_id TEXT NOT NULL,
            description TEXT NOT NULL,
            quantity REAL DEFAULT 1,
            unit TEXT DEFAULT 'db',
            unit_price REAL DEFAULT 0,
            total REAL DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_quotes_contact ON quotes(contact_id);
        CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

        CREATE TABLE IF NOT EXISTS mfa_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_mfa_tokens_user ON mfa_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_mfa_tokens_token ON mfa_tokens(token);

        CREATE TABLE IF NOT EXISTS oauth_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            email TEXT NOT NULL DEFAULT '',
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            scope TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_user_provider ON oauth_tokens(user_id, provider);
    ").expect("Failed to create tables");
}

fn run_migrations(conn: &Connection) {
    // Add user_id indexes
    let indexes = [
        ("idx_contacts_user", "contacts", "user_id"),
        ("idx_email_log_user", "email_log", "user_id"),
        ("idx_inbox_user", "inbox", "user_id"),
        ("idx_sent_imap_user", "sent_imap", "user_id"),
        ("idx_custom_templates_user", "custom_templates", "user_id"),
        ("idx_api_keys_user", "api_keys", "user_id"),
        ("idx_quotes_user", "quotes", "user_id"),
    ];
    for (name, table, col) in indexes {
        let _ = conn.execute_batch(&format!(
            "CREATE INDEX IF NOT EXISTS {name} ON {table}({col})"
        ));
    }

    // Unique indexes
    let _ = conn.execute_batch("DROP INDEX IF EXISTS idx_inbox_uid");
    let _ = conn.execute_batch("CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_user_uid ON inbox(user_id, uid)");
    let _ = conn.execute_batch("DROP INDEX IF EXISTS idx_sent_imap_uid");
    let _ = conn.execute_batch("CREATE UNIQUE INDEX IF NOT EXISTS idx_sent_imap_user_uid ON sent_imap(user_id, uid)");

    // Contacts user+email unique
    let _ = conn.execute_batch("CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_email ON contacts(user_id, email)");

    // Add missing columns safely
    add_column_if_missing(conn, "users", "setup_completed", "INTEGER DEFAULT 0");
    add_column_if_missing(conn, "users", "subscription_status", "TEXT DEFAULT 'none'");
    add_column_if_missing(conn, "users", "subscription_type", "TEXT DEFAULT ''");
    add_column_if_missing(conn, "users", "trial_start", "TEXT DEFAULT ''");
    add_column_if_missing(conn, "users", "trial_end", "TEXT DEFAULT ''");
    add_column_if_missing(conn, "users", "subscription_start", "TEXT DEFAULT ''");
    add_column_if_missing(conn, "users", "subscription_end", "TEXT DEFAULT ''");
    add_column_if_missing(conn, "users", "stripe_customer_id", "TEXT DEFAULT ''");
    add_column_if_missing(conn, "users", "stripe_subscription_id", "TEXT DEFAULT ''");
    add_column_if_missing(conn, "users", "enhanced_mail_enabled", "INTEGER DEFAULT 0");
    add_column_if_missing(conn, "users", "mfa_enabled", "INTEGER DEFAULT 0");

    // Cleanup expired MFA tokens
    let deleted = conn.execute(
        "DELETE FROM mfa_tokens WHERE expires_at < datetime('now') OR used = 1",
        [],
    ).unwrap_or(0);
    if deleted > 0 {
        tracing::info!("[MFA] Cleaned up {} expired/used MFA tokens.", deleted);
    }
}

fn add_column_if_missing(conn: &Connection, table: &str, col: &str, def: &str) {
    let cols: Vec<String> = conn
        .prepare(&format!("PRAGMA table_info({})", table))
        .unwrap()
        .query_map([], |row| row.get::<_, String>(1))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();
    if !cols.contains(&col.to_string()) {
        let _ = conn.execute_batch(&format!("ALTER TABLE {} ADD COLUMN {} {}", table, col, def));
    }
}

// ─── Helper functions for DB operations ─────────────────────

pub fn get_app_setting(conn: &Connection, key: &str, default: &str) -> String {
    conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    ).unwrap_or_else(|_| default.to_string())
}

pub fn set_app_setting(conn: &Connection, key: &str, value: &str) {
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    ).ok();
}
