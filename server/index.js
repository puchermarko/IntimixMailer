import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import PDFDocument from 'pdfkit';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ASSETS_DIR = path.join(__dirname, 'assets');

// Map of known CID names to their file paths and allowed domain
const CID_IMAGE_MAP = {
  'intimix-logo-png': { path: path.join(ASSETS_DIR, 'logo-header.png'), contentType: 'image/png', domain: 'intimix.hu' },
};

// Scan HTML for cid: references and return inline attachments for nodemailer
// Only attaches images whose domain matches the user's SMTP domain
function getCidAttachments(html, smtpDomain) {
  const cidRefs = html.match(/cid:([a-zA-Z0-9_-]+)/g) || [];
  const seen = new Set();
  const inlineAttachments = [];
  const userDomain = (smtpDomain || '').toLowerCase();
  for (const ref of cidRefs) {
    const cid = ref.replace('cid:', '');
    if (seen.has(cid)) continue;
    seen.add(cid);
    const mapping = CID_IMAGE_MAP[cid];
    if (!mapping || !fs.existsSync(mapping.path)) continue;
    if (mapping.domain && mapping.domain !== userDomain) continue;
    inlineAttachments.push({
      filename: path.basename(mapping.path),
      path: mapping.path,
      cid: cid,
      contentType: mapping.contentType,
      contentDisposition: 'inline',
    });
  }
  return inlineAttachments;
}

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors({
  origin: ['https://marketing.intimix.hu', 'https://pult.lakicsfesto.com', 'https://pultify.hu'],
  credentials: true
}));

// ─── RATE LIMITING ──────────────────────────────────────────
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Túl sok bejelentkezési kísérlet. Próbáld újra 15 perc múlva.' }, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'Túl sok regisztrációs kísérlet. Próbáld újra később.' }, standardHeaders: true, legacyHeaders: false });
const sendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Túl sok email küldés. Próbáld újra később.' }, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'API rate limit exceeded. Try again later.' }, standardHeaders: true, legacyHeaders: false });

const { JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, STRIPE_SECRET_KEY, ENCRYPTION_KEY } = process.env;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const ADMIN_PASSWORD_HASH = ADMIN_PASSWORD ? bcrypt.hashSync(ADMIN_PASSWORD, 10) : null;

// ─── AES-256-GCM ENCRYPTION FOR SENSITIVE SETTINGS ──────────
const ENC_ALGORITHM = 'aes-256-gcm';
if (!ENCRYPTION_KEY) {
  console.warn('[SECURITY WARNING] ENCRYPTION_KEY is not set in .env — falling back to JWT_SECRET. Set a dedicated ENCRYPTION_KEY for production!');
}
const ENC_KEY = scryptSync(ENCRYPTION_KEY || JWT_SECRET, 'intimix-salt', 32);
const SENSITIVE_SETTING_KEYS = ['smtp_pass', 'imap_pass'];

function encryptValue(plaintext) {
  if (!plaintext) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENC_ALGORITHM, ENC_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptValue(stored) {
  if (!stored || !stored.startsWith('enc:')) return stored;
  try {
    const [, ivHex, tagHex, encrypted] = stored.split(':');
    const decipher = createDecipheriv(ENC_ALGORITHM, ENC_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return stored;
  }
}

// ─── STRIPE WEBHOOK (must be before express.json()) ─────────
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // Without webhook secret, parse the event directly (dev mode)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (userId && session.subscription) {
          db.prepare(`UPDATE users SET 
            subscription_status = 'active', 
            subscription_type = 'paid', 
            stripe_customer_id = ?, 
            stripe_subscription_id = ?, 
            subscription_start = datetime('now'), 
            updated_at = datetime('now') 
          WHERE id = ?`).run(session.customer, session.subscription, userId);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const user = db.prepare('SELECT id FROM users WHERE stripe_subscription_id = ?').get(sub.id);
        if (user) {
          const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'active' : 'inactive';
          db.prepare(`UPDATE users SET subscription_status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, user.id);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = db.prepare('SELECT id FROM users WHERE stripe_subscription_id = ?').get(sub.id);
        if (user) {
          db.prepare(`UPDATE users SET subscription_status = 'expired', stripe_subscription_id = '', updated_at = datetime('now') WHERE id = ?`).run(user.id);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const user = db.prepare('SELECT id FROM users WHERE stripe_customer_id = ?').get(invoice.customer);
        if (user) {
          db.prepare(`UPDATE users SET subscription_status = 'past_due', updated_at = datetime('now') WHERE id = ?`).run(user.id);
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.use(express.json());

// ─── MIGRATE PLAIN-TEXT PASSWORDS TO BCRYPT ─────────────────
(() => {
  const users = db.prepare('SELECT id, password FROM users').all();
  let migrated = 0;
  for (const u of users) {
    if (!u.password.startsWith('$2')) {
      const hashed = bcrypt.hashSync(u.password, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, u.id);
      migrated++;
    }
  }
  if (migrated > 0) console.log(`[security] Migrated ${migrated} plain-text password(s) to bcrypt.`);
})();

// ─── MIGRATE PLAIN-TEXT CREDENTIALS TO ENCRYPTED ────────────
(() => {
  let migrated = 0;
  for (const key of SENSITIVE_SETTING_KEYS) {
    const rows = db.prepare('SELECT id, user_id, value FROM user_settings WHERE key = ?').all(key);
    for (const r of rows) {
      if (r.value && !r.value.startsWith('enc:')) {
        const encrypted = encryptValue(r.value);
        db.prepare('UPDATE user_settings SET value = ? WHERE id = ?').run(encrypted, r.id);
        migrated++;
      }
    }
  }
  if (migrated > 0) console.log(`[security] Encrypted ${migrated} plain-text credential(s) in user_settings.`);
})();

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────

// JWT hitelesítés middleware
// Token payload: { role: 'admin'|'user', userId: string, email: string, impersonating?: string }
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    // Effective user: if admin is impersonating, use the impersonated user's id
    req.userId = decoded.impersonating || decoded.userId || '';
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin-only middleware
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// Subscription check middleware — blocks users without active/trial subscription
function requireSubscription(req, res, next) {
  // Admin always passes
  if (req.user.role === 'admin') return next();
  const user = db.prepare('SELECT subscription_status, trial_end FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(403).json({ error: 'Nincs aktív előfizetés. Kérjük, aktiváld az előfizetésed.' });
  let status = user.subscription_status || 'none';
  // Auto-expire trial
  if (status === 'trial' && user.trial_end) {
    const now = new Date();
    const end = new Date(user.trial_end + 'Z');
    if (now > end) {
      db.prepare("UPDATE users SET subscription_status = 'expired', updated_at = datetime('now') WHERE id = ?").run(req.userId);
      status = 'expired';
    }
  }
  if (status === 'active' || status === 'trial') return next();
  return res.status(403).json({ error: 'Nincs aktív előfizetés. Kérjük, aktiváld az előfizetésed.' });
}

// ─── GLOBAL APP SETTINGS ─────────────────────────────────────

function getAppSetting(key, defaultValue = '') {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setAppSetting(key, value) {
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

// ─── PER-USER HELPERS ───────────────────────────────────────

// Get user settings as object (auto-decrypts sensitive values)
function getUserSettings(userId) {
  const rows = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(userId);
  const settings = {};
  for (const r of rows) {
    settings[r.key] = SENSITIVE_SETTING_KEYS.includes(r.key) ? decryptValue(r.value) : r.value;
  }
  return settings;
}

// Upsert a user setting (auto-encrypts sensitive values)
function setUserSetting(userId, key, value) {
  const stored = SENSITIVE_SETTING_KEYS.includes(key) ? encryptValue(value) : value;
  db.prepare('INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value').run(userId, key, stored);
}

// Create SMTP transporter for a user
function getUserTransporter(userId) {
  const s = getUserSettings(userId);
  if (!s.smtp_host || !s.smtp_user || !s.smtp_pass) return null;
  return nodemailer.createTransport({
    host: s.smtp_host,
    port: Number(s.smtp_port) || 465,
    secure: (Number(s.smtp_port) || 465) === 465,
    auth: { user: s.smtp_user, pass: s.smtp_pass },
    tls: { rejectUnauthorized: false }
  });
}

// Create IMAP client for a user
function getUserImapClient(userId) {
  const s = getUserSettings(userId);
  if (!s.imap_host || !s.imap_user || !s.imap_pass) return null;
  return new ImapFlow({
    host: s.imap_host,
    port: Number(s.imap_port) || 993,
    secure: true,
    auth: { user: s.imap_user, pass: s.imap_pass },
    tls: { rejectUnauthorized: false },
    logger: false
  });
}

// Segéd: megkeresi a kontaktot email alapján, visszaadja az id-t ha van
function findContactByEmail(email, userId) {
  const row = db.prepare('SELECT id FROM contacts WHERE email = ? AND user_id = ?').get(email, userId);
  return row ? row.id : null;
}

// Segéd: email naplózása és csatolmányok mentése a szerverre
function logEmail({ userId, contactId, recipientEmail, subject, html, messageId, files }) {
  const emailId = randomUUID();
  db.prepare(
    'INSERT INTO email_log (id, user_id, contact_id, recipient_email, subject, html, message_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(emailId, userId, contactId, recipientEmail, subject, html, messageId || '');

  if (files && files.length > 0) {
    const insertAtt = db.prepare(
      'INSERT INTO attachments (id, email_log_id, contact_id, filename, mimetype, size, stored_path) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const file of files) {
      const attId = randomUUID();
      const ext = path.extname(file.originalname) || '';
      const storedName = `${attId}${ext}`;
      const storedPath = path.join(UPLOADS_DIR, storedName);
      fs.writeFileSync(storedPath, file.buffer);
      insertAtt.run(attId, emailId, contactId, file.originalname, file.mimetype, file.size, storedName);
    }
  }
  return emailId;
}

// ─── LOGIN ──────────────────────────────────────────────────

app.post('/api/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Admin login (from .env)
  if (email === ADMIN_EMAIL && ADMIN_PASSWORD_HASH && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    const token = jwt.sign({ role: 'admin', userId: '__admin__', email }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, email, role: 'admin', name: 'Admin' });
  }

  // User login (from DB)
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
  if (user && bcrypt.compareSync(password, user.password)) {
    // Auto-expire trial at login time
    let subStatus = user.subscription_status || 'none';
    if (subStatus === 'trial' && user.trial_end) {
      const now = new Date();
      const end = new Date(user.trial_end + 'Z');
      if (now > end) {
        db.prepare("UPDATE users SET subscription_status = 'expired', updated_at = datetime('now') WHERE id = ?").run(user.id);
        subStatus = 'expired';
      }
    }
    const token = jwt.sign({ role: 'user', userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, email: user.email, role: 'user', name: user.name, userId: user.id, subscription_status: subStatus, setup_completed: !!user.setup_completed });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// ─── REGISTRATION ────────────────────────────────────────────

app.post('/api/register', registerLimiter, (req, res) => {
  // Check if registration is enabled
  if (getAppSetting('registration_enabled', 'true') !== 'true') {
    return res.status(403).json({ error: 'A regisztráció jelenleg nem elérhető.' });
  }

  const { name, email, password, formLoadedAt } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Név, email és jelszó megadása kötelező.' });

  // Anti-bot: form must have been open for at least 5 seconds
  if (!formLoadedAt || (Date.now() - formLoadedAt) < 5000) {
    return res.status(429).json({ error: 'Túl gyors regisztráció. Kérjük, próbáld újra.' });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Érvénytelen email cím.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Ezzel az email címmel már létezik fiók.' });

  const id = randomUUID();
  const trialStart = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, email, password, name, subscription_status, trial_start, trial_end) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, email, hashedPassword, name, 'trial', trialStart, trialEnd);

  // Auto-login after registration
  const token = jwt.sign({ role: 'user', userId: id, email }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ token, email, role: 'user', name, userId: id, subscription_status: 'trial', setup_completed: false });
});

// Mark setup wizard as completed (or skipped)
app.post('/api/setup-complete', authenticate, (req, res) => {
  db.prepare("UPDATE users SET setup_completed = 1, updated_at = datetime('now') WHERE id = ?").run(req.userId);
  res.json({ success: true });
});

// ─── PUBLIC SITE CONFIG (no auth) ────────────────────────────
// Returns settings needed by the frontend before login
app.get('/api/site-config', (req, res) => {
  res.json({
    landing_page_enabled: getAppSetting('landing_page_enabled', 'true') === 'true',
    registration_enabled: getAppSetting('registration_enabled', 'true') === 'true',
  });
});

// ─── ADMIN: GLOBAL SETTINGS ────────────────────────────────

app.get('/api/admin/global-settings', authenticate, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM app_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

app.put('/api/admin/global-settings', authenticate, adminOnly, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'Settings object required' });
  for (const [key, value] of Object.entries(settings)) {
    setAppSetting(key, value);
  }
  res.json({ success: true });
});

// ─── ADMIN: USER MANAGEMENT ────────────────────────────────

// List all users
app.get('/api/admin/users', authenticate, adminOnly, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.active, u.created_at, u.updated_at,
      u.subscription_status, u.subscription_type, u.trial_start, u.trial_end, u.subscription_start, u.subscription_end,
      (SELECT COUNT(*) FROM contacts WHERE user_id = u.id) as contact_count,
      (SELECT COUNT(*) FROM email_log WHERE user_id = u.id) + (SELECT COUNT(*) FROM sent_imap WHERE user_id = u.id) as email_count,
      (SELECT COUNT(*) FROM quotes WHERE user_id = u.id) as quote_count
    FROM users u ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// Create user
app.post('/api/admin/users', authenticate, adminOnly, (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'User with this email already exists' });
  const id = randomUUID();
  const hashedPw = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)').run(id, email, hashedPw, name || '');
  const user = db.prepare('SELECT id, email, name, active, created_at FROM users WHERE id = ?').get(id);
  res.status(201).json(user);
});

// Update user
app.put('/api/admin/users/:id', authenticate, adminOnly, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { email, password, name, active } = req.body;
  if (email && email !== user.email) {
    const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
    if (dup) return res.status(409).json({ error: 'Another user with this email already exists' });
  }
  const updatedPw = password ? bcrypt.hashSync(password, 10) : user.password;
  db.prepare("UPDATE users SET email = ?, password = ?, name = ?, active = ?, updated_at = datetime('now') WHERE id = ?").run(
    email || user.email, updatedPw, name ?? user.name, active ?? user.active, req.params.id
  );
  const updated = db.prepare('SELECT id, email, name, active, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete user and all their data
app.delete('/api/admin/users/:id', authenticate, adminOnly, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Delete all user data
  const uid = req.params.id;
  db.prepare('DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE user_id = ?)').run(uid);
  db.prepare('DELETE FROM quotes WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM attachments WHERE email_log_id IN (SELECT id FROM email_log WHERE user_id = ?)').run(uid);
  db.prepare('DELETE FROM email_log WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM inbox_attachments WHERE inbox_id IN (SELECT id FROM inbox WHERE user_id = ?)').run(uid);
  db.prepare('DELETE FROM inbox WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM sent_imap_attachments WHERE sent_id IN (SELECT id FROM sent_imap WHERE user_id = ?)').run(uid);
  db.prepare('DELETE FROM sent_imap WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM contacts WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM custom_templates WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM users WHERE id = ?').run(uid);
  res.json({ success: true });
});

// Impersonate user — admin gets a new token acting as that user
app.post('/api/admin/impersonate/:id', authenticate, adminOnly, (req, res) => {
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = jwt.sign({
    role: 'admin', userId: '__admin__', email: req.user.email,
    impersonating: user.id, impersonatingName: user.name, impersonatingEmail: user.email
  }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user });
});

// Get user settings (admin)
app.get('/api/admin/users/:id/settings', authenticate, adminOnly, (req, res) => {
  const settings = getUserSettings(req.params.id);
  res.json(settings);
});

// Update user settings (admin)
app.put('/api/admin/users/:id/settings', authenticate, adminOnly, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'Settings object required' });
  for (const [key, value] of Object.entries(settings)) {
    setUserSetting(req.params.id, key, value || '');
  }
  res.json({ success: true });
});

// Admin: subscription management
app.put('/api/admin/users/:id/subscription', authenticate, adminOnly, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { action } = req.body;

  if (action === 'activate') {
    db.prepare("UPDATE users SET subscription_status = 'active', subscription_type = 'paid', subscription_start = datetime('now'), subscription_end = '', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  } else if (action === 'deactivate') {
    db.prepare("UPDATE users SET subscription_status = 'inactive', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  } else if (action === 'start_trial') {
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    db.prepare("UPDATE users SET subscription_status = 'trial', subscription_type = 'trial', trial_start = datetime('now'), trial_end = ?, updated_at = datetime('now') WHERE id = ?").run(trialEnd, req.params.id);
  } else if (action === 'stop_trial') {
    db.prepare("UPDATE users SET subscription_status = 'inactive', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  } else {
    return res.status(400).json({ error: 'Invalid action. Use: activate, deactivate, start_trial, stop_trial' });
  }

  const updated = db.prepare('SELECT id, email, name, active, subscription_status, subscription_type, trial_start, trial_end, subscription_start, subscription_end FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// User: get own subscription info
app.get('/api/subscription', authenticate, (req, res) => {
  if (req.user.role === 'admin') return res.json({ status: 'admin', type: 'admin' });
  const user = db.prepare('SELECT subscription_status, subscription_type, trial_start, trial_end, subscription_start, subscription_end FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Check if trial has expired
  if (user.subscription_status === 'trial' && user.trial_end) {
    const now = new Date();
    const end = new Date(user.trial_end + 'Z');
    if (now > end) {
      db.prepare("UPDATE users SET subscription_status = 'expired', updated_at = datetime('now') WHERE id = ?").run(req.userId);
      user.subscription_status = 'expired';
    }
  }
  res.json({
    status: user.subscription_status || 'none',
    type: user.subscription_type || '',
    trial_start: user.trial_start || '',
    trial_end: user.trial_end || '',
    subscription_start: user.subscription_start || '',
    subscription_end: user.subscription_end || '',
    has_stripe: !!(db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(req.userId)?.stripe_customer_id),
  });
});

// ─── STRIPE FIZETÉS ─────────────────────────────────────────

// Create Stripe Checkout Session for monthly subscription
app.post('/api/stripe/create-checkout', authenticate, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nincs konfigurálva' });
  try {
    const user = db.prepare('SELECT id, email, name, stripe_customer_id FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'Felhasználó nem található' });

    // Reuse existing Stripe customer or create new one
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      db.prepare("UPDATE users SET stripe_customer_id = ?, updated_at = datetime('now') WHERE id = ?").run(customerId, user.id);
    }

    // Look up or create a monthly price for the product
    const { price_id } = req.body;
    if (!price_id) return res.status(400).json({ error: 'price_id szükséges' });

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${origin}/dashboard/settings?tab=subscription&stripe=success`,
      cancel_url: `${origin}/dashboard/settings?tab=subscription&stripe=cancelled`,
      metadata: { user_id: user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Open Stripe Customer Portal for managing subscription
app.post('/api/stripe/portal', authenticate, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nincs konfigurálva' });
  try {
    const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(req.userId);
    if (!user?.stripe_customer_id) return res.status(400).json({ error: 'Nincs Stripe fiók társítva' });

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:5173';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${origin}/dashboard/settings?tab=subscription`,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List available Stripe prices for subscription
app.get('/api/stripe/prices', authenticate, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nincs konfigurálva' });
  try {
    const prices = await stripe.prices.list({
      active: true,
      type: 'recurring',
      expand: ['data.product'],
      limit: 10,
    });
    const items = prices.data
      .filter(p => p.product?.active !== false)
      .map(p => ({
        id: p.id,
        product_name: p.product?.name || 'Előfizetés',
        unit_amount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval,
        interval_count: p.recurring?.interval_count,
      }));
    res.json({ prices: items });
  } catch (err) {
    console.error('Stripe prices error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── KAPCSOLATOK CRUD - itt kezeled a kontaktokat ───────────────────

// Összes kapcsolat listázása küldött/fogadott/fájl számokkal
app.get('/api/contacts', authenticate, (req, res) => {
  const contacts = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM email_log WHERE contact_id = c.id)
        + (SELECT COUNT(*) FROM sent_imap WHERE contact_id = c.id) as email_count,
      (SELECT COUNT(*) FROM inbox WHERE contact_id = c.id) as received_count,
      (SELECT COUNT(*) FROM attachments WHERE contact_id = c.id)
        + (SELECT COUNT(*) FROM inbox_attachments ia JOIN inbox i ON ia.inbox_id = i.id WHERE i.contact_id = c.id)
        + (SELECT COUNT(*) FROM sent_imap_attachments sa JOIN sent_imap s ON sa.sent_id = s.id WHERE s.contact_id = c.id) as attachment_count
    FROM contacts c WHERE c.user_id = ? ORDER BY c.name ASC
  `).all(req.userId);
  res.json(contacts);
});

// Egy kapcsolat részletei az összes emailjével és fájljával
app.get('/api/contacts/:id', authenticate, (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const emails = db.prepare(
    'SELECT id, subject, sent_at, message_id, status FROM email_log WHERE contact_id = ? ORDER BY sent_at DESC'
  ).all(req.params.id);

  const attachments = db.prepare(
    'SELECT a.id, a.filename, a.mimetype, a.size, a.uploaded_at, a.email_log_id, e.subject as email_subject FROM attachments a LEFT JOIN email_log e ON a.email_log_id = e.id WHERE a.contact_id = ? ORDER BY a.uploaded_at DESC'
  ).all(req.params.id);

  const received = db.prepare(
    'SELECT id, subject, from_address, from_name, date, has_attachments FROM inbox WHERE contact_id = ? ORDER BY date DESC'
  ).all(req.params.id);

  const sentImap = db.prepare(
    'SELECT id, subject, to_address, from_name, date, has_attachments FROM sent_imap WHERE contact_id = ? ORDER BY date DESC'
  ).all(req.params.id);

  // Gather inbox attachments for this contact
  const inboxIds = received.filter(r => r.has_attachments).map(r => r.id);
  let inboxAttachments = [];
  if (inboxIds.length > 0) {
    const placeholders = inboxIds.map(() => '?').join(',');
    inboxAttachments = db.prepare(
      `SELECT a.id, a.filename, a.mimetype, a.size, a.inbox_id, i.subject as email_subject, i.date as uploaded_at, 'inbox' as source
       FROM inbox_attachments a LEFT JOIN inbox i ON a.inbox_id = i.id
       WHERE a.inbox_id IN (${placeholders}) ORDER BY i.date DESC`
    ).all(...inboxIds);
  }

  // Gather sent_imap attachments for this contact
  const sentImapIds = sentImap.filter(s => s.has_attachments).map(s => s.id);
  let sentImapAttachments = [];
  if (sentImapIds.length > 0) {
    const placeholders = sentImapIds.map(() => '?').join(',');
    sentImapAttachments = db.prepare(
      `SELECT a.id, a.filename, a.mimetype, a.size, a.sent_id, s.subject as email_subject, s.date as uploaded_at, 'sent_imap' as source
       FROM sent_imap_attachments a LEFT JOIN sent_imap s ON a.sent_id = s.id
       WHERE a.sent_id IN (${placeholders}) ORDER BY s.date DESC`
    ).all(...sentImapIds);
  }

  // Merge all attachments with source markers
  const allAttachments = [
    ...attachments.map(a => ({ ...a, source: 'local' })),
    ...inboxAttachments,
    ...sentImapAttachments
  ];

  res.json({ ...contact, emails, attachments: allAttachments, received, sentImap });
});

// Új kapcsolat létrehozása
app.post('/api/contacts', authenticate, requireSubscription, (req, res) => {
  const { name, email, phone, notes, company, vat_id, street, street_number, city, zip, country, region } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const existing = db.prepare('SELECT id FROM contacts WHERE email = ? AND user_id = ?').get(email, req.userId);
  if (existing) return res.status(409).json({ error: 'A contact with this email already exists' });

  const id = randomUUID();
  db.prepare('INSERT INTO contacts (id, user_id, name, email, phone, notes, company, vat_id, street, street_number, city, zip, country, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.userId, name, email, phone || '', notes || '', company || '', vat_id || '', street || '', street_number || '', city || '', zip || '', country || '', region || ''
  );
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.status(201).json(contact);
});

// Kapcsolat módosítása
app.put('/api/contacts/:id', authenticate, requireSubscription, (req, res) => {
  const { name, email, phone, notes } = req.body;
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  if (email && email !== existing.email) {
    const dup = db.prepare('SELECT id FROM contacts WHERE email = ? AND id != ? AND user_id = ?').get(email, req.params.id, req.userId);
    if (dup) return res.status(409).json({ error: 'Another contact with this email already exists' });
  }

  const { company, vat_id, street, street_number, city, zip, country, region } = req.body;
  db.prepare(
    "UPDATE contacts SET name = ?, email = ?, phone = ?, notes = ?, company = ?, vat_id = ?, street = ?, street_number = ?, city = ?, zip = ?, country = ?, region = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name || existing.name, email || existing.email, phone ?? existing.phone, notes ?? existing.notes, company ?? existing.company ?? '', vat_id ?? existing.vat_id ?? '', street ?? existing.street ?? '', street_number ?? existing.street_number ?? '', city ?? existing.city ?? '', zip ?? existing.zip ?? '', country ?? existing.country ?? '', region ?? existing.region ?? '', req.params.id);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  res.json(contact);
});

// Kapcsolat törlése az összes emailjével és fájljával együtt
app.delete('/api/contacts/:id', authenticate, requireSubscription, (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  // Delete stored attachment files
  const atts = db.prepare('SELECT stored_path FROM attachments WHERE contact_id = ?').all(req.params.id);
  for (const att of atts) {
    const fp = path.join(UPLOADS_DIR, att.stored_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  db.prepare('DELETE FROM attachments WHERE contact_id = ?').run(req.params.id);
  db.prepare('DELETE FROM email_log WHERE contact_id = ?').run(req.params.id);
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── CSATOLMÁNY KISZOLGÁLÁS - fájlok letöltése ──────────────

// Short-lived download tokens (5 min) — avoids leaking full JWT in URLs
app.get('/api/download-token', authenticate, (req, res) => {
  const dlToken = jwt.sign({ purpose: 'download', userId: req.userId }, JWT_SECRET, { expiresIn: '5m' });
  res.json({ token: dlToken });
});

// Helper: extract userId from token (query param or header), matching authenticate logic
function getUserIdFromToken(req) {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.impersonating || decoded.userId || null;
  } catch {
    return null;
  }
}

app.get('/api/attachments/:id/download', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const att = db.prepare(
    'SELECT a.* FROM attachments a JOIN email_log e ON a.email_log_id = e.id WHERE a.id = ? AND e.user_id = ?'
  ).get(req.params.id, userId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const fp = path.join(UPLOADS_DIR, att.stored_path);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found on disk' });

  res.setHeader('Content-Type', att.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${att.filename}"`);
  res.sendFile(fp);
});

// ─── EGY ADOTT EMAIL RÉSZLETEI ──────────────────────────────

app.get('/api/emails/:id', authenticate, (req, res) => {
  const email = db.prepare('SELECT * FROM email_log WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!email) return res.status(404).json({ error: 'Email not found' });

  const attachments = db.prepare(
    'SELECT id, filename, mimetype, size, uploaded_at FROM attachments WHERE email_log_id = ?'
  ).all(req.params.id);

  res.json({ ...email, attachments });
});

// ─── ELKÜLDÖTT LEVELEK - helyi + IMAP összefésülve ──────────

// Elküldött levelek listázása (helyi napló + IMAP kimenő)
app.get('/api/sent', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let searchClause = '';
  let params = [];
  if (search) {
    const s = `%${search}%`;
    searchClause = 'WHERE subject LIKE ? OR recipient LIKE ?';
    params = [s, s];
  }

  // Union local sent + IMAP sent (scoped by user_id)
  const uid = req.userId;
  const countSql = `SELECT COUNT(*) as count FROM (
    SELECT id FROM email_log e WHERE e.user_id = ? ${search ? 'AND (e.subject LIKE ? OR e.recipient_email LIKE ?)' : ''}
    UNION ALL
    SELECT id FROM sent_imap s WHERE s.user_id = ? ${search ? 'AND (s.subject LIKE ? OR s.to_address LIKE ?)' : ''}
  )`;
  const countParams = search ? [uid, `%${search}%`, `%${search}%`, uid, `%${search}%`, `%${search}%`] : [uid, uid];
  const total = db.prepare(countSql).get(...countParams);

  const dataSql = `
    SELECT id, recipient, subject, date, status, contact_id, contact_name, has_attachments, source FROM (
      SELECT e.id, e.recipient_email as recipient, e.subject, e.sent_at as date, e.status, e.contact_id,
        c.name as contact_name, (SELECT COUNT(*) FROM attachments WHERE email_log_id = e.id) as has_attachments, 'local' as source
      FROM email_log e LEFT JOIN contacts c ON e.contact_id = c.id
      WHERE e.user_id = ? ${search ? 'AND (e.subject LIKE ? OR e.recipient_email LIKE ?)' : ''}
      UNION ALL
      SELECT s.id, s.to_address as recipient, s.subject, s.date, 'sent' as status, s.contact_id,
        c.name as contact_name, s.has_attachments, 'imap' as source
      FROM sent_imap s LEFT JOIN contacts c ON s.contact_id = c.id
      WHERE s.user_id = ? ${search ? 'AND (s.subject LIKE ? OR s.to_address LIKE ?)' : ''}
    ) ORDER BY date DESC LIMIT ? OFFSET ?
  `;
  const dataParams = search ? [uid, `%${search}%`, `%${search}%`, uid, `%${search}%`, `%${search}%`, limit, offset] : [uid, uid, limit, offset];
  const emails = db.prepare(dataSql).all(...dataParams);

  res.json({ emails, total: total.count, page, limit });
});

// Egy IMAP-ról szinkronizált kimenő levél részletei
app.get('/api/sent-imap/:id', authenticate, (req, res) => {
  const email = db.prepare(`
    SELECT s.*, c.name as contact_name
    FROM sent_imap s LEFT JOIN contacts c ON s.contact_id = c.id
    WHERE s.id = ? AND s.user_id = ?
  `).get(req.params.id, req.userId);
  if (!email) return res.status(404).json({ error: 'Email not found' });

  const attachments = db.prepare(
    'SELECT id, filename, mimetype, size FROM sent_imap_attachments WHERE sent_id = ?'
  ).all(req.params.id);

  res.json({ ...email, attachments });
});

// IMAP kimenő levél csatolmányának letöltése
app.get('/api/sent-imap-attachments/:id/download', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const att = db.prepare(
    'SELECT a.* FROM sent_imap_attachments a JOIN sent_imap s ON a.sent_id = s.id WHERE a.id = ? AND s.user_id = ?'
  ).get(req.params.id, userId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const fp = path.join(UPLOADS_DIR, att.stored_path);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found on disk' });

  res.setHeader('Content-Type', att.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${att.filename}"`);
  res.sendFile(fp);
});

// Kimenő levelek szinkronizálása IMAP-ról + kapcsolatokhoz rendelés
app.post('/api/sent/sync', authenticate, requireSubscription, async (req, res) => {
  const client = getUserImapClient(req.userId);
  if (!client) return res.status(400).json({ error: 'IMAP nincs konfigurálva. Állítsd be a Beállításoknál.' });
  try {
    await client.connect();

    // Try common Sent folder names
    const sentFolders = ['Sent', 'INBOX.Sent', 'Sent Messages', 'Sent Items', 'INBOX.Sent Messages'];
    let sentFolder = null;
    const mailboxes = await client.list();
    for (const mb of mailboxes) {
      if (mb.specialUse === '\\Sent' || sentFolders.includes(mb.path)) {
        sentFolder = mb.path;
        break;
      }
    }
    if (!sentFolder) {
      // Fallback: try each name
      for (const name of sentFolders) {
        try {
          const lock = await client.getMailboxLock(name);
          lock.release();
          sentFolder = name;
          break;
        } catch {}
      }
    }
    if (!sentFolder) {
      return res.status(400).json({ error: 'Could not find Sent folder on IMAP server' });
    }

    const lock = await client.getMailboxLock(sentFolder);
    try {
      const lastRow = db.prepare('SELECT MAX(uid) as maxUid FROM sent_imap WHERE user_id = ?').get(req.userId);
      const maxUid = lastRow?.maxUid || 0;

      let newCount = 0;
      let messages;
      if (maxUid > 0) {
        messages = client.fetch({ uid: `${maxUid + 1}:*` }, { uid: true, envelope: true, source: true });
      } else {
        messages = client.fetch('1:*', { uid: true, envelope: true, source: true });
      }

      for await (const msg of messages) {
        const exists = db.prepare('SELECT id FROM sent_imap WHERE uid = ? AND user_id = ?').get(msg.uid, req.userId);
        if (exists) continue;

        const parsed = await simpleParser(msg.source);
        const fromAddr = parsed.from?.value?.[0]?.address || '';
        const fromName = parsed.from?.value?.[0]?.name || '';
        const toAddr = parsed.to?.value?.map(v => v.address).join(', ') || '';
        const subject = parsed.subject || '(No subject)';
        const textBody = parsed.text || '';
        const htmlBody = parsed.html || '';
        const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();
        const messageId = parsed.messageId || '';
        const hasAttachments = (parsed.attachments && parsed.attachments.length > 0) ? 1 : 0;

        // Link to contact by recipient
        const toAddresses = parsed.to?.value?.map(v => v.address) || [];
        let contactId = null;
        for (const addr of toAddresses) {
          contactId = findContactByEmail(addr, req.userId);
          if (contactId) break;
        }

        const sentId = randomUUID();
        db.prepare(
          'INSERT INTO sent_imap (id, user_id, uid, message_id, from_address, from_name, to_address, subject, text_body, html_body, date, contact_id, has_attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(sentId, req.userId, msg.uid, messageId, fromAddr, fromName, toAddr, subject, textBody, htmlBody, date, contactId, hasAttachments);

        if (parsed.attachments && parsed.attachments.length > 0) {
          const insertAtt = db.prepare(
            'INSERT INTO sent_imap_attachments (id, sent_id, filename, mimetype, size, stored_path) VALUES (?, ?, ?, ?, ?, ?)'
          );
          for (const att of parsed.attachments) {
            const attId = randomUUID();
            const ext = path.extname(att.filename || '') || '';
            const storedName = `sent_${attId}${ext}`;
            fs.writeFileSync(path.join(UPLOADS_DIR, storedName), att.content);
            insertAtt.run(attId, sentId, att.filename || 'attachment', att.contentType || 'application/octet-stream', att.size || att.content.length, storedName);
          }
        }

        newCount++;
      }

      // Retroactively link unlinked sent_imap to contacts
      const unlinkedImap = db.prepare('SELECT id, to_address FROM sent_imap WHERE contact_id IS NULL AND user_id = ?').all(req.userId);
      let linked = 0;
      const updateImapContact = db.prepare('UPDATE sent_imap SET contact_id = ? WHERE id = ?');
      for (const msg of unlinkedImap) {
        const addrs = msg.to_address.split(',').map(a => a.trim());
        for (const addr of addrs) {
          const cid = findContactByEmail(addr, req.userId);
          if (cid) { updateImapContact.run(cid, msg.id); linked++; break; }
        }
      }

      // Also link local email_log
      const unlinkedLocal = db.prepare('SELECT id, recipient_email FROM email_log WHERE contact_id IS NULL AND user_id = ?').all(req.userId);
      const updateLocalContact = db.prepare('UPDATE email_log SET contact_id = ? WHERE id = ?');
      const updateAttContact = db.prepare('UPDATE attachments SET contact_id = ? WHERE email_log_id = ? AND contact_id IS NULL');
      for (const msg of unlinkedLocal) {
        const cid = findContactByEmail(msg.recipient_email, req.userId);
        if (cid) { updateLocalContact.run(cid, msg.id); updateAttContact.run(cid, msg.id); linked++; }
      }

      res.json({ success: true, newEmails: newCount, linked });
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('IMAP sent sync error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    try { await client.logout(); } catch {}
  }
});

// ─── EMAIL KÜLDÉS - naplózással együtt ───────────────────────

app.post('/api/send-email', authenticate, requireSubscription, sendLimiter, upload.array('attachments', 5), async (req, res) => {
  try {
    const { to, subject, html, cc, bcc, inReplyTo } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const userTransporter = getUserTransporter(req.userId);
    if (!userTransporter) return res.status(400).json({ error: 'SMTP nincs konfigurálva. Állítsd be a Beállításoknál.' });
    const userSettings = getUserSettings(req.userId);
    const fromName = userSettings.smtp_from_name || userSettings.smtp_user || '';

    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));

    // Auto-attach inline CID images referenced in the HTML (domain-gated)
    const smtpDomain = (userSettings.smtp_user || '').includes('@') ? userSettings.smtp_user.split('@')[1] : '';
    const cidAttachments = getCidAttachments(html, smtpDomain);

    const mailOptions = {
      from: `"${fromName}" <${userSettings.smtp_user}>`,
      to,
      subject,
      html,
      attachments: [...attachments, ...cidAttachments]
    };

    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;
    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = [inReplyTo];
    }

    const info = await userTransporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to} — MessageId: ${info.messageId}`);

    // Log email
    const contactId = findContactByEmail(to, req.userId);
    logEmail({
      userId: req.userId,
      contactId,
      recipientEmail: to,
      subject,
      html,
      messageId: info.messageId,
      files: req.files || []
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── TÖMEGES EMAIL KÜLDÉS - mindenkit végigmegy és naplóz ───

app.post('/api/send-bulk', authenticate, requireSubscription, sendLimiter, upload.array('attachments', 5), async (req, res) => {
  try {
    const { recipients, subject, html } = req.body;
    const parsed = JSON.parse(recipients);

    if (!parsed?.length || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userTransporter = getUserTransporter(req.userId);
    if (!userTransporter) return res.status(400).json({ error: 'SMTP nincs konfigurálva. Állítsd be a Beállításoknál.' });
    const userSettings = getUserSettings(req.userId);
    const fromName = userSettings.smtp_from_name || userSettings.smtp_user || '';

    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));

    // Auto-attach inline CID images referenced in the HTML (domain-gated)
    const smtpDomain = (userSettings.smtp_user || '').includes('@') ? userSettings.smtp_user.split('@')[1] : '';
    const cidAttachments = getCidAttachments(html, smtpDomain);

    const results = [];
    for (const recipient of parsed) {
      try {
        const personalizedHtml = html
          .replace(/\{\{name\}\}/gi, recipient.name || '')
          .replace(/\{\{email\}\}/gi, recipient.email || '')
          .replace(/\{\{order_id\}\}/gi, recipient.order_id || '')
          .replace(/\{\{tracking_number\}\}/gi, recipient.tracking_number || '')
          .replace(/\{\{tracking_url\}\}/gi, recipient.tracking_url || '')
          .replace(/\{\{delivery_time\}\}/gi, recipient.delivery_time || '')
          .replace(/\{\{delivery_phone\}\}/gi, recipient.delivery_phone || '');

        const personalizedSubject = subject
          .replace(/\{\{name\}\}/gi, recipient.name || '')
          .replace(/\{\{order_id\}\}/gi, recipient.order_id || '')
          .replace(/\{\{tracking_number\}\}/gi, recipient.tracking_number || '');

        const info = await userTransporter.sendMail({
          from: `"${fromName}" <${userSettings.smtp_user}>`,
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          attachments: [...attachments, ...cidAttachments]
        });

        // Log email per recipient
        const contactId = findContactByEmail(recipient.email, req.userId);
        logEmail({
          userId: req.userId,
          contactId,
          recipientEmail: recipient.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          messageId: info.messageId,
          files: req.files || []
        });

        results.push({ email: recipient.email, status: 'sent' });
        console.log(`📧 Bulk email sent to ${recipient.email}`);
      } catch (err) {
        results.push({ email: recipient.email, status: 'failed', error: err.message });
        console.error(`Failed to send to ${recipient.email}:`, err.message);
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('Bulk send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── BEJÖVŐ LEVELEK (IMAP) - itt jön be minden ami érkezik ─

// Bejövő szinkronizálás - lehúzza az új leveleket IMAP-ról és eltárolja
app.post('/api/inbox/sync', authenticate, requireSubscription, async (req, res) => {
  const client = getUserImapClient(req.userId);
  if (!client) return res.status(400).json({ error: 'IMAP nincs konfigurálva. Állítsd be a Beállításoknál.' });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Get highest UID we already have
      const lastRow = db.prepare('SELECT MAX(uid) as maxUid FROM inbox WHERE user_id = ?').get(req.userId);
      const maxUid = lastRow?.maxUid || 0;

      // Use UID search to find new messages
      let newCount = 0;
      let messages;
      if (maxUid > 0) {
        messages = client.fetch({ uid: `${maxUid + 1}:*` }, {
          uid: true,
          envelope: true,
          source: true,
          flags: true
        });
      } else {
        messages = client.fetch('1:*', {
          uid: true,
          envelope: true,
          source: true,
          flags: true
        });
      }

      for await (const msg of messages) {
        // Skip if we already have this UID
        const exists = db.prepare('SELECT id FROM inbox WHERE uid = ? AND user_id = ?').get(msg.uid, req.userId);
        if (exists) continue;

        const parsed = await simpleParser(msg.source);
        const fromAddr = parsed.from?.value?.[0]?.address || '';
        const fromName = parsed.from?.value?.[0]?.name || '';
        const toAddr = parsed.to?.value?.map(v => v.address).join(', ') || '';
        const subject = parsed.subject || '(No subject)';
        const textBody = parsed.text || '';
        const htmlBody = parsed.html || '';
        const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();
        const messageId = parsed.messageId || '';
        const flags = Array.from(msg.flags || []).join(',');
        const hasAttachments = (parsed.attachments && parsed.attachments.length > 0) ? 1 : 0;

        // Link to contact if exists
        const contactId = findContactByEmail(fromAddr, req.userId);

        const inboxId = randomUUID();
        db.prepare(
          'INSERT INTO inbox (id, user_id, uid, message_id, from_address, from_name, to_address, subject, text_body, html_body, date, flags, contact_id, has_attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(inboxId, req.userId, msg.uid, messageId, fromAddr, fromName, toAddr, subject, textBody, htmlBody, date, flags, contactId, hasAttachments);

        // Store attachments
        if (parsed.attachments && parsed.attachments.length > 0) {
          const insertAtt = db.prepare(
            'INSERT INTO inbox_attachments (id, inbox_id, filename, mimetype, size, stored_path) VALUES (?, ?, ?, ?, ?, ?)'
          );
          for (const att of parsed.attachments) {
            const attId = randomUUID();
            const ext = path.extname(att.filename || '') || '';
            const storedName = `inbox_${attId}${ext}`;
            const storedPath = path.join(UPLOADS_DIR, storedName);
            fs.writeFileSync(storedPath, att.content);
            insertAtt.run(attId, inboxId, att.filename || 'attachment', att.contentType || 'application/octet-stream', att.size || att.content.length, storedName);
          }
        }

        newCount++;
      }

      // Retroactively link unlinked inbox emails to contacts
      const unlinked = db.prepare('SELECT id, from_address FROM inbox WHERE contact_id IS NULL AND user_id = ?').all(req.userId);
      let linked = 0;
      const updateContact = db.prepare('UPDATE inbox SET contact_id = ? WHERE id = ?');
      for (const msg of unlinked) {
        const cid = findContactByEmail(msg.from_address, req.userId);
        if (cid) {
          updateContact.run(cid, msg.id);
          linked++;
        }
      }

      // Also link sent emails (email_log) that aren't linked yet
      const unlinkedSent = db.prepare('SELECT id, recipient_email FROM email_log WHERE contact_id IS NULL AND user_id = ?').all(req.userId);
      const updateSentContact = db.prepare('UPDATE email_log SET contact_id = ? WHERE id = ?');
      const updateAttContact = db.prepare('UPDATE attachments SET contact_id = ? WHERE email_log_id = ? AND contact_id IS NULL');
      for (const msg of unlinkedSent) {
        const cid = findContactByEmail(msg.recipient_email, req.userId);
        if (cid) {
          updateSentContact.run(cid, msg.id);
          updateAttContact.run(cid, msg.id);
          linked++;
        }
      }

      res.json({ success: true, newEmails: newCount, linked });
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('IMAP sync error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    try { await client.logout(); } catch {}
  }
});

// Bejövő levelek listázása lapozhatóan
app.get('/api/inbox', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  const userWhere = 'WHERE i.user_id = ?';
  let where = userWhere;
  let params = [req.userId];
  if (search) {
    where += ' AND (i.subject LIKE ? OR i.from_address LIKE ? OR i.from_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM inbox i ${where}`).get(...params);
  const emails = db.prepare(`
    SELECT i.id, i.uid, i.from_address, i.from_name, i.to_address, i.subject, i.date, i.flags, i.has_attachments, i.contact_id,
      c.name as contact_name
    FROM inbox i
    LEFT JOIN contacts c ON i.contact_id = c.id
    ${where}
    ORDER BY i.date DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ emails, total: total.count, page, limit });
});

// Egy bejövő levél részletei
app.get('/api/inbox/:id', authenticate, (req, res) => {
  const email = db.prepare(`
    SELECT i.*, c.name as contact_name
    FROM inbox i
    LEFT JOIN contacts c ON i.contact_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.id, req.userId);
  if (!email) return res.status(404).json({ error: 'Email not found' });

  const attachments = db.prepare(
    'SELECT id, filename, mimetype, size FROM inbox_attachments WHERE inbox_id = ?'
  ).all(req.params.id);

  res.json({ ...email, attachments });
});

// Bejövő levél csatolmányának letöltése
app.get('/api/inbox-attachments/:id/download', (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const att = db.prepare(
    'SELECT a.* FROM inbox_attachments a JOIN inbox i ON a.inbox_id = i.id WHERE a.id = ? AND i.user_id = ?'
  ).get(req.params.id, userId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const fp = path.join(UPLOADS_DIR, att.stored_path);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found on disk' });

  res.setHeader('Content-Type', att.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${att.filename}"`);
  res.sendFile(fp);
});

// Bejövő levél törlése a csatolmányaival együtt
app.delete('/api/inbox/:id', authenticate, (req, res) => {
  const email = db.prepare('SELECT id FROM inbox WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!email) return res.status(404).json({ error: 'Email not found' });

  // Delete stored attachment files
  const atts = db.prepare('SELECT stored_path FROM inbox_attachments WHERE inbox_id = ?').all(req.params.id);
  for (const att of atts) {
    const fp = path.join(UPLOADS_DIR, att.stored_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  db.prepare('DELETE FROM inbox_attachments WHERE inbox_id = ?').run(req.params.id);
  db.prepare('DELETE FROM inbox WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── EGYÉNI SABLONOK CRUD - saját email sablonok kezelése ────

app.get('/api/templates', authenticate, (req, res) => {
  const templates = db.prepare('SELECT * FROM custom_templates WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId);
  res.json(templates);
});

app.post('/api/templates', authenticate, (req, res) => {
  const { name, description, category, subject, html } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = randomUUID();
  db.prepare('INSERT INTO custom_templates (id, user_id, name, description, category, subject, html) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, name, description || '', category || 'Custom', subject || '', html || '');
  res.json({ id, name, description, category, subject, html });
});

app.put('/api/templates/:id', authenticate, (req, res) => {
  const { name, description, category, subject, html } = req.body;
  const existing = db.prepare('SELECT id FROM custom_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  db.prepare('UPDATE custom_templates SET name = ?, description = ?, category = ?, subject = ?, html = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(name, description || '', category || 'Custom', subject || '', html || '', req.params.id);
  res.json({ success: true });
});

app.delete('/api/templates/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT id FROM custom_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  db.prepare('DELETE FROM custom_templates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── API KULCS KEZELÉS - külső appoknak generálsz kulcsot itt 

app.get('/api/api-keys', authenticate, (req, res) => {
  const keys = db.prepare('SELECT id, name, key, created_at, last_used_at, active FROM api_keys WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(keys);
});

app.post('/api/api-keys', authenticate, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = randomUUID();
  const key = 'imx_' + randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 16);
  db.prepare('INSERT INTO api_keys (id, user_id, name, key) VALUES (?, ?, ?, ?)').run(id, req.userId, name, key);
  res.json({ id, name, key });
});

app.delete('/api/api-keys/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

app.put('/api/api-keys/:id/toggle', authenticate, (req, res) => {
  const existing = db.prepare('SELECT active FROM api_keys WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'API key not found' });
  db.prepare('UPDATE api_keys SET active = ? WHERE id = ?').run(existing.active ? 0 : 1, req.params.id);
  res.json({ success: true, active: !existing.active });
});

// ─── KÜLSŐ API - ezt használják a Laravel/Rust appok ─────────

function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) return res.status(401).json({ error: 'API key required. Pass via X-Api-Key header or api_key query parameter.' });
  const row = db.prepare('SELECT id, user_id, active FROM api_keys WHERE key = ?').get(apiKey);
  if (!row) return res.status(401).json({ error: 'Invalid API key' });
  if (!row.active) return res.status(403).json({ error: 'API key is disabled' });
  // Check subscription status for the API key owner
  const user = db.prepare('SELECT subscription_status, trial_end FROM users WHERE id = ?').get(row.user_id);
  if (user) {
    let status = user.subscription_status || 'none';
    if (status === 'trial' && user.trial_end) {
      if (new Date() > new Date(user.trial_end + 'Z')) status = 'expired';
    }
    if (status !== 'active' && status !== 'trial') {
      return res.status(403).json({ error: 'Subscription inactive. API access requires an active subscription.' });
    }
  }
  db.prepare('UPDATE api_keys SET last_used_at = datetime(\'now\') WHERE id = ?').run(row.id);
  req.userId = row.user_id;
  next();
}

// Külső API: egyéni sablonok listázása
app.get('/api/v1/templates', apiLimiter, authenticateApiKey, (req, res) => {
  const custom = db.prepare('SELECT id, name, description, category, subject, html, created_at, updated_at FROM custom_templates WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId);
  res.json({ templates: custom });
});

// Külső API: egy sablon lekérdezése
app.get('/api/v1/templates/:id', apiLimiter, authenticateApiKey, (req, res) => {
  const template = db.prepare('SELECT * FROM custom_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

// Külső API: kapcsolatok listázása lapozhatóan
app.get('/api/v1/contacts', apiLimiter, authenticateApiKey, (req, res) => {
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  let where = 'WHERE c.user_id = ?';
  let params = [req.userId];
  if (search) {
    where += ' AND (c.name LIKE ? OR c.email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM contacts c ${where}`).get(...params);
  const contacts = db.prepare(`
    SELECT c.id, c.name, c.email, c.phone, c.notes, c.created_at,
      (SELECT COUNT(*) FROM email_log WHERE contact_id = c.id) + (SELECT COUNT(*) FROM sent_imap WHERE contact_id = c.id) as sent_count,
      (SELECT COUNT(*) FROM inbox WHERE contact_id = c.id) as received_count
    FROM contacts c ${where} ORDER BY c.name ASC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ contacts, total: total.count, page, limit });
});

// Külső API: egy kapcsolat lekérdezése
app.get('/api/v1/contacts/:id', apiLimiter, authenticateApiKey, (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

// Külső API: új kapcsolat létrehozása
app.post('/api/v1/contacts', apiLimiter, authenticateApiKey, (req, res) => {
  const { name, email, phone, notes } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  const existing = db.prepare('SELECT id FROM contacts WHERE email = ? AND user_id = ?').get(email, req.userId);
  if (existing) return res.status(409).json({ error: 'A contact with this email already exists', contact_id: existing.id });
  const id = randomUUID();
  db.prepare('INSERT INTO contacts (id, user_id, name, email, phone, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, name, email, phone || '', notes || '');
  res.json({ id, name, email, phone: phone || '', notes: notes || '' });
});

// Külső API: kapcsolat módosítása
app.put('/api/v1/contacts/:id', apiLimiter, authenticateApiKey, (req, res) => {
  const { name, email, phone, notes } = req.body;
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('UPDATE contacts SET name = ?, email = ?, phone = ?, notes = ? WHERE id = ?')
    .run(name || existing.name, email || existing.email, phone !== undefined ? phone : existing.phone, notes !== undefined ? notes : existing.notes, req.params.id);
  res.json({ success: true });
});

// Külső API: kapcsolat törlése
app.delete('/api/v1/contacts/:id', apiLimiter, authenticateApiKey, (req, res) => {
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Külső API: email küldés sablonnal vagy nyers HTML-lel
app.post('/api/v1/send', apiLimiter, authenticateApiKey, (req, res) => {
  const { to, subject, html, cc, bcc, template_id, variables } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'to and subject are required' });

  let emailHtml = html || '';
  if (template_id) {
    const tpl = db.prepare('SELECT html, subject FROM custom_templates WHERE id = ? AND user_id = ?').get(template_id, req.userId);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    emailHtml = tpl.html;
  }

  if (variables && typeof variables === 'object') {
    for (const [key, value] of Object.entries(variables)) {
      emailHtml = emailHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value || '');
    }
  }

  if (!emailHtml) return res.status(400).json({ error: 'html body or template_id is required' });

  const userTransporter = getUserTransporter(req.userId);
  if (!userTransporter) return res.status(400).json({ error: 'SMTP not configured for this user' });
  const userSettings = getUserSettings(req.userId);
  const fromName = userSettings.smtp_from_name || userSettings.smtp_user || '';

  // Auto-attach inline CID images referenced in the HTML (domain-gated)
  const smtpDomain = (userSettings.smtp_user || '').includes('@') ? userSettings.smtp_user.split('@')[1] : '';
  const cidAttachments = getCidAttachments(emailHtml, smtpDomain);

  const mailOptions = {
    from: `"${fromName}" <${userSettings.smtp_user}>`,
    to, subject, html: emailHtml,
    attachments: cidAttachments,
    ...(cc && { cc }), ...(bcc && { bcc })
  };

  userTransporter.sendMail(mailOptions, (err, info) => {
    if (err) return res.status(500).json({ error: err.message });
    const contactId = findContactByEmail(to, req.userId);
    logEmail({ userId: req.userId, contactId, recipientEmail: to, subject, html: emailHtml, messageId: info.messageId, files: [] });
    res.json({ success: true, messageId: info.messageId });
  });
});

// ─── ÁRAJÁNLATOK - CRUD, PDF generálás, email küldés ────

const BRANDING_DIR = path.join(__dirname, 'branding');
if (!fs.existsSync(BRANDING_DIR)) fs.mkdirSync(BRANDING_DIR, { recursive: true });

const QUOTES_DIR = path.join(__dirname, 'quotes');
if (!fs.existsSync(QUOTES_DIR)) fs.mkdirSync(QUOTES_DIR, { recursive: true });

// Segédfüggvény: cég adatok lekérdezése a user_settings-ből
function getCompanyInfo(userId) {
  return getUserSettings(userId);
}

// Logó fájl keresése a branding mappából (PDF generáláshoz)
function findLogoPath(companyInfo, userId) {
  const userBrandingDir = path.join(BRANDING_DIR, userId || '_default');
  // 1) Uploaded logo from user_settings
  if (companyInfo.app_logo && companyInfo.app_logo.includes('logo-file')) {
    const logoFilename = companyInfo.app_logo.split('/').pop();
    const lp = path.join(userBrandingDir, logoFilename);
    // Skip SVG – PDFKit cannot render it
    if (fs.existsSync(lp) && !lp.endsWith('.svg')) return lp;
  }
  // 2) Fallback: any image file in user branding dir
  if (fs.existsSync(userBrandingDir)) {
    const supported = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const files = fs.readdirSync(userBrandingDir);
    for (const f of files) {
      if (supported.includes(path.extname(f).toLowerCase())) {
        return path.join(userBrandingDir, f);
      }
    }
  }
  return null;
}

// Következő árajánlat szám generálása (per user, with customizable prefix and domain)
function nextQuoteNumber(userId) {
  const settings = getUserSettings(userId);
  const prefix = (settings.quote_prefix || 'AJ').toUpperCase();
  const smtpUser = settings.smtp_user || '';
  const domain = smtpUser.includes('@') ? smtpUser.split('@')[1].split('.')[0].toUpperCase() : '';
  const year = new Date().getFullYear();

  // Build the base: PREFIX-DOMAIN-YEAR or PREFIX-YEAR (if no domain)
  const base = domain ? `${prefix}-${domain}-${year}` : `${prefix}-${year}`;

  // Find the highest sequence number for this user with this base pattern
  const last = db.prepare("SELECT quote_number FROM quotes WHERE quote_number LIKE ? AND user_id = ? ORDER BY created_at DESC LIMIT 1").get(`${base}-%`, userId);
  let seq = 1;
  if (last) {
    const lastPart = last.quote_number.split('-').pop();
    seq = parseInt(lastPart || '0', 10) + 1;
  }
  return `${base}-${String(seq).padStart(4, '0')}`;
}

// Összes árajánlat listázása (auto-link unlinked quotes to contacts by email)
app.get('/api/quotes', authenticate, requireSubscription, (req, res) => {
  try {
    // Auto-link: find quotes without contact_id but with contact_email matching an existing contact
    const unlinked = db.prepare("SELECT id, contact_email FROM quotes WHERE user_id = ? AND (contact_id IS NULL OR contact_id = '') AND contact_email != ''").all(req.userId);
    if (unlinked.length > 0) {
      const linkStmt = db.prepare('UPDATE quotes SET contact_id = ? WHERE id = ?');
      for (const q of unlinked) {
        const cid = findContactByEmail(q.contact_email, req.userId);
        if (cid) linkStmt.run(cid, q.id);
      }
    }
    const quotes = db.prepare('SELECT * FROM quotes WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ quotes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Árajánlat státusz frissítése (accepted / rejected / draft / sent)
app.patch('/api/quotes/:id/status', authenticate, requireSubscription, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!existing) return res.status(404).json({ error: 'Quote not found' });
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'accepted', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` });
    db.prepare("UPDATE quotes SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
    res.json({ success: true, status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Egy árajánlat lekérdezése tételekkel
app.get('/api/quotes/:id', authenticate, requireSubscription, (req, res) => {
  try {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order').all(req.params.id);
    res.json({ ...quote, items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Új árajánlat létrehozása
app.post('/api/quotes', authenticate, requireSubscription, (req, res) => {
  try {
    const { title, contact_id, contact_name, contact_email, contact_phone, contact_address, contact_vat, currency, vat_rate, notes, valid_until, items } = req.body;
    const id = randomUUID();
    const quote_number = nextQuoteNumber(req.userId);

    let subtotal = 0;
    const parsedItems = (items || []).map((item, i) => {
      const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
      subtotal += itemTotal;
      return { ...item, total: itemTotal, sort_order: i };
    });
    const vatR = vat_rate ?? 27;
    const vat_amount = Math.round(subtotal * vatR / 100);
    const total = subtotal + vat_amount;

    db.prepare(`INSERT INTO quotes (id, user_id, quote_number, title, contact_id, contact_name, contact_email, contact_phone, contact_address, contact_vat, currency, vat_rate, subtotal, vat_amount, total, notes, status, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`).run(
      id, req.userId, quote_number, title || '', contact_id || null, contact_name || '', contact_email || '', contact_phone || '', contact_address || '', contact_vat || '', currency || 'HUF', vatR, subtotal, vat_amount, total, notes || '', valid_until || ''
    );

    const insertItem = db.prepare('INSERT INTO quote_items (id, quote_id, description, quantity, unit, unit_price, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const item of parsedItems) {
      insertItem.run(randomUUID(), id, item.description || '', item.quantity || 1, item.unit || 'db', item.unit_price || 0, item.total, item.sort_order);
    }

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
    const savedItems = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order').all(id);
    res.status(201).json({ ...quote, items: savedItems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Árajánlat módosítása
app.put('/api/quotes/:id', authenticate, requireSubscription, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!existing) return res.status(404).json({ error: 'Quote not found' });

    const { title, contact_id, contact_name, contact_email, contact_phone, contact_address, contact_vat, currency, vat_rate, notes, valid_until, status, items } = req.body;

    let subtotal = 0;
    const parsedItems = (items || []).map((item, i) => {
      const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
      subtotal += itemTotal;
      return { ...item, total: itemTotal, sort_order: i };
    });
    const vatR = vat_rate ?? existing.vat_rate ?? 27;
    const vat_amount = Math.round(subtotal * vatR / 100);
    const total = subtotal + vat_amount;

    db.prepare(`UPDATE quotes SET title = ?, contact_id = ?, contact_name = ?, contact_email = ?, contact_phone = ?, contact_address = ?, contact_vat = ?, currency = ?, vat_rate = ?, subtotal = ?, vat_amount = ?, total = ?, notes = ?, status = ?, valid_until = ?, updated_at = datetime('now') WHERE id = ?`).run(
      title ?? existing.title ?? '', contact_id ?? existing.contact_id, contact_name ?? existing.contact_name, contact_email ?? existing.contact_email, contact_phone ?? existing.contact_phone, contact_address ?? existing.contact_address, contact_vat ?? existing.contact_vat, currency ?? existing.currency, vatR, subtotal, vat_amount, total, notes ?? existing.notes, status ?? existing.status, valid_until ?? existing.valid_until, req.params.id
    );

    // Tételek újraírása
    db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(req.params.id);
    const insertItem = db.prepare('INSERT INTO quote_items (id, quote_id, description, quantity, unit, unit_price, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const item of parsedItems) {
      insertItem.run(randomUUID(), req.params.id, item.description || '', item.quantity || 1, item.unit || 'db', item.unit_price || 0, item.total, item.sort_order);
    }

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
    const savedItems = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order').all(req.params.id);
    res.json({ ...quote, items: savedItems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Árajánlat törlése
app.delete('/api/quotes/:id', authenticate, requireSubscription, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!existing) return res.status(404).json({ error: 'Quote not found' });
    db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(req.params.id);
    db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
    // Töröljük a PDF-et is ha van
    const pdfPath = path.join(QUOTES_DIR, `${req.params.id}.pdf`);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PDF GENERÁLÁS ────

function formatMoney(amount, currency = 'HUF') {
  if (currency === 'HUF') return Math.round(amount).toLocaleString('hu-HU') + ' Ft';
  return amount.toLocaleString('hu-HU', { minimumFractionDigits: 2 }) + ' €';
}

function generateQuotePdf(quote, items, companyInfo, logoPath) {
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(QUOTES_DIR, `${quote.id}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Noto Sans - teljes magyar ékezet támogatás (Ő, Ű, stb.)
    const fontDir = path.join(import.meta.dirname, 'fonts');
    const notoRegular = path.join(fontDir, 'NotoSans-Regular.ttf');
    const notoBold = path.join(fontDir, 'NotoSans-Bold.ttf');
    const hasNoto = fs.existsSync(notoRegular);
    if (hasNoto) {
      doc.registerFont('Noto', notoRegular);
      doc.registerFont('NotoB', fs.existsSync(notoBold) ? notoBold : notoRegular);
    }
    const font = hasNoto ? 'Noto' : 'Helvetica';
    const fontB = hasNoto ? 'NotoB' : 'Helvetica-Bold';

    const M = 50;
    const pageW = doc.page.width - M * 2;
    const accent = '#1AA19C';
    const pageH = doc.page.height;

    // Helper: szöveg kiírása explicit pozícióra (nem mozgatja a belső cursort tovább)
    const drawText = (text, x, ty, opts = {}) => {
      doc.text(text, x, ty, { lineBreak: false, ...opts });
    };

    // ─── Logó (bal felső) ───
    if (logoPath && fs.existsSync(logoPath)) {
      try { doc.image(logoPath, M, 40, { height: 45 }); } catch {}
    }

    // ─── Fejléc jobb oldalon ───
    doc.font(fontB).fontSize(22).fillColor(accent);
    drawText('\u00c1RAJ\u00c1NLAT', M, M, { width: pageW, align: 'right' });
    doc.font(font).fontSize(9).fillColor('#666');
    drawText(quote.quote_number, M, M + 26, { width: pageW, align: 'right' });
    if (quote.title) {
      doc.font(font).fontSize(10).fillColor('#444');
      drawText(quote.title, M, M + 40, { width: pageW, align: 'right' });
    }

    let y = 105;
    doc.moveTo(M, y).lineTo(M + pageW, y).strokeColor(accent).lineWidth(2).stroke();
    y += 15;

    // ─── Két oszlop: Kiállító | Vevő ───
    const colW = pageW / 2 - 10;
    const leftX = M;
    const rightX = M + colW + 20;
    const headerY = y;

    // Kiállító (bal)
    doc.font(fontB).fontSize(7).fillColor(accent);
    drawText('KI\u00c1LL\u00cdT\u00d3', leftX, y, { width: colW });
    y += 13;
    doc.font(fontB).fontSize(10).fillColor('#333');
    drawText(companyInfo.company_name || companyInfo.app_name || 'C\u00e9g neve', leftX, y, { width: colW });
    y += 14;
    const companyDetails = [
      companyInfo.company_street,
      [companyInfo.company_zip, companyInfo.company_city].filter(Boolean).join(' '),
      companyInfo.company_country,
      companyInfo.company_vat ? `Ad\u00f3sz\u00e1m: ${companyInfo.company_vat}` : '',
      companyInfo.company_email,
      companyInfo.company_phone,
      companyInfo.company_bank_name ? `Bank: ${companyInfo.company_bank_name}` : '',
      companyInfo.company_bank_iban ? `IBAN: ${companyInfo.company_bank_iban}` : '',
    ].filter(Boolean);
    doc.font(font).fontSize(8).fillColor('#666');
    for (const line of companyDetails) { drawText(line, leftX, y, { width: colW }); y += 11; }

    // Vevő (jobb) - cím mehet több sorba ha kell
    let yR = headerY;
    doc.font(fontB).fontSize(7).fillColor(accent);
    drawText('VEV\u0150', rightX, yR, { width: colW });
    yR += 13;
    doc.font(fontB).fontSize(10).fillColor('#333');
    drawText(quote.contact_name || '\u00dcgyf\u00e9l neve', rightX, yR, { width: colW });
    yR += 14;
    const clientDetails = [
      quote.contact_address,
      quote.contact_vat ? `Ad\u00f3sz\u00e1m: ${quote.contact_vat}` : '',
      quote.contact_email,
      quote.contact_phone,
    ].filter(Boolean);
    doc.font(font).fontSize(8).fillColor('#666');
    for (const line of clientDetails) {
      // Cím lehet hosszú, engedjük tördelni a jobb oszlopon belül
      const h = doc.heightOfString(line, { width: colW });
      doc.text(line, rightX, yR, { width: colW });
      yR += Math.max(11, h + 2);
    }

    y = Math.max(y, yR) + 12;

    // ─── Dátum sor ───
    doc.rect(M, y - 4, pageW, 22).fill('#f0fafa');
    doc.font(fontB).fontSize(7).fillColor(accent);
    drawText('KELT:', M + 8, y, { width: 30 });
    doc.font(font).fontSize(9).fillColor('#333');
    drawText(new Date(quote.created_at).toLocaleDateString('hu-HU'), M + 38, y, { width: 100 });
    if (quote.valid_until) {
      doc.font(fontB).fontSize(7).fillColor(accent);
      drawText('\u00c9RV\u00c9NYES:', M + 200, y, { width: 55 });
      doc.font(font).fontSize(9).fillColor('#333');
      drawText(quote.valid_until, M + 255, y, { width: 100 });
    }
    y += 24;

    doc.moveTo(M, y).lineTo(M + pageW, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 8;

    // ─── Táblázat fejléc ───
    const cols = [
      { key: 'num', label: '#', x: M, w: 20, align: 'right' },
      { key: 'desc', label: 'Megnevez\u00e9s', x: M + 20, w: 175, align: 'left' },
      { key: 'qty', label: 'Menny.', x: M + 195, w: 40, align: 'right' },
      { key: 'unit', label: 'Egys.', x: M + 235, w: 35, align: 'right' },
      { key: 'price', label: 'Egys\u00e9g\u00e1r', x: M + 270, w: 70, align: 'right' },
      { key: 'total', label: 'Nett\u00f3', x: M + 340, w: 75, align: 'right' },
      { key: 'gross', label: 'Brutt\u00f3', x: M + 415, w: 80, align: 'right' },
    ];

    doc.font(fontB).fontSize(7).fillColor(accent);
    for (const col of cols) drawText(col.label, col.x, y, { width: col.w, align: col.align });
    y += 13;
    doc.moveTo(M, y).lineTo(M + pageW, y).strokeColor('#eee').lineWidth(0.5).stroke();
    y += 5;

    // ─── Tételek ───
    items.forEach((item, i) => {
      if (y > 700) { doc.addPage(); y = M; }
      // Zebra háttér - rect + fill, majd explicit fillColor visszaállítás
      if (i % 2 === 0) {
        doc.rect(M, y - 2, pageW, 16).fill('#f8f9fa');
      }
      doc.font(font).fontSize(9).fillColor('#333');
      drawText(String(i + 1), cols[0].x, y, { width: cols[0].w, align: 'right' });
      drawText(item.description || '', cols[1].x, y, { width: cols[1].w });
      drawText(String(item.quantity), cols[2].x, y, { width: cols[2].w, align: 'right' });
      drawText(item.unit, cols[3].x, y, { width: cols[3].w, align: 'right' });
      drawText(formatMoney(item.unit_price, quote.currency), cols[4].x, y, { width: cols[4].w, align: 'right' });
      drawText(formatMoney(item.total, quote.currency), cols[5].x, y, { width: cols[5].w, align: 'right' });
      const itemGross = item.total * (1 + (quote.vat_rate || 0) / 100);
      drawText(formatMoney(itemGross, quote.currency), cols[6].x, y, { width: cols[6].w, align: 'right' });
      y += 17;
    });

    y += 8;
    doc.moveTo(M, y).lineTo(M + pageW, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 10;

    // ─── Összesítés ───
    const sumX = M + 280;
    const sumW = pageW - 280;
    const sumLabelW = 100;
    doc.font(font).fontSize(9).fillColor('#666');
    drawText('Nett\u00f3 \u00f6sszeg:', sumX, y, { width: sumLabelW });
    drawText(formatMoney(quote.subtotal, quote.currency), sumX + sumLabelW, y, { width: sumW - sumLabelW, align: 'right' });
    y += 15;
    drawText(`\u00c1FA (${quote.vat_rate}%):`, sumX, y, { width: sumLabelW });
    drawText(formatMoney(quote.vat_amount, quote.currency), sumX + sumLabelW, y, { width: sumW - sumLabelW, align: 'right' });
    y += 15;
    doc.moveTo(sumX, y).lineTo(sumX + sumW, y).strokeColor(accent).lineWidth(1).stroke();
    y += 8;
    doc.font(fontB).fontSize(12).fillColor(accent);
    drawText('Brutt\u00f3 \u00f6sszesen:', sumX, y, { width: sumLabelW });
    drawText(formatMoney(quote.total, quote.currency), sumX + sumLabelW, y, { width: sumW - sumLabelW, align: 'right' });
    y += 22;

    // ─── Megjegyzések ───
    if (quote.notes) {
      doc.font(fontB).fontSize(7).fillColor(accent);
      drawText('MEGJEGYZ\u00c9SEK', M, y, { width: pageW });
      y += 11;
      doc.font(font).fontSize(8).fillColor('#666').text(quote.notes, M, y, { width: pageW });
    }

    // ─── Lábléc ───
    const footerY = pageH - 55;
    doc.moveTo(M, footerY).lineTo(M + pageW, footerY).strokeColor('#eee').lineWidth(0.5).stroke();
    const footerText = `${companyInfo.company_name || companyInfo.app_name || ''} | ${companyInfo.company_email || ''} | ${companyInfo.company_phone || ''}`;
    doc.font(font).fontSize(7).fillColor('#999');
    drawText(footerText, M, footerY + 8, { width: pageW, align: 'center', height: 10 });

    doc.end();
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

// PDF letöltés
app.get('/api/quotes/:id/pdf', authenticate, requireSubscription, async (req, res) => {
  try {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order').all(req.params.id);
    const companyInfo = getCompanyInfo(req.userId);

    const logoPath = findLogoPath(companyInfo, req.userId);

    const pdfPath = await generateQuotePdf(quote, items, companyInfo, logoPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.quote_number}.pdf"`);
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Árajánlat küldése emailben
app.post('/api/quotes/:id/send', authenticate, requireSubscription, async (req, res) => {
  try {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    if (!quote.contact_email) return res.status(400).json({ error: 'Nincs email cím megadva a vevőnél' });

    const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order').all(req.params.id);
    const companyInfo = getCompanyInfo(req.userId);

    const logoPath = findLogoPath(companyInfo, req.userId);

    const pdfPath = await generateQuotePdf(quote, items, companyInfo, logoPath);

    // Email sablon - testreszabható a body-ban
    const { subject: customSubject, html: customHtml } = req.body || {};
    const companyName = companyInfo.company_name || companyInfo.app_name || 'Cég';
    const defaultSubject = `Árajánlat - ${quote.quote_number} | ${companyName}`;
    const defaultHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1AA19C; margin-bottom: 5px;">Árajánlat</h2>
        <p style="color: #666; font-size: 14px; margin-top: 0;">${quote.quote_number}</p>
        <p>Tisztelt <strong>${quote.contact_name || 'Ügyfelünk'}</strong>,</p>
        <p>Mellékelten küldjük árajánlatunkat az alábbi összesítéssel:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f8f9fa;">
            <td style="padding: 8px 12px; font-size: 13px; color: #666;">Nettó összeg</td>
            <td style="padding: 8px 12px; font-size: 13px; text-align: right;">${formatMoney(quote.subtotal, quote.currency)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #666;">ÁFA (${quote.vat_rate}%)</td>
            <td style="padding: 8px 12px; font-size: 13px; text-align: right;">${formatMoney(quote.vat_amount, quote.currency)}</td>
          </tr>
          <tr style="background: #1AA19C; color: white;">
            <td style="padding: 10px 12px; font-size: 14px; font-weight: bold;">Összesen</td>
            <td style="padding: 10px 12px; font-size: 14px; font-weight: bold; text-align: right;">${formatMoney(quote.total, quote.currency)}</td>
          </tr>
        </table>
        ${quote.valid_until ? `<p style="font-size: 13px; color: #666;">Az árajánlat érvényessége: <strong>${quote.valid_until}</strong></p>` : ''}
        ${quote.notes ? `<p style="font-size: 13px; color: #666;">Megjegyzés: ${quote.notes}</p>` : ''}
        <p style="font-size: 13px; color: #666;">A részletes árajánlatot PDF formátumban mellékeltük.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999;">
          ${companyName}<br/>
          ${companyInfo.company_email || ''} | ${companyInfo.company_phone || ''}<br/>
          ${[companyInfo.company_zip, companyInfo.company_city, companyInfo.company_street].filter(Boolean).join(', ')}
        </p>
      </div>
    `;

    const userTransporter = getUserTransporter(req.userId);
    if (!userTransporter) return res.status(400).json({ error: 'SMTP nincs konfigurálva. Állítsd be a Beállításoknál.' });

    const mailOptions = {
      from: `"${companyName}" <${companyInfo.smtp_user || ''}>`,
      to: quote.contact_email,
      subject: customSubject || defaultSubject,
      html: customHtml || defaultHtml,
      attachments: [{ filename: `${quote.quote_number}.pdf`, path: pdfPath }]
    };

    userTransporter.sendMail(mailOptions, (err, info) => {
      if (err) return res.status(500).json({ error: err.message });
      // Státusz frissítése
      db.prepare("UPDATE quotes SET status = 'sent', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
      res.json({ success: true, messageId: info.messageId });
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BRANDING - per-user branding és logó testreszabása ────

app.get('/api/branding', authenticate, (req, res) => {
  try {
    const settings = getUserSettings(req.userId);
    const result = {
      app_name: settings.app_name || 'Mailer',
      app_subtitle: settings.app_subtitle || '',
      app_logo: settings.app_logo || '/logo-header.png'
    };
    // Merge all user settings into result
    for (const [key, val] of Object.entries(settings)) {
      if (val) result[key] = val;
    }
    // Derive login_domain from smtp_user for template visibility
    if (settings.smtp_user && settings.smtp_user.includes('@')) {
      result.login_domain = settings.smtp_user.split('@')[1].toLowerCase();
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/branding', authenticate, (req, res) => {
  try {
    const allowed = ['app_name', 'app_subtitle', 'company_name', 'company_vat', 'company_email', 'company_phone', 'company_street', 'company_city', 'company_zip', 'company_country', 'company_bank_name', 'company_bank_iban', 'quote_prefix'];
    for (const [key, val] of Object.entries(req.body)) {
      if (allowed.includes(key) && val !== undefined) setUserSetting(req.userId, key, val);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branding/logo', authenticate, upload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nincs fájl feltöltve' });
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) return res.status(400).json({ error: 'Csak kép fájl engedélyezett (PNG, JPG, SVG, WebP, GIF)' });

    const userBrandingDir = path.join(BRANDING_DIR, req.userId);
    if (!fs.existsSync(userBrandingDir)) fs.mkdirSync(userBrandingDir, { recursive: true });

    const ext = path.extname(req.file.originalname) || '.png';
    const filename = `logo${ext}`;
    const filepath = path.join(userBrandingDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const logoUrl = `/api/branding/logo-file/${req.userId}/${filename}`;
    setUserSetting(req.userId, 'app_logo', logoUrl);

    res.json({ success: true, logo: logoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/branding/logo-file/:userId/:filename', (req, res) => {
  const userBrandingDir = path.join(BRANDING_DIR, req.params.userId);
  const fp = path.join(userBrandingDir, path.basename(req.params.filename));
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Logo not found' });
  res.sendFile(fp);
});

// ─── ANALYTICS ─────────────────────────────────────────────

function getAnalyticsData(uid, days) {
  const sentPerDay = db.prepare(`
    SELECT date(d) as day, SUM(cnt) as count FROM (
      SELECT sent_at as d, 1 as cnt FROM email_log WHERE user_id = ?
      UNION ALL
      SELECT date as d, 1 as cnt FROM sent_imap WHERE user_id = ?
    ) WHERE d >= date('now', ?)
    GROUP BY date(d) ORDER BY day
  `).all(uid, uid, `-${days} days`);

  const receivedPerDay = db.prepare(`
    SELECT date(date) as day, COUNT(*) as count FROM inbox
    WHERE user_id = ? AND date >= date('now', ?)
    GROUP BY date(date) ORDER BY day
  `).all(uid, `-${days} days`);

  const dayMap = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = { day: key, sent: 0, received: 0 };
  }
  for (const r of sentPerDay) { if (dayMap[r.day]) dayMap[r.day].sent = r.count; }
  for (const r of receivedPerDay) { if (dayMap[r.day]) dayMap[r.day].received = r.count; }
  const timeline = Object.values(dayMap);

  const dateFilter = `-${days} days`;

  const topContacts = db.prepare(`
    SELECT c.id, c.name, c.email,
      (SELECT COUNT(*) FROM email_log WHERE contact_id = c.id AND user_id = ? AND sent_at >= date('now', ?))
        + (SELECT COUNT(*) FROM sent_imap WHERE contact_id = c.id AND user_id = ? AND date >= date('now', ?)) as sent_count,
      (SELECT COUNT(*) FROM inbox WHERE contact_id = c.id AND user_id = ? AND date >= date('now', ?)) as received_count
    FROM contacts c
    WHERE c.user_id = ?
    ORDER BY (sent_count + received_count) DESC
    LIMIT 10
  `).all(uid, dateFilter, uid, dateFilter, uid, dateFilter, uid);

  const totalSent = db.prepare(`
    SELECT (SELECT COUNT(*) FROM email_log WHERE user_id = ? AND sent_at >= date('now', ?))
         + (SELECT COUNT(*) FROM sent_imap WHERE user_id = ? AND date >= date('now', ?)) as total
  `).get(uid, dateFilter, uid, dateFilter).total;

  const totalReceived = db.prepare("SELECT COUNT(*) as total FROM inbox WHERE user_id = ? AND date >= date('now', ?)").get(uid, dateFilter).total;
  const totalContacts = db.prepare('SELECT COUNT(*) as total FROM contacts WHERE user_id = ?').get(uid).total;
  const totalQuotes = db.prepare("SELECT COUNT(*) as total FROM quotes WHERE user_id = ? AND created_at >= date('now', ?)").get(uid, dateFilter).total;
  const acceptedQuotes = db.prepare("SELECT COUNT(*) as total FROM quotes WHERE user_id = ? AND status = 'accepted' AND created_at >= date('now', ?)").get(uid, dateFilter).total;
  const rejectedQuotes = db.prepare("SELECT COUNT(*) as total FROM quotes WHERE user_id = ? AND status = 'rejected' AND created_at >= date('now', ?)").get(uid, dateFilter).total;

  const contactsWeEmailed = db.prepare(`
    SELECT DISTINCT contact_id FROM (
      SELECT contact_id FROM email_log WHERE user_id = ? AND contact_id IS NOT NULL AND sent_at >= date('now', ?)
      UNION
      SELECT contact_id FROM sent_imap WHERE user_id = ? AND contact_id IS NOT NULL AND date >= date('now', ?)
    )
  `).all(uid, dateFilter, uid, dateFilter).length;

  const contactsWhoReplied = db.prepare(`
    SELECT COUNT(DISTINCT i.contact_id) as cnt FROM inbox i
    WHERE i.user_id = ? AND i.contact_id IS NOT NULL AND i.date >= date('now', ?)
      AND i.contact_id IN (
        SELECT contact_id FROM email_log WHERE user_id = ? AND contact_id IS NOT NULL AND sent_at >= date('now', ?)
        UNION
        SELECT contact_id FROM sent_imap WHERE user_id = ? AND contact_id IS NOT NULL AND date >= date('now', ?)
      )
  `).get(uid, dateFilter, uid, dateFilter, uid, dateFilter).cnt;

  const responseRate = contactsWeEmailed > 0 ? Math.round((contactsWhoReplied / contactsWeEmailed) * 100) : 0;

  const halfDays = Math.floor(days / 2);
  const sentThisHalf = db.prepare(`
    SELECT COUNT(*) as cnt FROM (
      SELECT sent_at as d FROM email_log WHERE user_id = ?
      UNION ALL SELECT date as d FROM sent_imap WHERE user_id = ?
    ) WHERE d >= date('now', ?)
  `).get(uid, uid, `-${halfDays} days`).cnt;

  const sentLastHalf = db.prepare(`
    SELECT COUNT(*) as cnt FROM (
      SELECT sent_at as d FROM email_log WHERE user_id = ?
      UNION ALL SELECT date as d FROM sent_imap WHERE user_id = ?
    ) WHERE d >= date('now', ?) AND d < date('now', ?)
  `).get(uid, uid, `-${days} days`, `-${halfDays} days`).cnt;

  const receivedThisHalf = db.prepare("SELECT COUNT(*) as cnt FROM inbox WHERE user_id = ? AND date >= date('now', ?)").get(uid, `-${halfDays} days`).cnt;
  const receivedLastHalf = db.prepare("SELECT COUNT(*) as cnt FROM inbox WHERE user_id = ? AND date >= date('now', ?) AND date < date('now', ?)").get(uid, `-${days} days`, `-${halfDays} days`).cnt;

  return {
    timeline, topContacts, days,
    summary: { totalSent, totalReceived, totalContacts, totalQuotes, acceptedQuotes, rejectedQuotes, responseRate, sentThisHalf, sentLastHalf, receivedThisHalf, receivedLastHalf }
  };
}

app.get('/api/analytics', authenticate, (req, res) => {
  try {
    res.json(getAnalyticsData(req.userId, parseInt(req.query.days) || 30));
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Analytics CSV export
app.get('/api/analytics/export/csv', authenticate, (req, res) => {
  try {
    const data = getAnalyticsData(req.userId, parseInt(req.query.days) || 30);
    const { timeline, topContacts, summary } = data;

    let csv = 'Analitika riport\n';
    csv += `Időszak: ${data.days} nap\n`;
    csv += `Generálva: ${new Date().toLocaleDateString('hu-HU')}\n\n`;

    csv += 'Összesítés\n';
    csv += `Küldött;${summary.totalSent}\n`;
    csv += `Fogadott;${summary.totalReceived}\n`;
    csv += `Kapcsolatok;${summary.totalContacts}\n`;
    csv += `Árajánlatok;${summary.totalQuotes}\n`;
    csv += `Elfogadott árajánlatok;${summary.acceptedQuotes}\n`;
    csv += `Elutasított árajánlatok;${summary.rejectedQuotes}\n`;
    csv += `Válaszadási arány;${summary.responseRate}%\n\n`;

    csv += 'Napi forgalom\n';
    csv += 'Dátum;Küldött;Fogadott\n';
    for (const row of timeline) {
      csv += `${row.day};${row.sent};${row.received}\n`;
    }

    if (topContacts.length > 0) {
      csv += '\nLegaktívabb kapcsolatok\n';
      csv += 'Név;Email;Küldött;Fogadott;Összesen\n';
      for (const c of topContacts) {
        csv += `${c.name || ''};${c.email};${c.sent_count};${c.received_count};${c.sent_count + c.received_count}\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analitika-${data.days}nap-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err) {
    console.error('Analytics CSV error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Analytics PDF export
app.get('/api/analytics/export/pdf', authenticate, (req, res) => {
  try {
    const data = getAnalyticsData(req.userId, parseInt(req.query.days) || 30);
    const { timeline, topContacts, summary } = data;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="analitika-${data.days}nap-${new Date().toISOString().slice(0, 10)}.pdf"`);
    doc.pipe(res);

    const fontDir = path.join(import.meta.dirname, 'fonts');
    const notoRegular = path.join(fontDir, 'NotoSans-Regular.ttf');
    const notoBold = path.join(fontDir, 'NotoSans-Bold.ttf');
    const hasNoto = fs.existsSync(notoRegular);
    if (hasNoto) {
      doc.registerFont('Noto', notoRegular);
      doc.registerFont('NotoB', fs.existsSync(notoBold) ? notoBold : notoRegular);
    }
    const font = hasNoto ? 'Noto' : 'Helvetica';
    const fontB = hasNoto ? 'NotoB' : 'Helvetica-Bold';
    const M = 50;
    const W = 495;
    const accent = '#1AA19C';
    let y = M;

    // Title
    doc.font(fontB).fontSize(20).fillColor(accent).text('Analitika riport', M, y);
    y += 28;
    doc.font(font).fontSize(10).fillColor('#555').text(`Időszak: ${data.days} nap  |  Generálva: ${new Date().toLocaleDateString('hu-HU')}`, M, y);
    y += 25;

    // Divider
    doc.moveTo(M, y).lineTo(M + W, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 15;

    // Summary cards
    doc.font(fontB).fontSize(13).fillColor('#222').text('Összesítés', M, y);
    y += 22;

    const cardsRow1 = [
      { label: 'Küldött', value: summary.totalSent },
      { label: 'Fogadott', value: summary.totalReceived },
      { label: 'Kapcsolatok', value: summary.totalContacts },
      { label: 'Válaszadási arány', value: `${summary.responseRate}%` },
    ];
    const cardsRow2 = [
      { label: 'Árajánlatok', value: summary.totalQuotes },
      { label: 'Elfogadva', value: summary.acceptedQuotes, color: '#16a34a' },
      { label: 'Elutasítva', value: summary.rejectedQuotes, color: '#dc2626' },
    ];
    const cardW1 = Math.floor(W / cardsRow1.length);
    for (let i = 0; i < cardsRow1.length; i++) {
      const cx = M + i * cardW1;
      doc.roundedRect(cx, y, cardW1 - 8, 50, 4).fillAndStroke('#f7fafa', '#e0e0e0');
      doc.font(fontB).fontSize(16).fillColor(accent).text(String(cardsRow1[i].value), cx + 8, y + 8, { width: cardW1 - 24 });
      doc.font(font).fontSize(8).fillColor('#777').text(cardsRow1[i].label, cx + 8, y + 30, { width: cardW1 - 24 });
    }
    y += 58;
    const cardW2 = Math.floor(W / cardsRow2.length);
    for (let i = 0; i < cardsRow2.length; i++) {
      const cx = M + i * cardW2;
      doc.roundedRect(cx, y, cardW2 - 8, 50, 4).fillAndStroke('#f7fafa', '#e0e0e0');
      doc.font(fontB).fontSize(16).fillColor(cardsRow2[i].color || accent).text(String(cardsRow2[i].value), cx + 8, y + 8, { width: cardW2 - 24 });
      doc.font(font).fontSize(8).fillColor('#777').text(cardsRow2[i].label, cx + 8, y + 30, { width: cardW2 - 24 });
    }
    y += 65;

    // Daily traffic table
    doc.font(fontB).fontSize(13).fillColor('#222').text('Napi forgalom', M, y);
    y += 20;

    const colW = [200, 148, 147];
    const headers = ['Dátum', 'Küldött', 'Fogadott'];
    // Table header
    doc.rect(M, y, W, 18).fill('#f0f0f0');
    let tx = M;
    for (let i = 0; i < headers.length; i++) {
      doc.font(fontB).fontSize(8).fillColor('#444').text(headers[i], tx + 6, y + 5, { width: colW[i] - 12 });
      tx += colW[i];
    }
    y += 18;

    // Show rows with activity, or full timeline if none
    const activeRows = timeline.filter(r => r.sent > 0 || r.received > 0);
    const rows = activeRows.length > 0 ? activeRows : timeline;
    for (const row of rows) {
      if (y > 750) { doc.addPage(); y = M; }
      const bg = rows.indexOf(row) % 2 === 0 ? '#fff' : '#fafafa';
      doc.rect(M, y, W, 16).fill(bg);
      tx = M;
      const vals = [row.day, String(row.sent), String(row.received)];
      for (let i = 0; i < vals.length; i++) {
        doc.font(font).fontSize(8).fillColor('#333').text(vals[i], tx + 6, y + 4, { width: colW[i] - 12 });
        tx += colW[i];
      }
      y += 16;
    }
    y += 15;

    // Top contacts
    if (topContacts.length > 0) {
      if (y > 650) { doc.addPage(); y = M; }
      doc.font(fontB).fontSize(13).fillColor('#222').text('Legaktívabb kapcsolatok', M, y);
      y += 20;

      const cColW = [160, 160, 60, 60, 55];
      const cHeaders = ['Név', 'Email', 'Küldött', 'Fogadott', 'Összesen'];
      doc.rect(M, y, W, 18).fill('#f0f0f0');
      tx = M;
      for (let i = 0; i < cHeaders.length; i++) {
        doc.font(fontB).fontSize(8).fillColor('#444').text(cHeaders[i], tx + 6, y + 5, { width: cColW[i] - 12 });
        tx += cColW[i];
      }
      y += 18;

      for (let ci = 0; ci < topContacts.length; ci++) {
        if (y > 750) { doc.addPage(); y = M; }
        const c = topContacts[ci];
        const bg = ci % 2 === 0 ? '#fff' : '#fafafa';
        doc.rect(M, y, W, 16).fill(bg);
        tx = M;
        const cVals = [c.name || '-', c.email, String(c.sent_count), String(c.received_count), String(c.sent_count + c.received_count)];
        for (let i = 0; i < cVals.length; i++) {
          doc.font(font).fontSize(8).fillColor('#333').text(cVals[i], tx + 6, y + 4, { width: cColW[i] - 12 });
          tx += cColW[i];
        }
        y += 16;
      }
    }

    doc.end();
  } catch (err) {
    console.error('Analytics PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── USER SETTINGS - per-user SMTP/IMAP/email beállítások ────

const USER_SETTING_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_name', 'imap_host', 'imap_port', 'imap_user', 'imap_pass', 'auto_sync'];

app.get('/api/env', authenticate, (req, res) => {
  try {
    const settings = getUserSettings(req.userId);
    const result = {};
    for (const key of USER_SETTING_KEYS) {
      if (settings[key]) {
        result[key] = key.includes('pass') ? '••••••••' : settings[key];
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/env', authenticate, (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Invalid body' });

    for (const [key, val] of Object.entries(updates)) {
      if (!USER_SETTING_KEYS.includes(key)) continue;
      if (val === '••••••••' || val === '') continue;
      setUserSetting(req.userId, key, val);
    }

    res.json({ success: true, message: 'Beállítások mentve.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SMTP kapcsolat tesztelése - per-user
app.get('/api/test-smtp', authenticate, async (req, res) => {
  try {
    const testTransporter = getUserTransporter(req.userId);
    if (!testTransporter) return res.status(400).json({ success: false, error: 'SMTP nincs konfigurálva' });
    await testTransporter.verify();
    res.json({ success: true, message: 'SMTP connection is working' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── BACKUP - export / import ────────────────────────────────

function exportUserData(userId) {
  const contacts = db.prepare('SELECT * FROM contacts WHERE user_id = ?').all(userId);
  const emailLog = db.prepare('SELECT * FROM email_log WHERE user_id = ?').all(userId);
  const attachments = db.prepare('SELECT id, email_log_id, contact_id, filename, mimetype, size, uploaded_at FROM attachments WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = ?)').all(userId);
  const inbox = db.prepare('SELECT * FROM inbox WHERE user_id = ?').all(userId);
  const sentImap = db.prepare('SELECT * FROM sent_imap WHERE user_id = ?').all(userId);
  const templates = db.prepare('SELECT * FROM custom_templates WHERE user_id = ?').all(userId);
  const apiKeys = db.prepare('SELECT id, name, key, created_at, last_used_at, active FROM api_keys WHERE user_id = ?').all(userId);
  const quotes = db.prepare('SELECT * FROM quotes WHERE user_id = ?').all(userId);
  const quoteItems = quotes.length > 0
    ? db.prepare(`SELECT * FROM quote_items WHERE quote_id IN (${quotes.map(() => '?').join(',')})`)
        .all(...quotes.map(q => q.id))
    : [];
  const settings = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(userId);
  return { contacts, emailLog, attachments, inbox, sentImap, templates, apiKeys, quotes, quoteItems, settings };
}

app.get('/api/backup/export', authenticate, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const backup = { version: 1, exported_at: new Date().toISOString(), type: isAdmin ? 'full' : 'user' };

    if (isAdmin) {
      const users = db.prepare('SELECT id, email, name, active, created_at FROM users').all();
      backup.users = users.map(u => ({
        ...u,
        data: exportUserData(u.id)
      }));
      // Also export admin's own settings
      backup.adminData = exportUserData('__admin__');
    } else {
      backup.userId = req.userId;
      backup.data = exportUserData(req.userId);
    }

    const filename = `backup-${isAdmin ? 'full' : 'user'}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function importUserData(userId, data) {
  const stats = { contacts: 0, emails: 0, templates: 0, quotes: 0, settings: 0 };

  // Import settings (re-encrypt sensitive values with current key)
  if (data.settings && data.settings.length > 0) {
    for (const s of data.settings) {
      const val = SENSITIVE_SETTING_KEYS.includes(s.key) ? decryptValue(s.value) : s.value;
      setUserSetting(userId, s.key, val);
      stats.settings++;
    }
  }

  // Import contacts
  const contactIdMap = {};
  if (data.contacts && data.contacts.length > 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO contacts (id, user_id, name, email, phone, notes, company, vat_id, street, street_number, city, zip, country, region, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const c of data.contacts) {
      const newId = c.id;
      ins.run(newId, userId, c.name, c.email, c.phone, c.notes, c.company || '', c.vat_id || '', c.street || '', c.street_number || '', c.city || '', c.zip || '', c.country || '', c.region || '', c.created_at);
      contactIdMap[c.id] = newId;
      stats.contacts++;
    }
  }

  // Import email log
  if (data.emailLog && data.emailLog.length > 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO email_log (id, user_id, contact_id, recipient_email, subject, html, sent_at, message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const e of data.emailLog) {
      ins.run(e.id, userId, contactIdMap[e.contact_id] || e.contact_id, e.recipient_email, e.subject, e.html, e.sent_at, e.message_id, e.status);
      stats.emails++;
    }
  }

  // Import templates
  if (data.templates && data.templates.length > 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO custom_templates (id, user_id, name, description, category, subject, html, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const t of data.templates) {
      ins.run(t.id, userId, t.name, t.description, t.category, t.subject, t.html, t.created_at, t.updated_at);
      stats.templates++;
    }
  }

  // Import quotes
  if (data.quotes && data.quotes.length > 0) {
    const insQ = db.prepare('INSERT OR IGNORE INTO quotes (id, user_id, quote_number, contact_id, contact_name, contact_email, status, valid_until, notes, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insI = db.prepare('INSERT OR IGNORE INTO quote_items (id, quote_id, description, quantity, unit, unit_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const q of data.quotes) {
      insQ.run(q.id, userId, q.quote_number, contactIdMap[q.contact_id] || q.contact_id, q.contact_name, q.contact_email, q.status, q.valid_until, q.notes, q.currency || 'HUF', q.created_at, q.updated_at);
      stats.quotes++;
    }
    if (data.quoteItems) {
      for (const i of data.quoteItems) {
        insI.run(i.id, i.quote_id, i.description, i.quantity, i.unit, i.unit_price, i.sort_order);
      }
    }
  }

  // Import inbox
  if (data.inbox && data.inbox.length > 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO inbox (id, user_id, uid, message_id, from_address, from_name, to_address, subject, date, text_body, html_body, has_attachments, contact_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const m of data.inbox) {
      ins.run(m.id, userId, m.uid, m.message_id, m.from_address, m.from_name, m.to_address, m.subject, m.date, m.text_body, m.html_body, m.has_attachments, contactIdMap[m.contact_id] || m.contact_id);
    }
  }

  // Import sent_imap
  if (data.sentImap && data.sentImap.length > 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO sent_imap (id, user_id, uid, message_id, from_address, from_name, to_address, subject, date, text_body, html_body, has_attachments, contact_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const m of data.sentImap) {
      ins.run(m.id, userId, m.uid, m.message_id, m.from_address, m.from_name, m.to_address, m.subject, m.date, m.text_body, m.html_body, m.has_attachments, contactIdMap[m.contact_id] || m.contact_id);
    }
  }

  return stats;
}

app.post('/api/backup/import', authenticate, express.json({ limit: '100mb' }), (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !backup.version) return res.status(400).json({ error: 'Invalid backup file' });

    const isAdmin = req.user.role === 'admin';
    const results = [];

    if (backup.type === 'full' && isAdmin) {
      // Full backup import — admin only
      if (backup.users && backup.users.length > 0) {
        const insUser = db.prepare('INSERT OR IGNORE INTO users (id, email, password, name, active, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        for (const u of backup.users) {
          insUser.run(u.id, u.email, u.password || '', u.name, u.active !== undefined ? u.active : 1, u.created_at);
          const stats = importUserData(u.id, u.data);
          results.push({ user: u.email, ...stats });
        }
      }
      if (backup.adminData) {
        const stats = importUserData('__admin__', backup.adminData);
        results.push({ user: 'admin', ...stats });
      }
    } else if (backup.type === 'user') {
      // User backup import — import into current user
      if (!backup.data) return res.status(400).json({ error: 'No data in backup' });
      const stats = importUserData(req.userId, backup.data);
      results.push({ user: 'current', ...stats });
    } else if (backup.type === 'full' && !isAdmin) {
      return res.status(403).json({ error: 'Only admin can import full backups' });
    } else {
      return res.status(400).json({ error: 'Unknown backup type' });
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buildelt frontend kiszolgálása prodban
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
