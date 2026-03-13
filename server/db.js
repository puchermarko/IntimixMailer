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
`);

// ─── MIGRÁCIÓK ───

// Segéd: oszlop hozzáadása ha nem létezik
function addColumnIfMissing(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  }
}

// Contacts cím mezők
const addressCols = [
  ['company', "TEXT DEFAULT ''"], ['vat_id', "TEXT DEFAULT ''"],
  ['street', "TEXT DEFAULT ''"], ['street_number', "TEXT DEFAULT ''"],
  ['city', "TEXT DEFAULT ''"], ['zip', "TEXT DEFAULT ''"],
  ['country', "TEXT DEFAULT ''"], ['region', "TEXT DEFAULT ''"],
];
for (const [col, def] of addressCols) addColumnIfMissing('contacts', col, def);

// Quotes title mező
addColumnIfMissing('quotes', 'title', "TEXT DEFAULT ''");

// Template builder blocks persistence
addColumnIfMissing('custom_templates', 'blocks_json', "TEXT DEFAULT ''");

// Multi-tenant migráció: user_id hozzáadása meglévő táblákhoz
const tenantTables = ['contacts', 'email_log', 'inbox', 'sent_imap', 'custom_templates', 'api_keys', 'quotes'];
for (const table of tenantTables) {
  addColumnIfMissing(table, 'user_id', "TEXT NOT NULL DEFAULT ''");
}

// user_id indexek
const userIdIndexes = [
  ['idx_contacts_user', 'contacts', 'user_id'],
  ['idx_email_log_user', 'email_log', 'user_id'],
  ['idx_inbox_user', 'inbox', 'user_id'],
  ['idx_sent_imap_user', 'sent_imap', 'user_id'],
  ['idx_custom_templates_user', 'custom_templates', 'user_id'],
  ['idx_api_keys_user', 'api_keys', 'user_id'],
  ['idx_quotes_user', 'quotes', 'user_id'],
];
for (const [name, table, col] of userIdIndexes) {
  db.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${col})`);
}

// inbox uid is unique per user, not globally — replace old unique index
// (safe to run even if old index doesn't exist)
try { db.exec('DROP INDEX IF EXISTS idx_inbox_uid'); } catch {}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_user_uid ON inbox(user_id, uid)');
try { db.exec('DROP INDEX IF EXISTS idx_sent_imap_uid'); } catch {}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_sent_imap_user_uid ON sent_imap(user_id, uid)');

// contacts email must be unique per user, not globally — migrate table if old autoindexes exist
try {
  const autoIdx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='contacts' AND name LIKE 'sqlite_autoindex_contacts_%'").all();
  if (autoIdx.length > 0) {
    console.log('[DB MIGRATION] Recreating contacts table to remove global UNIQUE constraint on email...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS contacts_new (
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
      INSERT OR IGNORE INTO contacts_new SELECT id, user_id, name, email, phone, notes,
        COALESCE(company,''), COALESCE(vat_id,''), COALESCE(street,''), COALESCE(street_number,''),
        COALESCE(city,''), COALESCE(zip,''), COALESCE(country,''), COALESCE(region,''),
        created_at, updated_at FROM contacts;
      DROP TABLE contacts;
      ALTER TABLE contacts_new RENAME TO contacts;
    `);
    console.log('[DB MIGRATION] contacts table recreated successfully.');
  }
} catch (e) { console.error('[DB MIGRATION] contacts migration error:', e.message); }
try { db.exec('DROP INDEX IF EXISTS idx_contacts_user_email'); } catch {}
db.exec('CREATE UNIQUE INDEX idx_contacts_user_email ON contacts(user_id, email)');
db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id)');

// Setup wizard completed flag
addColumnIfMissing('users', 'setup_completed', 'INTEGER DEFAULT 0');

// Subscription fields on users table
const subscriptionCols = [
  ['subscription_status', "TEXT DEFAULT 'none'"],
  ['subscription_type', "TEXT DEFAULT ''"],
  ['trial_start', "TEXT DEFAULT ''"],
  ['trial_end', "TEXT DEFAULT ''"],
  ['subscription_start', "TEXT DEFAULT ''"],
  ['subscription_end', "TEXT DEFAULT ''"],
  ['stripe_customer_id', "TEXT DEFAULT ''"],
  ['stripe_subscription_id', "TEXT DEFAULT ''"],
];
for (const [col, def] of subscriptionCols) addColumnIfMissing('users', col, def);

// Per-user feature flags
addColumnIfMissing('users', 'enhanced_mail_enabled', 'INTEGER DEFAULT 0');
addColumnIfMissing('users', 'mfa_enabled', 'INTEGER DEFAULT 0');

// MFA tokens table for email-based MFA
db.exec(`
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
`);

// Cleanup expired MFA tokens on startup
try {
  const deleted = db.prepare("DELETE FROM mfa_tokens WHERE expires_at < datetime('now') OR used = 1").run();
  if (deleted.changes > 0) console.log(`[MFA] Cleaned up ${deleted.changes} expired/used MFA tokens.`);
} catch {}

// OAuth2 tokens table for Gmail/Outlook SMTP authentication
db.exec(`
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
`);

export default db;
