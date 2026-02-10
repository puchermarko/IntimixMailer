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
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import PDFDocument from 'pdfkit';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const logoAttachments = [
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
  IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS,
  JWT_SECRET, LOGIN_EMAIL, LOGIN_PASSWORD
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false }
});

// SMTP kapcsolat ellenőrzése induláskor, hogy tudjuk megy-e
transporter.verify()
  .then(() => console.log('✅ SMTP connection verified'))
  .catch((err) => console.error('❌ SMTP connection failed:', err.message));

// JWT hitelesítés middleware - ez védi a belső API-t
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

// Segéd: megkeresi a kontaktot email alapján, visszaadja az id-t ha van
function findContactByEmail(email) {
  const row = db.prepare('SELECT id FROM contacts WHERE email = ?').get(email);
  return row ? row.id : null;
}

// Segéd: email naplózása és csatolmányok mentése a szerverre
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

// Bejelentkezés - egyszerű email+jelszó, JWT-t kap vissza
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === LOGIN_EMAIL && password === LOGIN_PASSWORD) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, email });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
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
    FROM contacts c ORDER BY c.name ASC
  `).all();
  res.json(contacts);
});

// Egy kapcsolat részletei az összes emailjével és fájljával
app.get('/api/contacts/:id', authenticate, (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
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
app.post('/api/contacts', authenticate, (req, res) => {
  const { name, email, phone, notes, company, vat_id, street, street_number, city, zip, country, region } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const existing = db.prepare('SELECT id FROM contacts WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'A contact with this email already exists' });

  const id = randomUUID();
  db.prepare('INSERT INTO contacts (id, name, email, phone, notes, company, vat_id, street, street_number, city, zip, country, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, name, email, phone || '', notes || '', company || '', vat_id || '', street || '', street_number || '', city || '', zip || '', country || '', region || ''
  );
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  res.status(201).json(contact);
});

// Kapcsolat módosítása
app.put('/api/contacts/:id', authenticate, (req, res) => {
  const { name, email, phone, notes } = req.body;
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  if (email && email !== existing.email) {
    const dup = db.prepare('SELECT id FROM contacts WHERE email = ? AND id != ?').get(email, req.params.id);
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

// ─── CSATOLMÁNY KISZOLGÁLÁS - fájlok letöltése ──────────────

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

// ─── EGY ADOTT EMAIL RÉSZLETEI ──────────────────────────────

app.get('/api/emails/:id', authenticate, (req, res) => {
  const email = db.prepare('SELECT * FROM email_log WHERE id = ?').get(req.params.id);
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

  // Union local sent + IMAP sent
  const countSql = `SELECT COUNT(*) as count FROM (
    SELECT id FROM email_log e ${search ? 'WHERE e.subject LIKE ? OR e.recipient_email LIKE ?' : ''}
    UNION ALL
    SELECT id FROM sent_imap s ${search ? 'WHERE s.subject LIKE ? OR s.to_address LIKE ?' : ''}
  )`;
  const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : [];
  const total = db.prepare(countSql).get(...countParams);

  const dataSql = `
    SELECT id, recipient, subject, date, status, contact_id, contact_name, has_attachments, source FROM (
      SELECT e.id, e.recipient_email as recipient, e.subject, e.sent_at as date, e.status, e.contact_id,
        c.name as contact_name, (SELECT COUNT(*) FROM attachments WHERE email_log_id = e.id) as has_attachments, 'local' as source
      FROM email_log e LEFT JOIN contacts c ON e.contact_id = c.id
      ${search ? 'WHERE e.subject LIKE ? OR e.recipient_email LIKE ?' : ''}
      UNION ALL
      SELECT s.id, s.to_address as recipient, s.subject, s.date, 'sent' as status, s.contact_id,
        c.name as contact_name, s.has_attachments, 'imap' as source
      FROM sent_imap s LEFT JOIN contacts c ON s.contact_id = c.id
      ${search ? 'WHERE s.subject LIKE ? OR s.to_address LIKE ?' : ''}
    ) ORDER BY date DESC LIMIT ? OFFSET ?
  `;
  const dataParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset] : [limit, offset];
  const emails = db.prepare(dataSql).all(...dataParams);

  res.json({ emails, total: total.count, page, limit });
});

// Egy IMAP-ról szinkronizált kimenő levél részletei
app.get('/api/sent-imap/:id', authenticate, (req, res) => {
  const email = db.prepare(`
    SELECT s.*, c.name as contact_name
    FROM sent_imap s LEFT JOIN contacts c ON s.contact_id = c.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!email) return res.status(404).json({ error: 'Email not found' });

  const attachments = db.prepare(
    'SELECT id, filename, mimetype, size FROM sent_imap_attachments WHERE sent_id = ?'
  ).all(req.params.id);

  res.json({ ...email, attachments });
});

// IMAP kimenő levél csatolmányának letöltése
app.get('/api/sent-imap-attachments/:id/download', (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const att = db.prepare('SELECT * FROM sent_imap_attachments WHERE id = ?').get(req.params.id);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const fp = path.join(UPLOADS_DIR, att.stored_path);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found on disk' });

  res.setHeader('Content-Type', att.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${att.filename}"`);
  res.sendFile(fp);
});

// Kimenő levelek szinkronizálása IMAP-ról + kapcsolatokhoz rendelés
app.post('/api/sent/sync', authenticate, async (req, res) => {
  const client = getImapClient();
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
      const lastRow = db.prepare('SELECT MAX(uid) as maxUid FROM sent_imap').get();
      const maxUid = lastRow?.maxUid || 0;

      let newCount = 0;
      let messages;
      if (maxUid > 0) {
        messages = client.fetch({ uid: `${maxUid + 1}:*` }, { uid: true, envelope: true, source: true });
      } else {
        messages = client.fetch('1:*', { uid: true, envelope: true, source: true });
      }

      for await (const msg of messages) {
        const exists = db.prepare('SELECT id FROM sent_imap WHERE uid = ?').get(msg.uid);
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
          contactId = findContactByEmail(addr);
          if (contactId) break;
        }

        const sentId = randomUUID();
        db.prepare(
          'INSERT INTO sent_imap (id, uid, message_id, from_address, from_name, to_address, subject, text_body, html_body, date, contact_id, has_attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(sentId, msg.uid, messageId, fromAddr, fromName, toAddr, subject, textBody, htmlBody, date, contactId, hasAttachments);

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
      const unlinkedImap = db.prepare('SELECT id, to_address FROM sent_imap WHERE contact_id IS NULL').all();
      let linked = 0;
      const updateImapContact = db.prepare('UPDATE sent_imap SET contact_id = ? WHERE id = ?');
      for (const msg of unlinkedImap) {
        const addrs = msg.to_address.split(',').map(a => a.trim());
        for (const addr of addrs) {
          const cid = findContactByEmail(addr);
          if (cid) { updateImapContact.run(cid, msg.id); linked++; break; }
        }
      }

      // Also link local email_log
      const unlinkedLocal = db.prepare('SELECT id, recipient_email FROM email_log WHERE contact_id IS NULL').all();
      const updateLocalContact = db.prepare('UPDATE email_log SET contact_id = ? WHERE id = ?');
      const updateAttContact = db.prepare('UPDATE attachments SET contact_id = ? WHERE email_log_id = ? AND contact_id IS NULL');
      for (const msg of unlinkedLocal) {
        const cid = findContactByEmail(msg.recipient_email);
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

app.post('/api/send-email', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { to, subject, html, cc, bcc, inReplyTo } = req.body;

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
    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = [inReplyTo];
    }

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

// ─── TÖMEGES EMAIL KÜLDÉS - mindenkit végigmegy és naplóz ───

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

// ─── BEJÖVŐ LEVELEK (IMAP) - itt jön be minden ami érkezik ─

function getImapClient() {
  return new ImapFlow({
    host: IMAP_HOST,
    port: Number(IMAP_PORT) || 993,
    secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    tls: { rejectUnauthorized: false },
    logger: false
  });
}

// Bejövő szinkronizálás - lehúzza az új leveleket IMAP-ról és eltárolja
app.post('/api/inbox/sync', authenticate, async (req, res) => {
  const client = getImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Get highest UID we already have
      const lastRow = db.prepare('SELECT MAX(uid) as maxUid FROM inbox').get();
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
        const exists = db.prepare('SELECT id FROM inbox WHERE uid = ?').get(msg.uid);
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
        const contactId = findContactByEmail(fromAddr);

        const inboxId = randomUUID();
        db.prepare(
          'INSERT INTO inbox (id, uid, message_id, from_address, from_name, to_address, subject, text_body, html_body, date, flags, contact_id, has_attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(inboxId, msg.uid, messageId, fromAddr, fromName, toAddr, subject, textBody, htmlBody, date, flags, contactId, hasAttachments);

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
      const unlinked = db.prepare('SELECT id, from_address FROM inbox WHERE contact_id IS NULL').all();
      let linked = 0;
      const updateContact = db.prepare('UPDATE inbox SET contact_id = ? WHERE id = ?');
      for (const msg of unlinked) {
        const cid = findContactByEmail(msg.from_address);
        if (cid) {
          updateContact.run(cid, msg.id);
          linked++;
        }
      }

      // Also link sent emails (email_log) that aren't linked yet
      const unlinkedSent = db.prepare('SELECT id, recipient_email FROM email_log WHERE contact_id IS NULL').all();
      const updateSentContact = db.prepare('UPDATE email_log SET contact_id = ? WHERE id = ?');
      const updateAttContact = db.prepare('UPDATE attachments SET contact_id = ? WHERE email_log_id = ? AND contact_id IS NULL');
      for (const msg of unlinkedSent) {
        const cid = findContactByEmail(msg.recipient_email);
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

  let where = '';
  let params = [];
  if (search) {
    where = 'WHERE i.subject LIKE ? OR i.from_address LIKE ? OR i.from_name LIKE ?';
    const s = `%${search}%`;
    params = [s, s, s];
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
    WHERE i.id = ?
  `).get(req.params.id);
  if (!email) return res.status(404).json({ error: 'Email not found' });

  const attachments = db.prepare(
    'SELECT id, filename, mimetype, size FROM inbox_attachments WHERE inbox_id = ?'
  ).all(req.params.id);

  res.json({ ...email, attachments });
});

// Bejövő levél csatolmányának letöltése
app.get('/api/inbox-attachments/:id/download', (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const att = db.prepare('SELECT * FROM inbox_attachments WHERE id = ?').get(req.params.id);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const fp = path.join(UPLOADS_DIR, att.stored_path);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found on disk' });

  res.setHeader('Content-Type', att.mimetype);
  res.setHeader('Content-Disposition', `inline; filename="${att.filename}"`);
  res.sendFile(fp);
});

// Bejövő levél törlése a csatolmányaival együtt
app.delete('/api/inbox/:id', authenticate, (req, res) => {
  const email = db.prepare('SELECT id FROM inbox WHERE id = ?').get(req.params.id);
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
  const templates = db.prepare('SELECT * FROM custom_templates ORDER BY updated_at DESC').all();
  res.json(templates);
});

app.post('/api/templates', authenticate, (req, res) => {
  const { name, description, category, subject, html } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = randomUUID();
  db.prepare('INSERT INTO custom_templates (id, name, description, category, subject, html) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, description || '', category || 'Custom', subject || '', html || '');
  res.json({ id, name, description, category, subject, html });
});

app.put('/api/templates/:id', authenticate, (req, res) => {
  const { name, description, category, subject, html } = req.body;
  const existing = db.prepare('SELECT id FROM custom_templates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  db.prepare('UPDATE custom_templates SET name = ?, description = ?, category = ?, subject = ?, html = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(name, description || '', category || 'Custom', subject || '', html || '', req.params.id);
  res.json({ success: true });
});

app.delete('/api/templates/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT id FROM custom_templates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  db.prepare('DELETE FROM custom_templates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── API KULCS KEZELÉS - külső appoknak generálsz kulcsot itt 

app.get('/api/api-keys', authenticate, (req, res) => {
  const keys = db.prepare('SELECT id, name, key, created_at, last_used_at, active FROM api_keys ORDER BY created_at DESC').all();
  res.json(keys);
});

app.post('/api/api-keys', authenticate, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = randomUUID();
  const key = 'imx_' + randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 16);
  db.prepare('INSERT INTO api_keys (id, name, key) VALUES (?, ?, ?)').run(id, name, key);
  res.json({ id, name, key });
});

app.delete('/api/api-keys/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/api-keys/:id/toggle', authenticate, (req, res) => {
  const existing = db.prepare('SELECT active FROM api_keys WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'API key not found' });
  db.prepare('UPDATE api_keys SET active = ? WHERE id = ?').run(existing.active ? 0 : 1, req.params.id);
  res.json({ success: true, active: !existing.active });
});

// ─── KÜLSŐ API - ezt használják a Laravel/Rust appok ─────────

function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) return res.status(401).json({ error: 'API key required. Pass via X-Api-Key header or api_key query parameter.' });
  const row = db.prepare('SELECT id, active FROM api_keys WHERE key = ?').get(apiKey);
  if (!row) return res.status(401).json({ error: 'Invalid API key' });
  if (!row.active) return res.status(403).json({ error: 'API key is disabled' });
  db.prepare('UPDATE api_keys SET last_used_at = datetime(\'now\') WHERE id = ?').run(row.id);
  next();
}

// Külső API: egyéni sablonok listázása
app.get('/api/v1/templates', authenticateApiKey, (req, res) => {
  const custom = db.prepare('SELECT id, name, description, category, subject, html, created_at, updated_at FROM custom_templates ORDER BY updated_at DESC').all();
  res.json({ templates: custom });
});

// Külső API: egy sablon lekérdezése
app.get('/api/v1/templates/:id', authenticateApiKey, (req, res) => {
  const template = db.prepare('SELECT * FROM custom_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

// Külső API: kapcsolatok listázása lapozhatóan
app.get('/api/v1/contacts', authenticateApiKey, (req, res) => {
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  let where = '';
  let params = [];
  if (search) {
    where = 'WHERE c.name LIKE ? OR c.email LIKE ?';
    const s = `%${search}%`;
    params = [s, s];
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
app.get('/api/v1/contacts/:id', authenticateApiKey, (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

// Külső API: új kapcsolat létrehozása
app.post('/api/v1/contacts', authenticateApiKey, (req, res) => {
  const { name, email, phone, notes } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  const existing = db.prepare('SELECT id FROM contacts WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'A contact with this email already exists', contact_id: existing.id });
  const id = randomUUID();
  db.prepare('INSERT INTO contacts (id, name, email, phone, notes) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, email, phone || '', notes || '');
  res.json({ id, name, email, phone: phone || '', notes: notes || '' });
});

// Külső API: kapcsolat módosítása
app.put('/api/v1/contacts/:id', authenticateApiKey, (req, res) => {
  const { name, email, phone, notes } = req.body;
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('UPDATE contacts SET name = ?, email = ?, phone = ?, notes = ? WHERE id = ?')
    .run(name || existing.name, email || existing.email, phone !== undefined ? phone : existing.phone, notes !== undefined ? notes : existing.notes, req.params.id);
  res.json({ success: true });
});

// Külső API: kapcsolat törlése
app.delete('/api/v1/contacts/:id', authenticateApiKey, (req, res) => {
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Külső API: email küldés sablonnal vagy nyers HTML-lel
app.post('/api/v1/send', authenticateApiKey, (req, res) => {
  const { to, subject, html, cc, bcc, template_id, variables } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'to and subject are required' });

  let emailHtml = html || '';
  if (template_id) {
    const tpl = db.prepare('SELECT html, subject FROM custom_templates WHERE id = ?').get(template_id);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    emailHtml = tpl.html;
  }

  if (variables && typeof variables === 'object') {
    for (const [key, value] of Object.entries(variables)) {
      emailHtml = emailHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value || '');
    }
  }

  if (!emailHtml) return res.status(400).json({ error: 'html body or template_id is required' });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Intimix Shop'}" <${process.env.SMTP_USER}>`,
    to, subject, html: emailHtml,
    ...(cc && { cc }), ...(bcc && { bcc }),
    attachments: [
      { filename: 'IntimiX.png', path: path.join(__dirname, 'assets', 'IntimiX.png'), cid: 'intimix-logo-png' },
      { filename: 'IntimiX2.svg', path: path.join(__dirname, 'assets', 'IntimiX2.svg'), cid: 'intimix-logo-header' }
    ]
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) return res.status(500).json({ error: err.message });
    const contactId = findContactByEmail(to);
    logEmail({ contactId, recipientEmail: to, subject, html: emailHtml, messageId: info.messageId, files: [] });
    res.json({ success: true, messageId: info.messageId });
  });
});

// ─── ÁRAJÁNLATOK - CRUD, PDF generálás, email küldés ────

const QUOTES_DIR = path.join(__dirname, 'quotes');
if (!fs.existsSync(QUOTES_DIR)) fs.mkdirSync(QUOTES_DIR, { recursive: true });

// Segédfüggvény: cég adatok lekérdezése az app_settings-ből
function getCompanyInfo() {
  const rows = db.prepare('SELECT key, value FROM app_settings').all();
  const info = {};
  for (const r of rows) info[r.key] = r.value;
  return info;
}

// Következő árajánlat szám generálása
function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const last = db.prepare("SELECT quote_number FROM quotes WHERE quote_number LIKE ? ORDER BY created_at DESC LIMIT 1").get(`AJ-${year}-%`);
  let seq = 1;
  if (last) {
    const parts = last.quote_number.split('-');
    seq = parseInt(parts[2] || '0', 10) + 1;
  }
  return `AJ-${year}-${String(seq).padStart(4, '0')}`;
}

// Összes árajánlat listázása
app.get('/api/quotes', authenticate, (req, res) => {
  try {
    const quotes = db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all();
    res.json({ quotes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Egy árajánlat lekérdezése tételekkel
app.get('/api/quotes/:id', authenticate, (req, res) => {
  try {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order').all(req.params.id);
    res.json({ ...quote, items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Új árajánlat létrehozása
app.post('/api/quotes', authenticate, (req, res) => {
  try {
    const { title, contact_id, contact_name, contact_email, contact_phone, contact_address, contact_vat, currency, vat_rate, notes, valid_until, items } = req.body;
    const id = randomUUID();
    const quote_number = nextQuoteNumber();

    let subtotal = 0;
    const parsedItems = (items || []).map((item, i) => {
      const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
      subtotal += itemTotal;
      return { ...item, total: itemTotal, sort_order: i };
    });
    const vatR = vat_rate ?? 27;
    const vat_amount = Math.round(subtotal * vatR / 100);
    const total = subtotal + vat_amount;

    db.prepare(`INSERT INTO quotes (id, quote_number, title, contact_id, contact_name, contact_email, contact_phone, contact_address, contact_vat, currency, vat_rate, subtotal, vat_amount, total, notes, status, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`).run(
      id, quote_number, title || '', contact_id || null, contact_name || '', contact_email || '', contact_phone || '', contact_address || '', contact_vat || '', currency || 'HUF', vatR, subtotal, vat_amount, total, notes || '', valid_until || ''
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
app.put('/api/quotes/:id', authenticate, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
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
app.delete('/api/quotes/:id', authenticate, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
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
    doc.font(font).fontSize(8).fillColor('#666');
    drawText(`Kelt: ${new Date(quote.created_at).toLocaleDateString('hu-HU')}`, M, y, { width: 150 });
    if (quote.valid_until) drawText(`\u00c9rv\u00e9nyes: ${quote.valid_until}`, M + 180, y, { width: 150 });
    drawText(`P\u00e9nznem: ${quote.currency}`, M + 360, y, { width: 100 });
    y += 18;

    doc.moveTo(M, y).lineTo(M + pageW, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 8;

    // ─── Táblázat fejléc ───
    const cols = [
      { key: 'num', label: '#', x: M, w: 25, align: 'right' },
      { key: 'desc', label: 'Megnevez\u00e9s', x: M + 25, w: 220, align: 'left' },
      { key: 'qty', label: 'Menny.', x: M + 245, w: 45, align: 'right' },
      { key: 'unit', label: 'Egys\u00e9g', x: M + 290, w: 45, align: 'right' },
      { key: 'price', label: 'Egys\u00e9g\u00e1r', x: M + 335, w: 75, align: 'right' },
      { key: 'total', label: '\u00d6sszeg', x: M + 410, w: 85, align: 'right' },
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
      y += 17;
    });

    y += 8;
    doc.moveTo(M, y).lineTo(M + pageW, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 10;

    // ─── Összesítés ───
    const sumX = M + 310;
    const sumW = pageW - 310;
    doc.font(font).fontSize(9).fillColor('#666');
    drawText('Nett\u00f3 \u00f6sszeg:', sumX, y, { width: 80 });
    drawText(formatMoney(quote.subtotal, quote.currency), sumX + 80, y, { width: sumW - 80, align: 'right' });
    y += 15;
    drawText(`\u00c1FA (${quote.vat_rate}%):`, sumX, y, { width: 80 });
    drawText(formatMoney(quote.vat_amount, quote.currency), sumX + 80, y, { width: sumW - 80, align: 'right' });
    y += 15;
    doc.moveTo(sumX, y).lineTo(sumX + sumW, y).strokeColor(accent).lineWidth(1).stroke();
    y += 8;
    doc.font(fontB).fontSize(12).fillColor(accent);
    drawText('\u00d6sszesen:', sumX, y, { width: 80 });
    drawText(formatMoney(quote.total, quote.currency), sumX + 80, y, { width: sumW - 80, align: 'right' });
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
app.get('/api/quotes/:id/pdf', authenticate, async (req, res) => {
  try {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order').all(req.params.id);
    const companyInfo = getCompanyInfo();

    // Logó fájl keresése
    let logoPath = null;
    if (companyInfo.app_logo && companyInfo.app_logo.includes('logo-file')) {
      const logoFilename = companyInfo.app_logo.split('/').pop();
      const lp = path.join(BRANDING_DIR, logoFilename);
      if (fs.existsSync(lp)) logoPath = lp;
    }

    const pdfPath = await generateQuotePdf(quote, items, companyInfo, logoPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.quote_number}.pdf"`);
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Árajánlat küldése emailben
app.post('/api/quotes/:id/send', authenticate, async (req, res) => {
  try {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    if (!quote.contact_email) return res.status(400).json({ error: 'Nincs email cím megadva a vevőnél' });

    const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order').all(req.params.id);
    const companyInfo = getCompanyInfo();

    let logoPath = null;
    if (companyInfo.app_logo && companyInfo.app_logo.includes('logo-file')) {
      const logoFilename = companyInfo.app_logo.split('/').pop();
      const lp = path.join(BRANDING_DIR, logoFilename);
      if (fs.existsSync(lp)) logoPath = lp;
    }

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

    const mailOptions = {
      from: `"${companyName}" <${process.env.SMTP_USER}>`,
      to: quote.contact_email,
      subject: customSubject || defaultSubject,
      html: customHtml || defaultHtml,
      attachments: [{ filename: `${quote.quote_number}.pdf`, path: pdfPath }]
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) return res.status(500).json({ error: err.message });
      // Státusz frissítése
      db.prepare("UPDATE quotes SET status = 'sent', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
      res.json({ success: true, messageId: info.messageId });
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BRANDING - alkalmazás neve és logó testreszabása ────

const BRANDING_DIR = path.join(__dirname, 'branding');
if (!fs.existsSync(BRANDING_DIR)) fs.mkdirSync(BRANDING_DIR, { recursive: true });

app.get('/api/branding', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM app_settings').all();
    const result = { app_name: 'Intimix', app_subtitle: 'Mailer', app_logo: '/logo-header.png' };
    for (const row of rows) {
      if (row.value) result[row.key] = row.value;
    }
    // Expose login domain so frontend can conditionally show built-in templates
    const loginEmail = process.env.LOGIN_EMAIL || '';
    result.login_domain = loginEmail.split('@')[1] || '';
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/branding', authenticate, (req, res) => {
  try {
    const allowed = ['app_name', 'app_subtitle', 'company_name', 'company_vat', 'company_email', 'company_phone', 'company_street', 'company_city', 'company_zip', 'company_country', 'company_bank_name', 'company_bank_iban'];
    const upsert = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [key, val] of Object.entries(req.body)) {
      if (allowed.includes(key) && val !== undefined) upsert.run(key, val);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branding/logo', authenticate, upload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nincs fájl feltöltve' });
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];
    if (!allowed.includes(req.file.mimetype)) return res.status(400).json({ error: 'Csak kép fájl engedélyezett (PNG, JPG, SVG, WebP, GIF)' });

    const ext = path.extname(req.file.originalname) || '.png';
    const filename = `logo${ext}`;
    const filepath = path.join(BRANDING_DIR, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const logoUrl = `/api/branding/logo-file/${filename}`;
    const upsert = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    upsert.run('app_logo', logoUrl);

    res.json({ success: true, logo: logoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/branding/logo-file/:filename', (req, res) => {
  const fp = path.join(BRANDING_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Logo not found' });
  res.sendFile(fp);
});

// ─── ENV KONFIGURÁCIÓ - beállítások oldalról szerkeszthető ────

const ENV_PATH = path.join(__dirname, '.env');
const ENV_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_NAME', 'IMAP_HOST', 'IMAP_PORT', 'IMAP_USER', 'IMAP_PASS', 'JWT_SECRET', 'LOGIN_EMAIL', 'LOGIN_PASSWORD', 'PORT'];

app.get('/api/env', authenticate, (req, res) => {
  try {
    const result = {};
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (ENV_KEYS.includes(key)) {
          result[key] = key.includes('PASS') || key === 'JWT_SECRET' ? '••••••••' : val;
        }
      }
    }
    // Fallback: show current process.env values for keys not in file
    for (const key of ENV_KEYS) {
      if (!(key in result) && process.env[key]) {
        result[key] = key.includes('PASS') || key === 'JWT_SECRET' ? '••••••••' : process.env[key];
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

    // Read existing .env or start fresh
    let existing = {};
    let extraLines = [];
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) { extraLines.push(line); continue; }
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) { extraLines.push(line); continue; }
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        existing[key] = val;
      }
    }

    // Merge updates (skip masked values so we don't overwrite secrets with dots)
    for (const [key, val] of Object.entries(updates)) {
      if (!ENV_KEYS.includes(key)) continue;
      if (val === '••••••••' || val === '') continue;
      existing[key] = val;
    }

    // Write back
    const lines = [];
    for (const key of ENV_KEYS) {
      if (key in existing) lines.push(`${key}=${existing[key]}`);
    }
    // Append any non-standard keys that were already in the file
    for (const [key, val] of Object.entries(existing)) {
      if (!ENV_KEYS.includes(key)) lines.push(`${key}=${val}`);
    }

    fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8');

    // Update process.env in memory so changes take effect without restart for some things
    for (const [key, val] of Object.entries(existing)) {
      process.env[key] = val;
    }

    res.json({ success: true, message: 'A változtatások mentve. SMTP/IMAP változásokhoz szerver újraindítás szükséges.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SMTP kapcsolat tesztelése - a beállításoknál használjuk
app.get('/api/test-smtp', authenticate, async (req, res) => {
  try {
    await transporter.verify();
    res.json({ success: true, message: 'SMTP connection is working' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
