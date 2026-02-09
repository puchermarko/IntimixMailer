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

// ─── CONTACTS ────────────────────────────────────────────────

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
