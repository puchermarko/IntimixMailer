import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'data.db'));

// WAL mód a jobb teljesítményért, meg foreign keys be
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Na itt jönnek a táblák - ez az egész adatbázis struktúra
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS email_log (
    id TEXT PRIMARY KEY,
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

  CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_uid ON inbox(uid);
  CREATE INDEX IF NOT EXISTS idx_inbox_from ON inbox(from_address);
  CREATE INDEX IF NOT EXISTS idx_inbox_contact ON inbox(contact_id);
  CREATE INDEX IF NOT EXISTS idx_inbox_attachments_inbox ON inbox_attachments(inbox_id);

  CREATE TABLE IF NOT EXISTS sent_imap (
    id TEXT PRIMARY KEY,
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

  CREATE UNIQUE INDEX IF NOT EXISTS idx_sent_imap_uid ON sent_imap(uid);
  CREATE INDEX IF NOT EXISTS idx_sent_imap_to ON sent_imap(to_address);
  CREATE INDEX IF NOT EXISTS idx_sent_imap_contact ON sent_imap(contact_id);
  CREATE INDEX IF NOT EXISTS idx_sent_imap_att ON sent_imap_attachments(sent_id);

  CREATE TABLE IF NOT EXISTS custom_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Custom',
    subject TEXT DEFAULT '',
    html TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
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
`);

export default db;
