import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const logoAttachments = [
  {
    filename: 'intimix-logo.svg',
    path: path.join(__dirname, 'assets', 'logo-header.svg'),
    cid: 'intimix-logo-header'
  },
  {
    filename: 'intimix-logo.png',
    path: path.join(__dirname, 'assets', 'logo-header.png'),
    cid: 'intimix-logo-png'
  }
];

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  JWT_SECRET, LOGIN_EMAIL, LOGIN_PASSWORD
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false }
});

// Verify SMTP connection on startup
transporter.verify()
  .then(() => console.log('✅ SMTP connection verified'))
  .catch((err) => console.error('❌ SMTP connection failed:', err.message));

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Helper: find or create contact by email, return contact_id
function findContactByEmail(email) {
  const row = db.prepare('SELECT id FROM contacts WHERE email = ?').get(email);
  return row ? row.id : null;
}

// Helper: log email and store attachments
function logEmail({ contactId, recipientEmail, subject, html, messageId, files }) {
  const emailId = randomUUID();
  db.prepare(
    'INSERT INTO email_log (id, contact_id, recipient_email, subject, html, message_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(emailId, contactId, recipientEmail, subject, html, messageId || '');

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

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === LOGIN_EMAIL && password === LOGIN_PASSWORD) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, email });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

// ─── CONTACTS CRUD ───────────────────────────────────────────

// List all contacts
app.get('/api/contacts', authenticate, (req, res) => {
  const contacts = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM email_log WHERE contact_id = c.id) as email_count,
      (SELECT COUNT(*) FROM attachments WHERE contact_id = c.id) as attachment_count
    FROM contacts c ORDER BY c.name ASC
  `).all();
  res.json(contacts);
});

// Get single contact with email history and attachments
app.get('/api/contacts/:id', authenticate, (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const emails = db.prepare(
    'SELECT id, subject, sent_at, message_id, status FROM email_log WHERE contact_id = ? ORDER BY sent_at DESC'
  ).all(req.params.id);

  const attachments = db.prepare(
    'SELECT a.id, a.filename, a.mimetype, a.size, a.uploaded_at, a.email_log_id, e.subject as email_subject FROM attachments a LEFT JOIN email_log e ON a.email_log_id = e.id WHERE a.contact_id = ? ORDER BY a.uploaded_at DESC'
  ).all(req.params.id);

  res.json({ ...contact, emails, attachments });
});

// Create contact
app.post('/api/contacts', authenticate, (req, res) => {
  const { name, email, phone, notes } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const existing = db.prepare('SELECT id FROM contacts WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'A contact with this email already exists' });

  const id = randomUUID();
  db.prepare('INSERT INTO contacts (id, name, email, phone, notes) VALUES (?, ?, ?, ?, ?)').run(
    id, name, email, phone || '', notes || ''
  );
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.status(201).json(contact);
});

// Update contact
app.put('/api/contacts/:id', authenticate, (req, res) => {
  const { name, email, phone, notes } = req.body;
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  if (email && email !== existing.email) {
    const dup = db.prepare('SELECT id FROM contacts WHERE email = ? AND id != ?').get(email, req.params.id);
    if (dup) return res.status(409).json({ error: 'Another contact with this email already exists' });
  }

  db.prepare(
    "UPDATE contacts SET name = ?, email = ?, phone = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name || existing.name, email || existing.email, phone ?? existing.phone, notes ?? existing.notes, req.params.id);

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  res.json(contact);
});

// Delete contact
app.delete('/api/contacts/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
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

// ─── ATTACHMENT SERVING ──────────────────────────────────────

app.get('/api/attachments/:id/download', (req, res) => {
  // Accept token from query param (for img/iframe src) or Authorization header
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const fp = path.join(UPLOADS_DIR, att.stored_path);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found on disk' });

  res.setHeader('Content-Type', att.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${att.filename}"`);
  res.sendFile(fp);
});

// ─── EMAIL LOG FOR A SPECIFIC EMAIL ──────────────────────────

app.get('/api/emails/:id', authenticate, (req, res) => {
  const email = db.prepare('SELECT * FROM email_log WHERE id = ?').get(req.params.id);
  if (!email) return res.status(404).json({ error: 'Email not found' });

  const attachments = db.prepare(
    'SELECT id, filename, mimetype, size, uploaded_at FROM attachments WHERE email_log_id = ?'
  ).all(req.params.id);

  res.json({ ...email, attachments });
});

// ─── SEND EMAIL (updated with logging) ───────────────────────

app.post('/api/send-email', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { to, subject, html, cc, bcc } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));

    const mailOptions = {
      from: `"Intimix Shop" <${SMTP_USER}>`,
      to,
      subject,
      html,
      attachments: [...logoAttachments, ...attachments]
    };

    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to} — MessageId: ${info.messageId}`);

    // Log email
    const contactId = findContactByEmail(to);
    logEmail({
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

// ─── SEND BULK EMAILS (updated with logging) ────────────────

app.post('/api/send-bulk', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { recipients, subject, html } = req.body;
    const parsed = JSON.parse(recipients);

    if (!parsed?.length || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));

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

        const info = await transporter.sendMail({
          from: `"Intimix Shop" <${SMTP_USER}>`,
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          attachments: [...logoAttachments, ...attachments]
        });

        // Log email per recipient
        const contactId = findContactByEmail(recipient.email);
        logEmail({
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

// Test SMTP connection
app.get('/api/test-smtp', authenticate, async (req, res) => {
  try {
    await transporter.verify();
    res.json({ success: true, message: 'SMTP connection is working' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
