# Pultify Server (Rust)

High-performance Rust backend for Pultify, replacing the Node.js server with identical API contracts.

## Tech Stack

- **Framework**: Axum 0.7
- **Database**: SQLite via rusqlite (bundled)
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **Encryption**: AES-256-GCM for sensitive settings
- **Email**: lettre (SMTP), async-imap (IMAP)
- **PDF**: printpdf
- **Payments**: Stripe API via reqwest
- **OAuth2**: Google & Microsoft token flows

## Building

```bash
cargo build --release
```

The binary will be at `target/release/pultify-server` (~9MB).

## Running

The server reads `.env` from `../server/.env` and uses the same `data.db` SQLite database as the Node.js server, ensuring seamless migration.

```bash
# From the server-rust directory
cargo run --release
```

Or run the binary directly:

```bash
./target/release/pultify-server
```

## Environment Variables

Same as the Node.js server:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | JWT signing secret |
| `ADMIN_EMAIL` | No | Admin login email |
| `ADMIN_PASSWORD` | No | Admin login password |
| `ENCRYPTION_KEY` | No | AES-256-GCM key (falls back to JWT_SECRET) |
| `PORT` | No | Server port (default: 3001) |
| `STRIPE_SECRET_KEY` | No | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | No | Google OAuth2 redirect URI |
| `MICROSOFT_CLIENT_ID` | No | Microsoft OAuth2 client ID |
| `MICROSOFT_CLIENT_SECRET` | No | Microsoft OAuth2 client secret |
| `MICROSOFT_REDIRECT_URI` | No | Microsoft OAuth2 redirect URI |
| `MFA_SMTP_HOST` | No | MFA email SMTP host |
| `MFA_SMTP_PORT` | No | MFA email SMTP port |
| `MFA_SMTP_USER` | No | MFA email SMTP user |
| `MFA_SMTP_PASS` | No | MFA email SMTP password |

## API Compatibility

All endpoints are identical to the Node.js backend. The React frontend works without any modifications.

## Project Structure

```
src/
├── main.rs          # Entry point, router setup, static serving
├── config.rs        # Environment config
├── crypto.rs        # AES-256-GCM encryption/decryption
├── db.rs            # SQLite schema, migrations, helpers
├── error.rs         # Error types
├── helpers.rs       # User settings, OAuth2 tokens, utilities
├── state.rs         # Shared application state
├── middleware/
│   └── auth.rs      # JWT authentication, admin, subscription checks
└── routes/
    ├── admin.rs         # Admin: users CRUD, settings, impersonate
    ├── analytics.rs     # Analytics data, CSV/PDF export
    ├── api_keys.rs      # API key CRUD
    ├── auth.rs          # Login, register, MFA, site config
    ├── backup.rs        # Backup export/import, cleanup
    ├── branding.rs      # Branding settings, logo upload
    ├── contacts.rs      # Contacts CRUD
    ├── email.rs         # Send email, bulk send, attachments
    ├── external_api.rs  # External API v1 (API key auth)
    ├── inbox.rs         # Inbox listing, IMAP sync
    ├── oauth2.rs        # Google/Microsoft OAuth2 flows
    ├── quotes.rs        # Quotes CRUD, PDF generation, email
    ├── sent.rs          # Sent emails listing, IMAP sent sync
    ├── settings.rs      # User settings, SMTP test, subscription
    ├── stripe_routes.rs # Stripe checkout, portal, webhook
    └── templates.rs     # Email templates CRUD
```
