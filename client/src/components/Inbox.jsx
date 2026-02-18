import { useState, useEffect, useRef } from 'react'
import {
  Inbox as InboxIcon, RefreshCw, Search, Trash2, Paperclip, ChevronLeft,
  ChevronRight, ArrowLeft, Download, User, Clock, FileText, X,
  Reply, Send, Loader2, Code, Eye
} from 'lucide-react'
import { syncInbox, getInbox, getInboxEmail, deleteInboxEmail, getInboxAttachmentUrl, replyToEmail, getEnvConfig, getDownloadToken } from '../lib/api'
import SimpleRichEditor from './SimpleRichEditor'

export default function InboxView() {
  const [emails, setEmails] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [emailDetail, setEmailDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [toast, setToast] = useState(null)
  const [showReply, setShowReply] = useState(false)
  const [replyHtml, setReplyHtml] = useState('')
  const [sending, setSending] = useState(false)
  const [editorMode, setEditorMode] = useState('visual') // 'visual' | 'code'
  const limit = 50
  const iframeRef = useRef(null)
  const replyRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchEmails = async (p = page, s = search) => {
    setLoading(true)
    try {
      const data = await getInbox({ page: p, limit, search: s })
      setEmails(data.emails)
      setTotal(data.total)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmails()
    // Auto-sync if user has it enabled
    getEnvConfig().then(cfg => {
      if (cfg.auto_sync === 'true') {
        setSyncing(true)
        syncInbox()
          .then(result => {
            let msg = `Synced! ${result.newEmails} new email${result.newEmails !== 1 ? 's' : ''} fetched.`
            if (result.linked > 0) msg += ` ${result.linked} email${result.linked !== 1 ? 's' : ''} linked to contacts.`
            showToast(msg)
            fetchEmails(1, '')
          })
          .catch(() => {})
          .finally(() => setSyncing(false))
      }
    }).catch(() => {})
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await syncInbox()
      let msg = `Synced! ${result.newEmails} new email${result.newEmails !== 1 ? 's' : ''} fetched.`
      if (result.linked > 0) msg += ` ${result.linked} email${result.linked !== 1 ? 's' : ''} linked to contacts.`
      showToast(msg)
      await fetchEmails(1, search)
      setPage(1)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
    fetchEmails(1, searchInput)
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchEmails(newPage, search)
  }

  const openEmail = async (email) => {
    setSelectedEmail(email.id)
    setLoadingDetail(true)
    try {
      const detail = await getInboxEmail(email.id)
      setEmailDetail(detail)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this email?')) return
    try {
      await deleteInboxEmail(id)
      showToast('Email deleted')
      setSelectedEmail(null)
      setEmailDetail(null)
      setShowReply(false)
      fetchEmails(page, search)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleReply = () => {
    setShowReply(true)
    setReplyHtml('')
    setTimeout(() => replyRef.current?.focus(), 100)
  }

  const handleSendReply = async () => {
    if (!replyHtml.trim()) return showToast('Please write a reply', 'error')
    setSending(true)
    try {
      const originalDate = new Date(emailDetail.date).toLocaleString('hu-HU')
      const originalFrom = emailDetail.from_name
        ? `${emailDetail.from_name} &lt;${emailDetail.from_address}&gt;`
        : emailDetail.from_address

      const fullHtml = `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
          ${replyHtml.replace(/\n/g, '<br>')}
        </div>
        <br>
        <div style="border-left:2px solid #ccc;padding-left:12px;margin-top:16px;color:#666;font-size:13px;">
          <p style="margin:0 0 8px;"><strong>On ${originalDate}, ${originalFrom} wrote:</strong></p>
          ${emailDetail.html_body || emailDetail.text_body?.replace(/\n/g, '<br>') || ''}
        </div>
      `

      const subject = emailDetail.subject?.startsWith('Re:')
        ? emailDetail.subject
        : `Re: ${emailDetail.subject}`

      await replyToEmail({
        to: emailDetail.from_address,
        subject,
        html: fullHtml,
        inReplyTo: emailDetail.message_id || undefined
      })

      showToast('Reply sent!')
      setShowReply(false)
      setReplyHtml('')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const totalPages = Math.ceil(total / limit)
  const [dlToken, setDlToken] = useState('')
  useEffect(() => { getDownloadToken().then(t => setDlToken(t)).catch(() => {}) }, [])

  // ─── Email Detail View ───
  if (selectedEmail && emailDetail) {
    return (
      <div className="space-y-6 fade-in">
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-[#1AA19C]/90 text-white'
          }`}>{toast.message}</div>
        )}

        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedEmail(null); setEmailDetail(null) }}
            className="flex items-center gap-2 text-gray-400 hover:text-[#2EC4BE] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Inbox
          </button>
        </div>

        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-white mb-2">{emailDetail.subject}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-gray-200">{emailDetail.from_name || emailDetail.from_address}</span>
                  {emailDetail.from_name && (
                    <span className="text-gray-500">&lt;{emailDetail.from_address}&gt;</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(emailDetail.date).toLocaleString('hu-HU')}
                </div>
                {emailDetail.contact_name && (
                  <span className="px-2 py-0.5 rounded-full bg-[#1AA19C]/15 text-[#2EC4BE] text-xs font-medium">
                    Contact: {emailDetail.contact_name}
                  </span>
                )}
              </div>
              {emailDetail.to_address && (
                <p className="text-xs text-gray-500 mt-1">To: {emailDetail.to_address}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReply}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#2EC4BE] hover:bg-[#1AA19C]/10 rounded-lg transition-all">
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button onClick={() => handleDelete(emailDetail.id)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Attachments */}
          {emailDetail.attachments && emailDetail.attachments.length > 0 && (
            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                {emailDetail.attachments.length} attachment{emailDetail.attachments.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {emailDetail.attachments.map(att => (
                  <a key={att.id}
                    href={`${getInboxAttachmentUrl(att.id)}?token=${dlToken}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-all">
                    <FileText className="w-3.5 h-3.5 text-[#2EC4BE]" />
                    <span className="truncate max-w-[200px]">{att.filename}</span>
                    <span className="text-xs text-gray-500">({(att.size / 1024).toFixed(1)}KB)</span>
                    <Download className="w-3 h-3 text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Email body */}
          <div className="border-t border-white/5 pt-4">
            {emailDetail.html_body ? (
              <div className="bg-white rounded-lg overflow-hidden">
                <iframe
                  ref={iframeRef}
                  srcDoc={emailDetail.html_body}
                  className="w-full border-0"
                  style={{ minHeight: '400px' }}
                  onLoad={() => {
                    if (iframeRef.current) {
                      const doc = iframeRef.current.contentDocument
                      if (doc) {
                        const h = doc.documentElement.scrollHeight
                        iframeRef.current.style.height = Math.min(Math.max(h, 200), 800) + 'px'
                      }
                    }
                  }}
                  sandbox="allow-same-origin"
                  title="Email content"
                />
              </div>
            ) : (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-white/5 rounded-lg p-4 max-h-[600px] overflow-auto">
                {emailDetail.text_body || '(No content)'}
              </pre>
            )}
          </div>

          {/* Reply Composer */}
          {showReply && (
            <div className="border-t border-white/5 pt-4 space-y-3 fade-in">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5" />
                  Replying to <span className="text-gray-200">{emailDetail.from_name || emailDetail.from_address}</span>
                </p>
                <button onClick={() => setShowReply(false)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                ref={replyRef}
                value={replyHtml}
                onChange={(e) => setReplyHtml(e.target.value)}
                placeholder="Write your reply..."
                className="input-field w-full min-h-[150px] resize-y text-sm"
              />
              <div className="flex justify-end">
                <button onClick={handleSendReply} disabled={sending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1AA19C] hover:bg-[#2EC4BE] text-white text-sm font-medium transition-all disabled:opacity-50">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Email List View ───
  return (
    <div className="space-y-6 fade-in">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-[#1AA19C]/90 text-white'
        }`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <InboxIcon className="w-7 h-7 text-[#1AA19C]" />
            Inbox
          </h1>
          <p className="text-gray-400 text-sm mt-1">{total} email{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1AA19C] hover:bg-[#2EC4BE] text-white text-sm font-medium transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Inbox'}
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search by subject, sender..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="input-field w-full pl-10 pr-10"
        />
        {searchInput && (
          <button type="button" onClick={() => { setSearchInput(''); setSearch(''); fetchEmails(1, '') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Email list */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center">
            <InboxIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              {search ? 'No emails match your search' : 'Inbox is empty. Click "Sync Inbox" to fetch emails.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {emails.map(email => (
              <button key={email.id} onClick={() => openEmail(email)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-all text-left group">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#1AA19C]/15 flex items-center justify-center text-[#2EC4BE] text-xs font-bold flex-shrink-0">
                  {(email.from_name || email.from_address)?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {email.from_name || email.from_address}
                    </span>
                    {email.contact_name && (
                      <span className="px-1.5 py-0.5 rounded bg-[#1AA19C]/10 text-[#2EC4BE] text-[10px] font-medium flex-shrink-0">
                        {email.contact_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 truncate">{email.subject}</p>
                  {email.from_name && (
                    <p className="text-xs text-gray-500 truncate">{email.from_address}</p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {email.has_attachments === 1 && (
                    <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(email.date)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages} ({total} emails)
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
