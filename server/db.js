import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'data.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
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
`);

export default db;
