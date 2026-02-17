# Pultify - Technical Documentation

## Overview

Pultify is a multi-tenant email marketing and customer relationship management web application built with a Node.js/Express backend and React frontend. It provides email sending, IMAP synchronization, contact management, quote generation, and analytics capabilities with subscription-based access control.

## Architecture

### Technology Stack

**Backend:**
- **Runtime:** Node.js (ESM modules)
- **Framework:** Express.js
- **Database:** SQLite with better-sqlite3 driver
- **Authentication:** JWT (JSON Web Tokens)
- **Email:** Nodemailer for SMTP, ImapFlow for IMAP
- **Encryption:** AES-256-GCM for sensitive data
- **Security:** bcryptjs for password hashing, express-rate-limit
- **Payments:** Stripe integration
- **PDF Generation:** PDFKit

**Frontend:**
- **Framework:** React 19 with hooks
- **Build Tool:** Vite
- **Routing:** React Router DOM
- **Styling:** TailwindCSS
- **Icons:** Lucide React
- **Notifications:** react-hot-toast
- **Charts:** Recharts

### Project Structure

```
IntimixMailer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # API utilities
│   │   └── pages/         # Route pages
│   ├── dist/              # Built frontend
│   └── package.json
├── server/                # Node.js backend
│   ├── index.js          # Main server file
│   ├── db.js             # Database schema & migrations
│   ├── uploads/          # File upload storage
│   ├── branding/         # User branding assets
│   ├── quotes/           # Generated quote PDFs
│   ├── fonts/            # Custom fonts
│   └── package.json
└── docs/                 # Documentation
```

## Database Schema

### Core Tables

**Users Table:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,           -- bcrypt hash
  name TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  subscription_status TEXT DEFAULT 'none',  -- none, trial, active, expired, past_due
  subscription_type TEXT DEFAULT '',
  trial_start TEXT,
  trial_end TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**User Settings (Multi-tenant):**
```sql
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT DEFAULT '',  -- Encrypted for sensitive keys
  UNIQUE(user_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Contacts Table:**
```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
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
```

**Email Log & Attachments:**
```sql
CREATE TABLE email_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  contact_id TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  message_id TEXT,
  status TEXT DEFAULT 'sent',
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE TABLE attachments (
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
```

**IMAP Synchronization Tables:**
```sql
CREATE TABLE inbox (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
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

CREATE TABLE sent_imap (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
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
```

## Security Implementation

### Authentication System

**JWT Token Structure:**
```javascript
{
  role: 'admin' | 'user',
  userId: string,
  email: string,
  impersonating?: string,      // Admin impersonation
  impersonatingName?: string,
  impersonatingEmail?: string
}
```

**Authentication Middleware:**
```javascript
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.impersonating || decoded.userId || '';
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Admin Impersonation:**
- Admins can impersonate users via `/api/admin/impersonate/:id`
- Impersonation tokens include `impersonating` field
- Effective user ID is resolved: `decoded.impersonating || decoded.userId`

### Password Security

**User Passwords:**
- Hashed with bcrypt (10 rounds)
- Automatic migration from plain-text on startup
- Minimum 6 characters (configurable)

**Admin Password:**
- Hashed at server startup from `ADMIN_PASSWORD` env var
- Uses bcrypt.compareSync() for verification
- No plain-text storage

### Data Encryption

**Sensitive Settings Encryption:**
```javascript
const SENSITIVE_SETTING_KEYS = ['smtp_pass', 'imap_pass'];

function encryptValue(plaintext) {
  if (!plaintext) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENC_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptValue(stored) {
  if (!stored || !stored.startsWith('enc:')) return stored;
  try {
    const [, ivHex, tagHex, encrypted] = stored.split(':');
    const decipher = createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return stored;  // Fallback for decryption errors
  }
}
```

**Encryption Key:**
- Derived from `ENCRYPTION_KEY` or fallback to `JWT_SECRET`
- Uses scrypt with static salt `'intimix-salt'`
- 32-byte key for AES-256-GCM

### Rate Limiting

**Rate Limiters Applied:**
```javascript
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: { error: 'Túl sok bejelentkezési kísérlet. Próbáld újra 15 perc múlva.' }
});

const registerLimiter = rateLimit({ 
  windowMs: 60 * 60 * 1000, 
  max: 10 
});

const sendLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100 
});

const apiLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 200 
});
```

**Protected Endpoints:**
- `/api/login` - authLimiter
- `/api/register` - registerLimiter  
- `/api/send-email` - sendLimiter
- `/api/send-bulk` - sendLimiter
- All `/api/v1/*` - apiLimiter

### CORS Configuration

```javascript
app.use(cors({
  origin: [
    'https://marketing.intimix.hu',
    'https://pult.lakicsfesto.com', 
    'https://pultify.hu'
  ],
  credentials: true
}));
```

### File Security

**Attachment Download Security:**
- Short-lived download tokens (5-minute expiry)
- User ownership verification via JOIN queries
- Token endpoint: `/api/download-token`

**Example Ownership Check:**
```javascript
const att = db.prepare(
  'SELECT a.* FROM attachments a JOIN email_log e ON a.email_log_id = e.id WHERE a.id = ? AND e.user_id = ?'
).get(req.params.id, userId);
```

**File Upload Security:**
- Multer with memory storage (10MB limit)
- File type validation for logos
- Stored in `server/uploads/` with UUID filenames

### API Key Security

**External API Authentication:**
```javascript
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const row = db.prepare('SELECT id, user_id, active FROM api_keys WHERE key = ?').get(apiKey);
  
  // Verify API key exists and is active
  // Check user subscription status
  // Update last_used_at timestamp
}
```

**Subscription Verification:**
- API keys require active/trial subscription
- Trial expiration checked on each request
- Returns 403 if subscription inactive

## Core Features

### Email Management

**SMTP Configuration:**
- Per-user SMTP settings (encrypted storage)
- TLS configuration with `rejectUnauthorized: false`
- Connection testing endpoint

**Email Sending:**
- Single email via `/api/send-email`
- Bulk email via `/api/send-bulk`
- Template-based sending with variable substitution
- Attachment support (up to 5 files, 10MB each)
- CID image embedding (domain-gated)

**IMAP Synchronization:**
- Inbox sync via `/api/inbox/sync`
- Sent items sync via `/api/sent/sync`
- UID-based incremental sync
- Automatic contact linking by email address

### Contact Management

**Contact CRUD:**
- Full contact information including address fields
- Email uniqueness per user
- Automatic linking to emails
- Bulk operations support

**Contact Analytics:**
- Email sent/received counts
- Response rate calculation
- Top contacts reporting

### Quote System

**Quote Generation:**
- Automatic quote numbering (per user)
- Multi-currency support
- VAT calculation (default 27%)
- PDF generation with custom branding

**Quote Features:**
- Draft/Sent/Accepted/Rejected status tracking
- Email delivery of quotes
- Itemized line items
- Company information integration

### Analytics & Reporting

**Analytics Data:**
- Daily sent/received email counts
- Contact interaction metrics
- Quote statistics
- Response rate trends

**Export Options:**
- CSV export with full analytics
- PDF export with charts and tables
- Configurable time ranges (7/30/90 days)

### Subscription Management

**Subscription Types:**
- Trial (30 days)
- Active (paid via Stripe)
- Expired/Past Due

**Stripe Integration:**
- Checkout sessions for subscriptions
- Customer portal access
- Webhook event handling
- Automatic status updates

## API Endpoints

### Authentication
- `POST /api/login` - User/admin login
- `POST /api/register` - User registration
- `GET /api/subscription` - Get subscription status

### Email Operations
- `POST /api/send-email` - Send single email
- `POST /api/send-bulk` - Send bulk emails
- `POST /api/inbox/sync` - Sync IMAP inbox
- `POST /api/sent/sync` - Sync IMAP sent items

### Contact Management
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Templates
- `GET /api/templates` - List custom templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Quotes
- `GET /api/quotes` - List quotes
- `POST /api/quotes` - Create quote
- `PUT /api/quotes/:id` - Update quote
- `GET /api/quotes/:id/pdf` - Download quote PDF
- `POST /api/quotes/:id/send` - Email quote

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/analytics/export/csv` - Export CSV
- `GET /api/analytics/export/pdf` - Export PDF

### External API (`/api/v1/*`)
- `GET /api/v1/templates` - List templates
- `GET /api/v1/contacts` - List contacts
- `POST /api/v1/contacts` - Create contact
- `POST /api/v1/send` - Send email via template

## Security Considerations

### Implemented Protections
1. **Authentication:** JWT with 24-hour expiry
2. **Authorization:** Role-based access control
3. **Data Encryption:** AES-256-GCM for sensitive settings
4. **Rate Limiting:** Multiple tiers of protection
5. **Input Validation:** Email format, password requirements
6. **SQL Injection Prevention:** Parameterized queries throughout
7. **XSS Prevention:** Content Security Policy via iframes
8. **File Upload Security:** Type validation, size limits
9. **CORS:** Restricted to production domains

### Remaining Considerations
1. **Password Policy:** Currently minimum 6 characters only
2. **Session Management:** No session invalidation on password change
3. **Audit Logging:** Limited security event logging
4. **Backup Security:** Encrypted passwords in backups
5. **Environment Variables:** Some sensitive data in .env files

## Deployment Notes

### Environment Variables Required
```bash
# Core
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Admin Access
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional (for testing)
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_USER=info@example.com
SMTP_PASS=your_smtp_password
```

### Database Setup
- SQLite database at `server/data.db`
- Automatic schema migrations on startup
- WAL mode enabled for performance
- Foreign key constraints enforced

### File Storage
- `server/uploads/` - Email attachments
- `server/branding/` - User logos (per-user subdirectories)
- `server/quotes/` - Generated quote PDFs

### SSL/TLS Configuration
- SMTP/IMAP connections use TLS (cert validation disabled for compatibility)
- Production should use proper SSL certificates
- Consider using Let's Encrypt for HTTPS

## Performance Considerations

### Database Optimization
- Indexed on frequently queried fields (user_id, email, dates)
- WAL mode for concurrent reads/writes
- Prepared statements used throughout

### Caching Strategy
- JWT tokens cached in localStorage (client)
- Download tokens cached for 5 minutes
- No server-side caching currently implemented

### File Handling
- Memory storage for uploads (10MB limit)
- UUID-based filenames to prevent collisions
- Automatic cleanup on contact deletion

## Monitoring & Logging

### Current Logging
- Console-based error logging
- Stripe webhook event logging
- Migration completion logging

### Recommended Monitoring
- Failed login attempts
- Rate limit violations
- Email sending failures
- Database connection health
- File storage usage

## Development Notes

### Local Development Setup
```bash
# Backend
cd server
npm install
cp .env.example .env  # Configure variables
npm run dev

# Frontend  
cd client
npm install
npm run dev
```

### Database Migrations
- Automatic on startup
- Schema versioning via `addColumnIfMissing()`
- Backward compatible changes only

### Testing Considerations
- Unit tests for encryption functions
- Integration tests for API endpoints
- Security testing for authentication flows
- Load testing for rate limiting

---

*This documentation covers the current implementation as of the latest commit. For the most up-to-date information, refer to the source code and inline comments.*
