import { useState, useRef } from 'react'
import { emailTemplates } from '../lib/templates'
import { sendBulkEmails } from '../lib/api'
import toast from 'react-hot-toast'
import {
  Send, Paperclip, X, FileText, Users, Plus, Trash2,
  Loader2, LayoutGrid, ChevronDown
} from 'lucide-react'

export default function BulkSend() {
  const [recipients, setRecipients] = useState([{ name: '', email: '', order_id: '', tracking_number: '', tracking_url: '', delivery_time: '', delivery_phone: '' }])
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [attachments, setAttachments] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null)
  const fileInputRef = useRef(null)

  const applyTemplate = (template) => {
    setSelectedTemplate(template.id)
    setSubject(template.subject)
    setHtml(template.html)
    setShowTemplateSelector(false)
    toast.success(`Template "${template.name}" applied`)
  }

  const addRecipient = () => {
    setRecipients(prev => [...prev, { name: '', email: '', order_id: '', tracking_number: '', tracking_url: '', delivery_time: '', delivery_phone: '' }])
  }

  const removeRecipient = (index) => {
    if (recipients.length === 1) return
    setRecipients(prev => prev.filter((_, i) => i !== index))
  }

  const updateRecipient = (index, field, value) => {
    setRecipients(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    const validRecipients = recipients.filter(r => r.email)
    if (!validRecipients.length || !subject || !html) {
      toast.error('Please fill in all required fields and add at least one recipient')
      return
    }
    setSending(true)
    setResults(null)
    try {
      const data = await sendBulkEmails({
        recipients: validRecipients,
        subject,
        html,
        attachments: attachments.length > 0 ? attachments : undefined
      })
      setResults(data.results)
      const sent = data.results.filter(r => r.status === 'sent').length
      const failed = data.results.filter(r => r.status === 'failed').length
      if (failed === 0) {
        toast.success(`All ${sent} emails sent successfully!`)
      } else {
        toast(`${sent} sent, ${failed} failed`, { icon: '⚠️' })
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleCsvPaste = (e) => {
    const text = e.clipboardData.getData('text')
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length > 1 || lines[0]?.includes(',') || lines[0]?.includes('\t')) {
      e.preventDefault()
      const newRecipients = lines.map(line => {
        const parts = line.split(/[,\t]/).map(p => p.trim())
        return {
          email: parts[0] || '',
          name: parts[1] || '',
          order_id: parts[2] || '',
          tracking_number: parts[3] || '',
          tracking_url: parts[4] || '',
          delivery_time: parts[5] || '',
          delivery_phone: parts[6] || ''
        }
      }).filter(r => r.email)
      if (newRecipients.length) {
        setRecipients(newRecipients)
        toast.success(`Imported ${newRecipients.length} recipients`)
      }
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Bulk Send</h2>
        <p className="text-sm text-gray-400 mt-1">Send personalized emails to multiple customers at once</p>
      </div>

      <div className="space-y-4">
        {/* Template selector */}
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
                </button>
              ))}
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
            placeholder="Email subject (use {{name}}, {{order_id}} for personalization)"
            className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
          />
        </div>

        {/* Recipients */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1AA19C]" />
              <label className="text-sm font-medium text-gray-300">Recipients ({recipients.length})</label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Tip: Paste CSV (email, name, order_id, tracking, url)</span>
              <button
                onClick={addRecipient}
                className="flex items-center gap-1 text-xs text-[#1AA19C] hover:text-[#2EC4BE] transition-colors px-2 py-1 rounded-lg hover:bg-[#1AA19C]/10"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {recipients.map((r, i) => (
              <div key={i} className="space-y-2 p-3 rounded-xl glass-light fade-in">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="email"
                    value={r.email}
                    onChange={(e) => updateRecipient(i, 'email', e.target.value)}
                    onPaste={i === 0 ? handleCsvPaste : undefined}
                    placeholder="Email *"
                    className="input-field col-span-4 px-3 py-2 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRecipient(i, 'name', e.target.value)}
                    placeholder="Name"
                    className="input-field col-span-3 px-3 py-2 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    value={r.order_id}
                    onChange={(e) => updateRecipient(i, 'order_id', e.target.value)}
                    placeholder="Order ID"
                    className="input-field col-span-2 px-3 py-2 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    value={r.tracking_number}
                    onChange={(e) => updateRecipient(i, 'tracking_number', e.target.value)}
                    placeholder="Tracking #"
                    className="input-field col-span-2 px-3 py-2 rounded-lg text-xs"
                  />
                  <button
                    onClick={() => removeRecipient(i)}
                    disabled={recipients.length === 1}
                    className="col-span-1 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="url"
                  value={r.tracking_url}
                  onChange={(e) => updateRecipient(i, 'tracking_url', e.target.value)}
                  placeholder="Tracking URL (https://foxpost.hu/csomagkovetes/?code=...)"
                  className="input-field w-full px-3 py-2 rounded-lg text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={r.delivery_time}
                    onChange={(e) => updateRecipient(i, 'delivery_time', e.target.value)}
                    placeholder="Delivery time (11:00-14:00)"
                    className="input-field px-3 py-2 rounded-lg text-xs"
                  />
                  <input
                    type="tel"
                    value={r.delivery_phone}
                    onChange={(e) => updateRecipient(i, 'delivery_phone', e.target.value)}
                    placeholder="Courier phone (+3630...)"
                    className="input-field px-3 py-2 rounded-lg text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HTML Editor */}
        <div className="glass rounded-xl p-5">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Email Body (HTML) *</label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="HTML with {{name}}, {{order_id}}, {{tracking_number}}, {{tracking_url}}, {{delivery_time}}, {{delivery_phone}}..."
            className="input-field w-full px-4 py-3 rounded-lg text-sm font-mono min-h-[200px] resize-y"
            spellCheck={false}
          />
        </div>

        {/* Attachments */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-400">Attachments (sent to all recipients)</label>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-[#1AA19C] hover:text-[#2EC4BE] transition-colors"
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
            <p className="text-xs text-gray-500">No attachments added.</p>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || !recipients.some(r => r.email) || !subject || !html}
          className="btn-primary w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending to {recipients.filter(r => r.email).length} recipients...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send to {recipients.filter(r => r.email).length} Recipients
            </>
          )}
        </button>

        {/* Results */}
        {results && (
          <div className="glass rounded-xl p-5 fade-in">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Send Results</h3>
            <div className="space-y-1.5">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg glass-light text-xs">
                  <span className="text-gray-300">{r.email}</span>
                  <span className={r.status === 'sent' ? 'text-green-400' : 'text-red-400'}>
                    {r.status === 'sent' ? '✓ Sent' : `✗ ${r.error}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
