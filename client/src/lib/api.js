// API hívások - minden backend kommunikáció innen megy ki
const API_BASE = '/api'

function getHeaders() {
  const token = localStorage.getItem('intimix_token')
  return {
    Authorization: `Bearer ${token}`
  }
}

export async function sendEmail({ to, subject, html, cc, bcc, attachments }) {
  const formData = new FormData()
  formData.append('to', to)
  formData.append('subject', subject)
  formData.append('html', html)
  if (cc) formData.append('cc', cc)
  if (bcc) formData.append('bcc', bcc)
  if (attachments) {
    attachments.forEach(file => formData.append('attachments', file))
  }

  const res = await fetch(`${API_BASE}/send-email`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to send email')
  return data
}

export async function sendBulkEmails({ recipients, subject, html, attachments }) {
  const formData = new FormData()
  formData.append('recipients', JSON.stringify(recipients))
  formData.append('subject', subject)
  formData.append('html', html)
  if (attachments) {
    attachments.forEach(file => formData.append('attachments', file))
  }

  const res = await fetch(`${API_BASE}/send-bulk`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to send bulk emails')
  return data
}

export async function testSmtp() {
  const res = await fetch(`${API_BASE}/test-smtp`, {
    headers: { ...getHeaders(), 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'SMTP test failed')
  return data
}

// ─── BRANDING ────────────────────────────────────────────────

export async function getBranding() {
  const res = await fetch(`${API_BASE}/branding`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch branding')
  return data
}

export async function updateBranding(config) {
  const res = await fetch(`${API_BASE}/branding`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update branding')
  return data
}

export async function uploadLogo(file) {
  const formData = new FormData()
  formData.append('logo', file)
  const res = await fetch(`${API_BASE}/branding/logo`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to upload logo')
  return data
}

// ─── ENV KONFIGURÁCIÓ ────────────────────────────────────────

export async function getEnvConfig() {
  const res = await fetch(`${API_BASE}/env`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch env config')
  return data
}

export async function updateEnvConfig(config) {
  const res = await fetch(`${API_BASE}/env`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update env config')
  return data
}

// ─── ÁRAJÁNLATOK ─────────────────────────────────────────────

export async function getQuotes() {
  const res = await fetch(`${API_BASE}/quotes`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch quotes')
  return data
}

export async function getQuote(id) {
  const res = await fetch(`${API_BASE}/quotes/${id}`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch quote')
  return data
}

export async function createQuote(quote) {
  const res = await fetch(`${API_BASE}/quotes`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(quote)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create quote')
  return data
}

export async function updateQuote(id, quote) {
  const res = await fetch(`${API_BASE}/quotes/${id}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(quote)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update quote')
  return data
}

export async function deleteQuote(id) {
  const res = await fetch(`${API_BASE}/quotes/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete quote')
  return data
}

export function getQuotePdfUrl(id) {
  return `${API_BASE}/quotes/${id}/pdf`
}

export async function sendQuoteEmail(id, options = {}) {
  const res = await fetch(`${API_BASE}/quotes/${id}/send`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to send quote')
  return data
}

// ─── KAPCSOLATOK ─────────────────────────────────────────────

export async function getContacts() {
  const res = await fetch(`${API_BASE}/contacts`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch contacts')
  return data
}

export async function getContact(id) {
  const res = await fetch(`${API_BASE}/contacts/${id}`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch contact')
  return data
}

export async function createContact({ name, email, phone, notes }) {
  const res = await fetch(`${API_BASE}/contacts`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, notes })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create contact')
  return data
}

export async function updateContact(id, { name, email, phone, notes }) {
  const res = await fetch(`${API_BASE}/contacts/${id}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, notes })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update contact')
  return data
}

export async function deleteContact(id) {
  const res = await fetch(`${API_BASE}/contacts/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete contact')
  return data
}

export async function getEmailDetail(id) {
  const res = await fetch(`${API_BASE}/emails/${id}`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch email')
  return data
}

export function getAttachmentUrl(id) {
  return `${API_BASE}/attachments/${id}/download`
}

// ─── BEJÖVŐ LEVELEK ──────────────────────────────────────────

export async function syncInbox() {
  const res = await fetch(`${API_BASE}/inbox/sync`, {
    method: 'POST',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to sync inbox')
  return data
}

export async function getInbox({ page = 1, limit = 50, search = '' } = {}) {
  const params = new URLSearchParams({ page, limit, search })
  const res = await fetch(`${API_BASE}/inbox?${params}`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch inbox')
  return data
}

export async function getInboxEmail(id) {
  const res = await fetch(`${API_BASE}/inbox/${id}`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch email')
  return data
}

export async function deleteInboxEmail(id) {
  const res = await fetch(`${API_BASE}/inbox/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete email')
  return data
}

export function getInboxAttachmentUrl(id) {
  return `${API_BASE}/inbox-attachments/${id}/download`
}

// ─── ELKÜLDÖTT LEVELEK ───────────────────────────────────────

export async function getSentEmails({ page = 1, limit = 50, search = '' } = {}) {
  const params = new URLSearchParams({ page, limit, search })
  const res = await fetch(`${API_BASE}/sent?${params}`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch sent emails')
  return data
}

export async function syncSent() {
  const res = await fetch(`${API_BASE}/sent/sync`, {
    method: 'POST',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to sync sent')
  return data
}

export async function getSentImapEmail(id) {
  const res = await fetch(`${API_BASE}/sent-imap/${id}`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch email')
  return data
}

export function getSentImapAttachmentUrl(id) {
  return `${API_BASE}/sent-imap-attachments/${id}/download`
}

// ─── EGYÉNI SABLONOK ─────────────────────────────────────────

export async function getCustomTemplates() {
  const res = await fetch(`${API_BASE}/templates`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch templates')
  return data
}

export async function createTemplate({ name, description, category, subject, html }) {
  const res = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, category, subject, html })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create template')
  return data
}

export async function updateTemplate(id, { name, description, category, subject, html }) {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, category, subject, html })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update template')
  return data
}

export async function deleteTemplate(id) {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete template')
  return data
}

// ─── API KULCSOK ─────────────────────────────────────────────

export async function getApiKeys() {
  const res = await fetch(`${API_BASE}/api-keys`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch API keys')
  return data
}

export async function createApiKey(name) {
  const res = await fetch(`${API_BASE}/api-keys`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create API key')
  return data
}

export async function deleteApiKey(id) {
  const res = await fetch(`${API_BASE}/api-keys/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete API key')
  return data
}

export async function toggleApiKey(id) {
  const res = await fetch(`${API_BASE}/api-keys/${id}/toggle`, {
    method: 'PUT',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to toggle API key')
  return data
}

export async function replyToEmail({ to, subject, html, cc, bcc, inReplyTo, attachments }) {
  const formData = new FormData()
  formData.append('to', to)
  formData.append('subject', subject)
  formData.append('html', html)
  if (cc) formData.append('cc', cc)
  if (bcc) formData.append('bcc', bcc)
  if (inReplyTo) formData.append('inReplyTo', inReplyTo)
  if (attachments) {
    attachments.forEach(file => formData.append('attachments', file))
  }

  const res = await fetch(`${API_BASE}/send-email`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to send reply')
  return data
}
