import { useState, useEffect, useRef } from 'react'
import {
  Send as SendIcon, Search, Paperclip, ChevronLeft, ChevronRight,
  ArrowLeft, Download, User, Clock, FileText, X, RefreshCw, Loader2
} from 'lucide-react'
import { getSentEmails, getEmailDetail, getAttachmentUrl, getSentImapEmail, getSentImapAttachmentUrl, syncSent, getEnvConfig, getDownloadToken } from '../lib/api'

export default function SentView() {
  const [emails, setEmails] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [selectedSource, setSelectedSource] = useState(null)
  const [emailDetail, setEmailDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [toast, setToast] = useState(null)
  const limit = 50
  const iframeRef = useRef(null)

  const [dlToken, setDlToken] = useState('')
  useEffect(() => { getDownloadToken().then(t => setDlToken(t)).catch(() => {}) }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchEmails = async (p = page, s = search) => {
    setLoading(true)
    try {
      const data = await getSentEmails({ page: p, limit, search: s })
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
        syncSent()
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
      const result = await syncSent()
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
    setSelectedSource(email.source)
    setLoadingDetail(true)
    try {
      const detail = email.source === 'imap'
        ? await getSentImapEmail(email.id)
        : await getEmailDetail(email.id)
      setEmailDetail(detail)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoadingDetail(false)
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

  const getDetailAttUrl = (attId) => {
    if (selectedSource === 'imap') return `${getSentImapAttachmentUrl(attId)}?token=${dlToken}`
    return `${getAttachmentUrl(attId)}?token=${dlToken}`
  }

  const totalPages = Math.ceil(total / limit)

  // ─── Email Detail View ───
  if (selectedEmail && emailDetail) {
    const isImap = selectedSource === 'imap'
    const recipient = isImap ? emailDetail.to_address : emailDetail.recipient_email
    const dateStr = isImap ? emailDetail.date : emailDetail.sent_at
    const bodyHtml = isImap ? emailDetail.html_body : emailDetail.html
    const bodyText = isImap ? emailDetail.text_body : null

    return (
      <div className="space-y-6 fade-in">
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-[#1AA19C]/90 text-white'
          }`}>{toast.message}</div>
        )}

        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedEmail(null); setEmailDetail(null); setSelectedSource(null) }}
            className="flex items-center gap-2 text-gray-400 hover:text-[#2EC4BE] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Sent
          </button>
        </div>

        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white mb-2">{emailDetail.subject}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span className="text-gray-500">To:</span>
                <span className="text-gray-200">{recipient}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(dateStr).toLocaleString('hu-HU')}
              </div>
              {emailDetail.contact_name && (
                <span className="px-2 py-0.5 rounded-full bg-[#1AA19C]/15 text-[#2EC4BE] text-xs font-medium">
                  Contact: {emailDetail.contact_name}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs font-medium">sent</span>
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
                    href={getDetailAttUrl(att.id)}
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
            {bodyHtml ? (
              <div className="bg-white rounded-lg overflow-hidden">
                <iframe
                  ref={iframeRef}
                  srcDoc={bodyHtml.replace(/cid:intimix-logo-png/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/mwf/5mo/xol/IntimiX.png')}
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
            ) : bodyText ? (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-white/5 rounded-lg p-4 max-h-[600px] overflow-auto">
                {bodyText}
              </pre>
            ) : (
              <p className="text-gray-500 text-sm">(No content)</p>
            )}
          </div>
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
            <SendIcon className="w-7 h-7 text-[#1AA19C]" />
            Sent
          </h1>
          <p className="text-gray-400 text-sm mt-1">{total} email{total !== 1 ? 's' : ''} sent</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1AA19C] hover:bg-[#2EC4BE] text-white text-sm font-medium transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Sent'}
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search by subject, recipient..."
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
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center">
            <SendIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              {search ? 'No sent emails match your search' : 'No emails sent yet. Click "Sync Sent" to fetch from server.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {emails.map(email => (
              <button key={`${email.source}-${email.id}`} onClick={() => openEmail(email)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-all text-left group">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#1AA19C]/15 flex items-center justify-center text-[#2EC4BE] text-xs font-bold flex-shrink-0">
                  {(email.contact_name || email.recipient)?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {email.contact_name || email.recipient}
                    </span>
                    {email.contact_name && (
                      <span className="px-1.5 py-0.5 rounded bg-[#1AA19C]/10 text-[#2EC4BE] text-[10px] font-medium flex-shrink-0">
                        Contact
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 truncate">{email.subject}</p>
                  {email.contact_name && (
                    <p className="text-xs text-gray-500 truncate">{email.recipient}</p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {email.has_attachments > 0 && (
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
