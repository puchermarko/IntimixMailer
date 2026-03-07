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

export async function uploadTemplateImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch(`${API_BASE}/uploads/template-image`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to upload image')
  return data
}

// ─── BRANDING ────────────────────────────────────────────────

export async function getBranding() {
  const res = await fetch(`${API_BASE}/branding`, { headers: getHeaders() })
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

export async function updateQuoteStatus(id, status) {
  const res = await fetch(`${API_BASE}/quotes/${id}/status`, {
    method: 'PATCH',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update quote status')
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

export async function createContact(contact) {
  const res = await fetch(`${API_BASE}/contacts`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create contact')
  return data
}

export async function updateContact(id, contact) {
  const res = await fetch(`${API_BASE}/contacts/${id}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
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

export async function getDownloadToken() {
  const res = await fetch(`${API_BASE}/download-token`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to get download token')
  return data.token
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
  console.log('deleteInboxEmail called with id:', id)
  console.log('Making DELETE request to:', `${API_BASE}/inbox/${id}`)
  
  const res = await fetch(`${API_BASE}/inbox/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  
  console.log('Delete response status:', res.status, res.statusText)
  console.log('Delete response headers:', Object.fromEntries(res.headers.entries()))
  
  const data = await res.json()
  console.log('Delete response data:', data)
  
  if (!res.ok) {
    console.error('Delete failed with status:', res.status)
    throw new Error(data.error || 'Failed to delete email')
  }
  
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

export async function deleteSentEmail(id) {
  const res = await fetch(`${API_BASE}/sent/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete sent email')
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

export async function deleteSentImapEmail(id) {
  const res = await fetch(`${API_BASE}/sent-imap/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete sent email')
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

export async function createTemplate({ name, description, category, subject, html, blocks_json }) {
  const res = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, category, subject, html, blocks_json })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create template')
  return data
}

export async function updateTemplate(id, { name, description, category, subject, html, blocks_json }) {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, category, subject, html, blocks_json })
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

// ─── ADMIN: USER MANAGEMENT ─────────────────────────────────

export async function getUsers() {
  const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch users')
  return data
}

export async function createUser({ email, password, name }) {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create user')
  return data
}

export async function updateUser(id, updates) {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update user')
  return data
}

export async function deleteUser(id) {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete user')
  return data
}

export async function impersonateUser(id) {
  const res = await fetch(`${API_BASE}/admin/impersonate/${id}`, {
    method: 'POST',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to impersonate user')
  return data
}

export async function getUserSettingsAdmin(id) {
  const res = await fetch(`${API_BASE}/admin/users/${id}/settings`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch user settings')
  return data
}

export async function updateUserSettingsAdmin(id, settings) {
  const res = await fetch(`${API_BASE}/admin/users/${id}/settings`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update user settings')
  return data
}

// ─── SUBSCRIPTION ───────────────────────────────────────────

export async function updateUserSubscription(id, action) {
  const res = await fetch(`${API_BASE}/admin/users/${id}/subscription`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update subscription')
  return data
}

export async function getSubscription() {
  const res = await fetch(`${API_BASE}/subscription`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch subscription')
  return data
}

// ─── STRIPE ─────────────────────────────────────────────────

export async function getStripePrices() {
  const res = await fetch(`${API_BASE}/stripe/prices`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch prices')
  return data.prices
}

export async function createStripeCheckout(priceId) {
  const res = await fetch(`${API_BASE}/stripe/create-checkout`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ price_id: priceId })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create checkout')
  return data
}

export async function openStripePortal() {
  const res = await fetch(`${API_BASE}/stripe/portal`, {
    method: 'POST',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to open portal')
  return data
}

// ─── BACKUP ─────────────────────────────────────────────────

export async function exportBackup() {
  const res = await fetch(`${API_BASE}/backup/export`, { headers: getHeaders() })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to export backup')
  }
  return res.json()
}

export async function cleanupDatabase() {
  const res = await fetch(`${API_BASE}/cleanup`, {
    method: 'POST',
    headers: getHeaders()
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to clean up database')
  return data
}

export async function importBackup(backupData) {
  const res = await fetch(`${API_BASE}/backup/import`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(backupData)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to import backup')
  return data
}

// ─── PUBLIC SITE CONFIG ──────────────────────────────────────

export async function getSiteConfig() {
  const res = await fetch(`${API_BASE}/site-config`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch site config')
  return data
}

// ─── ADMIN: GLOBAL SETTINGS ─────────────────────────────────

export async function getGlobalSettings() {
  const res = await fetch(`${API_BASE}/admin/global-settings`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch global settings')
  return data
}

export async function updateGlobalSettings(settings) {
  const res = await fetch(`${API_BASE}/admin/global-settings`, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update global settings')
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

// ─── ANALYTICS ──────────────────────────────────────────────

export async function getAnalytics(days = 30) {
  const res = await fetch(`${API_BASE}/analytics?days=${days}`, { headers: getHeaders() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch analytics')
  return data
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/change-password`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to change password')
  return data
}

export async function deleteAccount(password) {
  const res = await fetch(`${API_BASE}/account`, {
    method: 'DELETE',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Failed to delete account')
    err.hasActiveSubscription = data.has_active_subscription || false
    throw err
  }
  return data
}
