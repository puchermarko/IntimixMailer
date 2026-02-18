import { useState, useRef, useEffect } from 'react'
import { emailTemplates } from '../lib/templates'
import { sendEmail, getContacts } from '../lib/api'
import toast from 'react-hot-toast'
import {
  Send, Paperclip, X, FileText, ChevronDown, ChevronUp,
  Eye, Code, Loader2, LayoutGrid, BookUser, UserPen, Search
} from 'lucide-react'

import SimpleRichEditor from './SimpleRichEditor'

export default function ComposeEmail() {
  const [to, setTo] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [orderId, setOrderId] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [attachments, setAttachments] = useState([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [editorMode, setEditorMode] = useState('visual') // 'visual' | 'code'
  const [sending, setSending] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [recipientMode, setRecipientMode] = useState('manual') // 'manual' | 'contact'
  const [contacts, setContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    getContacts().then(setContacts).catch(() => {})
  }, [])

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase())
  )

  const selectContact = (contact) => {
    setSelectedContact(contact)
    setTo(contact.email)
    setRecipientName(contact.name)
    setContactSearch('')
  }

  const clearContact = () => {
    setSelectedContact(null)
    setTo('')
    setRecipientName('')
  }

  const applyTemplate = (template) => {
    setSelectedTemplate(template.id)
    setSubject(template.subject)
    setHtml(template.html)
    setShowTemplateSelector(false)
    toast.success(`Template "${template.name}" applied`)
  }

  const replaceVariables = (raw) => {
    return raw
      .replace(/\{\{name\}\}/gi, recipientName || '{{name}}')
      .replace(/\{\{email\}\}/gi, to || '{{email}}')
      .replace(/\{\{order_id\}\}/gi, orderId || '{{order_id}}')
      .replace(/\{\{tracking_number\}\}/gi, trackingNumber || '{{tracking_number}}')
      .replace(/\{\{tracking_url\}\}/gi, trackingUrl || '{{tracking_url}}')
      .replace(/\{\{delivery_time\}\}/gi, deliveryTime || '{{delivery_time}}')
      .replace(/\{\{delivery_phone\}\}/gi, deliveryPhone || '{{delivery_phone}}')
  }

  const getProcessedHtml = () => {
    return replaceVariables(html)
  }

  const getPreviewHtml = () => {
    return replaceVariables(html)
      .replace(/cid:intimix-logo-header/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/nyl/588/ikm/IntimiX2.svg')
      .replace(/cid:intimix-logo-png/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/mwf/5mo/xol/IntimiX.png')
  }

  const getProcessedSubject = () => {
    return subject
      .replace(/\{\{name\}\}/gi, recipientName || '{{name}}')
      .replace(/\{\{order_id\}\}/gi, orderId || '{{order_id}}')
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!to || !subject || !html) {
      toast.error('Please fill in all required fields')
      return
    }
    setSending(true)
    try {
      await sendEmail({
        to,
        subject: getProcessedSubject(),
        html: getProcessedHtml(),
        cc: cc || undefined,
        bcc: bcc || undefined,
        attachments: attachments.length > 0 ? attachments : undefined
      })
      toast.success('Email sent successfully!')
      setTo('')
      setRecipientName('')
      setOrderId('')
      setTrackingNumber('')
      setTrackingUrl('')
      setDeliveryTime('')
      setDeliveryPhone('')
      setSubject('')
      setHtml('')
      setCc('')
      setBcc('')
      setAttachments([])
      setSelectedTemplate(null)
      setSelectedContact(null)
      setRecipientMode('manual')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Compose Email</h2>
        <p className="text-sm text-gray-400 mt-1">Send personalized emails to your customers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Template selector button */}
          <div className="glass rounded-xl p-5">
            <button
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl glass-light hover:border-[#1AA19C]/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 text-[#1AA19C]" />
                <span className="text-sm font-medium">
                  {selectedTemplate
                    ? emailTemplates.find(t => t.id === selectedTemplate)?.name
                    : 'Select a template'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTemplateSelector ? 'rotate-180' : ''}`} />
            </button>

            {showTemplateSelector && (
              <div className="mt-3 grid grid-cols-2 gap-2 fade-in">
                {emailTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`template-card p-3 rounded-xl text-left ${selectedTemplate === template.id ? 'selected' : ''}`}
                  >
                    <p className="text-sm font-medium text-gray-200">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-[#1AA19C]/10 text-[#2EC4BE] border border-[#1AA19C]/20">
                      {template.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recipient fields */}
          <div className="glass rounded-xl p-5 space-y-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setRecipientMode('contact'); clearContact() }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  recipientMode === 'contact'
                    ? 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <BookUser className="w-3.5 h-3.5" />
                From Contact
              </button>
              <button
                onClick={() => { setRecipientMode('manual'); setSelectedContact(null) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  recipientMode === 'manual'
                    ? 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <UserPen className="w-3.5 h-3.5" />
                Manual
              </button>
            </div>

            {/* Contact picker */}
            {recipientMode === 'contact' && (
              <div className="fade-in">
                {selectedContact ? (
                  <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1AA19C]/15 flex items-center justify-center text-[#2EC4BE] text-xs font-bold">
                        {selectedContact.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{selectedContact.name}</p>
                        <p className="text-xs text-gray-500">{selectedContact.email}</p>
                      </div>
                    </div>
                    <button onClick={clearContact} className="text-gray-500 hover:text-gray-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Search contacts..."
                        className="input-field w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
                        autoFocus
                      />
                    </div>
                    {contacts.length === 0 ? (
                      <p className="text-xs text-gray-500 mt-2 text-center py-3">No contacts yet. Create one in the Contacts tab.</p>
                    ) : (
                      <div className="mt-2 max-h-[200px] overflow-y-auto space-y-1">
                        {filteredContacts.map(c => (
                          <button
                            key={c.id}
                            onClick={() => selectContact(c)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-all"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#1AA19C]/10 flex items-center justify-center text-[#2EC4BE] text-[10px] font-bold shrink-0">
                              {c.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-200 truncate">{c.name}</p>
                              <p className="text-xs text-gray-500 truncate">{c.email}</p>
                            </div>
                          </button>
                        ))}
                        {filteredContacts.length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-3">No contacts match your search</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual email/name fields (always shown in manual mode, hidden when contact selected) */}
            {(recipientMode === 'manual' || !selectedContact) && recipientMode === 'manual' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 fade-in">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Recipient Email *</label>
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="customer@example.com"
                    className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="John Doe"
                    className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Order ID</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="12345"
                  className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="HU1234567890"
                  className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Tracking URL</label>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://foxpost.hu/csomagkovetes/?code=..."
                className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Delivery Time</label>
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="11:00-14:00 között"
                  className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Delivery Phone</label>
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="+3630 123 4567"
                  className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Advanced fields */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              CC / BCC fields
            </button>
            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 fade-in">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">CC</label>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">BCC</label>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="glass rounded-xl p-5">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
            />
            {subject && (
              <p className="text-xs text-gray-500 mt-2">
                Preview: <span className="text-gray-300">{getProcessedSubject()}</span>
              </p>
            )}
          </div>

          {/* HTML Editor */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-400">Email Body</label>
                {/* Mode Toggle */}
                {!showPreview && (
                  <div className="flex bg-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => setEditorMode('visual')}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                        editorMode === 'visual' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      onClick={() => setEditorMode('code')}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                        editorMode === 'code' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      Code
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] transition-colors"
              >
                {showPreview ? (
                  <>
                    {editorMode === 'visual' ? <FileText className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </>
                )}
              </button>
            </div>

            {showPreview ? (
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full rounded-lg min-h-[300px] max-h-[500px] border-0 bg-white"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            ) : (
              <>
                {editorMode === 'visual' ? (
                  <SimpleRichEditor
                    initialHtml={html}
                    onChange={setHtml}
                    className="min-h-[300px]"
                  />
                ) : (
                  <textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    placeholder="Paste or write your HTML email content here..."
                    className="input-field w-full px-4 py-3 rounded-lg text-sm font-mono min-h-[300px] resize-y"
                    spellCheck={false}
                  />
                )}
              </>
            )}
          </div>

          {/* Attachments */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-400">Attachments</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Add file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg glass-light">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1AA19C]" />
                      <span className="text-sm text-gray-300">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No attachments. Supports PDF, DOC, images, and more.</p>
            )}
          </div>
        </div>

        {/* Right sidebar - Preview & Send */}
        <div className="space-y-4">
          {/* Live preview card */}
          <div className="glass rounded-xl p-5 sticky top-8">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Live Preview</h3>
            <div className="rounded-lg overflow-hidden max-h-[400px]">
              {html ? (
                <iframe
                  srcDoc={getPreviewHtml()}
                  className="w-full h-[400px] border-0 bg-white rounded-lg"
                  sandbox="allow-same-origin"
                  title="Live preview"
                  style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '166%', height: '666px' }}
                />
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Select a template or write HTML to see preview
                </div>
              )}
            </div>

            {/* Variable status */}
            <div className="mt-4 space-y-1.5">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Template Variables</p>
              {[
                { label: 'Name', value: recipientName },
                { label: 'Email', value: to },
                { label: 'Order ID', value: orderId },
                { label: 'Tracking', value: trackingNumber },
                { label: 'Tracking URL', value: trackingUrl },
                { label: 'Delivery Time', value: deliveryTime },
                { label: 'Delivery Phone', value: deliveryPhone },
              ].map(v => (
                <div key={v.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{`{{${v.label.toLowerCase()}}}`}</span>
                  <span className={v.value ? 'text-green-400' : 'text-gray-600'}>
                    {v.value || 'not set'}
                  </span>
                </div>
              ))}
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || !to || !subject || !html}
              className="btn-primary w-full mt-5 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
