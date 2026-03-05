// Ez a fő levelezés nézet - bejövő, kimenő, írás, tömeges küldés mind itt van
import { useState, useEffect, useRef } from 'react'
import {
  Inbox as InboxIcon, SendHorizontal, PenLine, Users, RefreshCw, Search, X,
  Paperclip, ChevronLeft, ChevronRight, ArrowLeft, Download, User, Clock,
  FileText, Loader2, Trash2, Reply, Send, Eye, Code, ChevronDown, ChevronUp,
  LayoutGrid, BookUser, UserPen, Plus, UserPlus, ShoppingBag, Lock,
  MoreVertical, CheckSquare, Star
} from 'lucide-react'
import {
  syncInbox, getInbox, getInboxEmail, deleteInboxEmail, getInboxAttachmentUrl,
  getSentEmails, getEmailDetail, getAttachmentUrl, getSentImapEmail, getSentImapAttachmentUrl, syncSent,
  replyToEmail, sendEmail, sendBulkEmails, getContacts, createContact, getCustomTemplates, getEnvConfig,
  getDownloadToken
} from '../lib/api'
import { emailTemplates as builtinTemplates } from '../lib/templates'
import { useBranding, useAuth, useUI } from '../App'
import toast from 'react-hot-toast'
import SimpleRichEditor from './SimpleRichEditor'

const TABS = [
  { id: 'inbox', label: 'Bejövő', icon: InboxIcon },
  { id: 'sent', label: 'Elküldött', icon: SendHorizontal },
  { id: 'compose', label: 'Új levél', icon: PenLine, requiresSub: true },
  { id: 'bulk', label: 'Tömeges küldés', icon: Users, requiresSub: true },
]

export default function MailView() {
  const [activeTab, setActiveTab] = useState('inbox')
  const { hasSubscription } = useAuth()
  const { uiMode } = useUI()
  const isModern = uiMode === 'modern'

  return (
    <div className={`space-y-6 fade-in ${isModern ? 'max-w-[1600px] mx-auto' : ''}`}>
      {/* Fül sáv */}
      <div className={`flex items-center gap-1 overflow-x-auto scrollbar-hide ${isModern ? 'p-1 bg-white/5 rounded-2xl w-fit' : 'border-b border-white/5 pb-0'}`}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const disabled = tab.requiresSub && !hasSubscription
          
          if (isModern) {
            return (
              <button
                key={tab.id}
                onClick={() => !disabled && setActiveTab(tab.id)}
                disabled={disabled}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-xl whitespace-nowrap ${
                  disabled
                    ? 'text-gray-600 cursor-not-allowed opacity-50'
                    : isActive
                      ? 'bg-[#2EC4BE] text-black shadow-lg shadow-[#2EC4BE]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title={disabled ? 'Aktív előfizetés szükséges' : ''}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {disabled && <Lock className="w-3 h-3 opacity-70" />}
              </button>
            )
          }

          return (
            <button
              key={tab.id}
              onClick={() => !disabled && setActiveTab(tab.id)}
              disabled={disabled}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
                disabled
                  ? 'text-gray-600 border-transparent cursor-not-allowed opacity-50'
                  : isActive
                    ? 'text-[#2EC4BE] border-[#1AA19C]'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-white/10'
              }`}
              title={disabled ? 'Aktív előfizetés szükséges' : ''}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {disabled && <Lock className="w-3 h-3" />}
            </button>
          )
        })}
      </div>

      {/* Fül tartalom */}
      <div key={activeTab} className="fade-in">
        {activeTab === 'inbox' && <InboxTab isModern={isModern} />}
        {activeTab === 'sent' && <SentTab isModern={isModern} />}
        {activeTab === 'compose' && <ComposeTab isModern={isModern} />}
        {activeTab === 'bulk' && <BulkTab isModern={isModern} />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   BEJÖVŐ FÜL - itt jönnek be a levelek IMAP-ról
   ═══════════════════════════════════════════════════════════════ */
function InboxTab({ isModern }) {
  const { hasSubscription } = useAuth()
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
  const [showReply, setShowReply] = useState(false)
  const [replyHtml, setReplyHtml] = useState('')
  const [sending, setSending] = useState(false)
  const [editorMode, setEditorMode] = useState('visual') // 'visual' | 'code'
  const [showCreateContact, setShowCreateContact] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [creatingContact, setCreatingContact] = useState(false)
  const limit = 50
  const iframeRef = useRef(null)
  const replyRef = useRef(null)
  const [dlToken, setDlToken] = useState('')
  useEffect(() => { getDownloadToken().then(t => setDlToken(t)).catch(() => {}) }, [])

  const fetchEmails = async (p = page, s = search) => {
    setLoading(true)
    try {
      const data = await getInbox({ page: p, limit, search: s })
      setEmails(data.emails)
      setTotal(data.total)
    } catch (err) {
      toast.error(err.message)
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
            let msg = `Szinkronizálva! ${result.newEmails} új levél érkezett.`
            if (result.linked > 0) msg += ` ${result.linked} kapcsolathoz rendelve.`
            toast.success(msg)
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
      let msg = `Szinkronizálva! ${result.newEmails} új levél érkezett.`
      if (result.linked > 0) msg += ` ${result.linked} kapcsolathoz rendelve.`
      toast.success(msg)
      await fetchEmails(1, search)
      setPage(1)
    } catch (err) {
      toast.error(err.message)
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

  const openEmail = async (email) => {
    setSelectedEmail(email)
    setLoadingDetail(true)
    setShowReply(false)
    try {
      const detail = await getInboxEmail(email.id)
      setEmailDetail(detail)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Törlöd ezt a levelet?')) return
    try {
      await deleteInboxEmail(id)
      toast.success('Levél törölve')
      setSelectedEmail(null)
      setEmailDetail(null)
      fetchEmails(page, search)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleReply = () => {
    setShowReply(true)
    setReplyHtml('')
    setTimeout(() => replyRef.current?.focus(), 100)
  }

  const handleSendReply = async () => {
    if (!replyHtml.trim()) return toast.error('Írj valamit a válaszba')
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
      await replyToEmail({ to: emailDetail.from_address, subject, html: fullHtml, inReplyTo: emailDetail.message_id || undefined })
      toast.success('Válasz elküldve!')
      setShowReply(false)
      setReplyHtml('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleCreateContact = async () => {
    if (!newContactName.trim()) return toast.error('Adj meg egy nevet')
    setCreatingContact(true)
    try {
      await createContact({ name: newContactName.trim(), email: emailDetail.from_address })
      toast.success(`"${newContactName}" kapcsolat létrehozva!`)
      setShowCreateContact(false)
      setNewContactName('')
      // Re-fetch email detail to get updated contact_name
      const detail = await getInboxEmail(emailDetail.id)
      setEmailDetail(detail)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreatingContact(false)
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

  // ─── Email Detail ───
  if (selectedEmail && emailDetail) {
    return (
      <div className="space-y-4 fade-in">
        <button onClick={() => { setSelectedEmail(null); setEmailDetail(null) }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#2EC4BE] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Vissza
        </button>

        <div className={`${isModern ? 'modern-card p-6' : 'glass rounded-xl p-4 sm:p-6'} space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-2">{emailDetail.subject}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-gray-200">{emailDetail.from_name || emailDetail.from_address}</span>
                  {emailDetail.from_name && <span className="text-gray-500">&lt;{emailDetail.from_address}&gt;</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(emailDetail.date).toLocaleString('hu-HU')}
                </div>
                {emailDetail.contact_name ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isModern ? 'bg-[#2EC4BE]/10 text-[#2EC4BE] border border-[#2EC4BE]/20' : 'bg-[#1AA19C]/15 text-[#2EC4BE]'}`}>
                    {emailDetail.contact_name}
                  </span>
                ) : (
                  <button
                    onClick={() => { setShowCreateContact(true); setNewContactName(emailDetail.from_name || '') }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all"
                  >
                    <UserPlus className="w-3 h-3" />
                    Kapcsolat létrehozása
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleReply}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#2EC4BE] hover:bg-[#1AA19C]/10 rounded-lg transition-all">
                <Reply className="w-4 h-4" /> Válasz
              </button>
              <button onClick={() => handleDelete(emailDetail.id)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Create contact inline */}
          {showCreateContact && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 fade-in">
              <UserPlus className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Contact name"
                className="input-field flex-1 px-3 py-1.5 rounded-lg text-sm"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateContact()}
              />
              <span className="text-xs text-gray-500 shrink-0">{emailDetail.from_address}</span>
              <button onClick={handleCreateContact} disabled={creatingContact}
                className="px-3 py-1.5 rounded-lg bg-[#1AA19C] text-white text-xs font-medium hover:bg-[#2EC4BE] transition-all disabled:opacity-50">
                {creatingContact ? 'Létrehozás...' : 'Létrehozás'}
              </button>
              <button onClick={() => setShowCreateContact(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attachments */}
          {emailDetail.attachments?.length > 0 && (
            <div className="border-t border-white/5 pt-3">
              <div className="flex flex-wrap gap-2">
                {emailDetail.attachments.map(att => (
                  <a key={att.id} href={`${getInboxAttachmentUrl(att.id)}?token=${dlToken}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-all">
                    <FileText className="w-3.5 h-3.5 text-[#2EC4BE]" />
                    <span className="truncate max-w-[150px]">{att.filename}</span>
                    <Download className="w-3 h-3 text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="border-t border-white/5 pt-4">
            {emailDetail.html_body ? (
              <div className="bg-white rounded-lg overflow-hidden">
                <iframe ref={iframeRef} srcDoc={emailDetail.html_body}
                  className="w-full border-0" style={{ minHeight: '400px' }}
                  onLoad={() => {
                    if (iframeRef.current?.contentDocument) {
                      const h = iframeRef.current.contentDocument.documentElement.scrollHeight
                      iframeRef.current.style.height = Math.min(Math.max(h, 200), 800) + 'px'
                    }
                  }}
                  sandbox="allow-same-origin" title="Email content" />
              </div>
            ) : (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-white/5 rounded-lg p-4 max-h-[600px] overflow-auto">
                {emailDetail.text_body || '(No content)'}
              </pre>
            )}
          </div>

          {/* Reply */}
          {showReply && (
            <div className="border-t border-white/5 pt-4 space-y-3 fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Reply className="w-3.5 h-3.5" />
                    Válasz neki: <span className="text-gray-200">{emailDetail.from_name || emailDetail.from_address}</span>
                  </p>
                  <div className="flex bg-white/5 rounded-lg p-0.5">
                    <button onClick={() => setEditorMode('visual')}
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-all ${editorMode === 'visual' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'}`}>
                      Vizuális
                    </button>
                    <button onClick={() => setEditorMode('code')}
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-all ${editorMode === 'code' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'}`}>
                      Kód
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowReply(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
              </div>
              
              {editorMode === 'visual' ? (
                <SimpleRichEditor
                  initialHtml={replyHtml}
                  onChange={setReplyHtml}
                  className="min-h-[120px]"
                />
              ) : (
                <textarea ref={replyRef} value={replyHtml} onChange={(e) => setReplyHtml(e.target.value)}
                  placeholder="Írd ide a választ..." className="input-field w-full min-h-[120px] resize-y text-sm" />
              )}
              
              <div className="flex justify-end">
                <button onClick={handleSendReply} disabled={sending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1AA19C] hover:bg-[#2EC4BE] text-white text-sm font-medium transition-all disabled:opacity-50">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Küldés...' : 'Válasz küldése'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Email List ───
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Keresés a bejövőben..." value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)} className={`input-field w-full pl-10 pr-10 py-2.5 ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
          {searchInput && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); fetchEmails(1, '') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
          )}
        </form>
        <button onClick={handleSync} disabled={syncing || !hasSubscription}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 shrink-0 ${isModern ? 'bg-[#2EC4BE] text-black hover:bg-[#2EC4BE]/90 shadow-lg shadow-[#2EC4BE]/20' : 'bg-[#1AA19C] hover:bg-[#2EC4BE]'}`}
          title={!hasSubscription ? 'Aktív előfizetés szükséges' : ''}>
          {!hasSubscription ? <Lock className="w-4 h-4" /> : <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
          <span className="sm:inline">{syncing ? 'Szinkronizálás...' : 'Szinkronizálás'}</span>
        </button>
      </div>

      <div className={isModern ? 'space-y-2' : 'glass rounded-xl overflow-hidden'}>
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" /><p className="text-gray-500 text-sm">Betöltés...</p></div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center">
            <InboxIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{search ? 'Nincs találat a keresésre' : 'A bejövő üres. Kattints a Szinkronizálásra a levelek letöltéséhez.'}</p>
          </div>
        ) : (
          isModern ? (
            // Modern View - Cards
            <div className="space-y-2">
              {emails.map(email => (
                <button key={email.id} onClick={() => openEmail(email)}
                  className="w-full flex items-center gap-4 p-4 modern-card hover:bg-white/5 transition-all text-left group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg">
                    {(email.from_name || email.from_address)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-200 truncate pr-2 group-hover:text-[#2EC4BE] transition-colors">{email.from_name || email.from_address}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(email.date)}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate mb-1">{email.subject}</p>
                    <div className="flex items-center gap-2">
                      {email.contact_name && (
                        <span className="px-2 py-0.5 rounded-md bg-[#2EC4BE]/10 text-[#2EC4BE] text-[10px] font-medium border border-[#2EC4BE]/20">Kapcsolat</span>
                      )}
                      {email.has_attachments === 1 && <Paperclip className="w-3 h-3 text-gray-500" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Legacy View - List
            <div className="divide-y divide-white/5">
              {emails.map(email => (
                <button key={email.id} onClick={() => openEmail(email)}
                  className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 hover:bg-white/5 transition-all text-left">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1AA19C]/15 flex items-center justify-center text-[#2EC4BE] text-xs font-bold shrink-0">
                    {(email.from_name || email.from_address)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs sm:text-sm font-medium text-gray-200 truncate">{email.from_name || email.from_address}</span>
                      {email.contact_name && (
                        <span className="px-1.5 py-0.5 rounded bg-[#1AA19C]/10 text-[#2EC4BE] text-[10px] font-medium shrink-0 hidden sm:inline">Kapcsolat</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">{email.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {email.has_attachments === 1 && <Paperclip className="w-3.5 h-3.5 text-gray-500" />}
                    <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">{formatDate(email.date)}</span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{page}. oldal / {totalPages} ({total})</p>
          <div className="flex gap-1">
            <button onClick={() => { setPage(page - 1); fetchEmails(page - 1, search) }} disabled={page <= 1}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => { setPage(page + 1); fetchEmails(page + 1, search) }} disabled={page >= totalPages}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ELKÜLDÖTT FÜL - helyi + IMAP-ról szinkronizált kimenő levelek
   ═══════════════════════════════════════════════════════════════ */
function SentTab({ isModern }) {
  const { hasSubscription } = useAuth()
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
  const limit = 50
  const iframeRef = useRef(null)
  const [dlToken, setDlToken] = useState('')
  useEffect(() => { getDownloadToken().then(t => setDlToken(t)).catch(() => {}) }, [])

  const fetchEmails = async (p = page, s = search) => {
    setLoading(true)
    try {
      const data = await getSentEmails({ page: p, limit, search: s })
      setEmails(data.emails)
      setTotal(data.total)
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchEmails()
    // Auto-sync if user has it enabled
    getEnvConfig().then(cfg => {
      if (cfg.auto_sync === 'true') {
        setSyncing(true)
        syncSent()
          .then(result => {
            let msg = `Szinkronizálva! ${result.newEmails} új kimenő levél letöltve.`
            if (result.linked > 0) msg += ` ${result.linked} kapcsolathoz rendelve.`
            toast.success(msg)
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
      let msg = `Szinkronizálva! ${result.newEmails} új kimenő levél letöltve.`
      if (result.linked > 0) msg += ` ${result.linked} kapcsolathoz rendelve.`
      toast.success(msg)
      await fetchEmails(1, search)
      setPage(1)
    } catch (err) { toast.error(err.message) }
    finally { setSyncing(false) }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
    fetchEmails(1, searchInput)
  }

  const openEmail = async (email) => {
    setSelectedEmail(email.id)
    setSelectedSource(email.source)
    try {
      const detail = email.source === 'imap' ? await getSentImapEmail(email.id) : await getEmailDetail(email.id)
      setEmailDetail(detail)
    } catch (err) { toast.error(err.message) }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getAttUrl = (attId) => {
    if (selectedSource === 'imap') return `${getSentImapAttachmentUrl(attId)}?token=${dlToken}`
    return `${getAttachmentUrl(attId)}?token=${dlToken}`
  }

  const totalPages = Math.ceil(total / limit)

  // ─── Detail ───
  if (selectedEmail && emailDetail) {
    const isImap = selectedSource === 'imap'
    const recipient = isImap ? emailDetail.to_address : emailDetail.recipient_email
    const dateStr = isImap ? emailDetail.date : emailDetail.sent_at
    const bodyHtml = isImap ? emailDetail.html_body : emailDetail.html
    const bodyText = isImap ? emailDetail.text_body : null

    return (
      <div className="space-y-4 fade-in">
        <button onClick={() => { setSelectedEmail(null); setEmailDetail(null); setSelectedSource(null) }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#2EC4BE] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Vissza
        </button>
        <div className={`${isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'} space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">{emailDetail.subject}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /><span className="text-gray-500">To:</span>
                <span className="text-gray-200">{recipient}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />{new Date(dateStr).toLocaleString('hu-HU')}
              </div>
              {emailDetail.contact_name && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isModern ? 'bg-[#2EC4BE]/10 text-[#2EC4BE] border border-[#2EC4BE]/20' : 'bg-[#1AA19C]/15 text-[#2EC4BE]'}`}>{emailDetail.contact_name}</span>
              )}
            </div>
          </div>
          {emailDetail.attachments?.length > 0 && (
            <div className="border-t border-white/5 pt-3">
              <div className="flex flex-wrap gap-2">
                {emailDetail.attachments.map(att => (
                  <a key={att.id} href={getAttUrl(att.id)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-all">
                    <FileText className="w-3.5 h-3.5 text-[#2EC4BE]" />
                    <span className="truncate max-w-[150px]">{att.filename}</span>
                    <Download className="w-3 h-3 text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-white/5 pt-4">
            {bodyHtml ? (
              <div className="bg-white rounded-lg overflow-hidden">
                <iframe ref={iframeRef}
                  srcDoc={bodyHtml.replace(/cid:intimix-logo-png/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/mwf/5mo/xol/IntimiX.png')}
                  className="w-full border-0" style={{ minHeight: '400px' }}
                  onLoad={() => {
                    if (iframeRef.current?.contentDocument) {
                      const h = iframeRef.current.contentDocument.documentElement.scrollHeight
                      iframeRef.current.style.height = Math.min(Math.max(h, 200), 800) + 'px'
                    }
                  }}
                  sandbox="allow-same-origin" title="Email content" />
              </div>
            ) : bodyText ? (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-white/5 rounded-lg p-4 max-h-[600px] overflow-auto">{bodyText}</pre>
            ) : <p className="text-gray-500 text-sm">(No content)</p>}
          </div>
        </div>
      </div>
    )
  }

  // ─── List ───
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Keresés az elküldöttben..." value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)} className={`input-field w-full pl-10 pr-10 py-2.5 ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
          {searchInput && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); fetchEmails(1, '') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
          )}
        </form>
        <button onClick={handleSync} disabled={syncing || !hasSubscription}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 shrink-0 ${isModern ? 'bg-[#2EC4BE] text-black hover:bg-[#2EC4BE]/90 shadow-lg shadow-[#2EC4BE]/20' : 'bg-[#1AA19C] hover:bg-[#2EC4BE]'}`}
          title={!hasSubscription ? 'Aktív előfizetés szükséges' : ''}>
          {!hasSubscription ? <Lock className="w-4 h-4" /> : <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
          {syncing ? 'Szinkronizálás...' : 'Kimenő szinkronizálása'}
        </button>
      </div>

      <div className={isModern ? 'space-y-2' : 'glass rounded-xl overflow-hidden'}>
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" /><p className="text-gray-500 text-sm">Betöltés...</p></div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center">
            <SendHorizontal className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{search ? 'Nincs találat a keresésre' : 'Még nincs elküldött levél.'}</p>
          </div>
        ) : (
          isModern ? (
            // Modern Card List
            <div className="space-y-2">
              {emails.map(email => (
                <button key={`${email.source}-${email.id}`} onClick={() => openEmail(email)}
                  className="w-full flex items-center gap-4 p-4 modern-card hover:bg-white/5 transition-all text-left group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg">
                    {(email.contact_name || email.recipient)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-200 truncate pr-2 group-hover:text-[#2EC4BE] transition-colors">{email.contact_name || email.recipient}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(email.date)}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate mb-1">{email.subject}</p>
                    <div className="flex items-center gap-2">
                      {email.contact_name && (
                        <span className="px-2 py-0.5 rounded-md bg-[#2EC4BE]/10 text-[#2EC4BE] text-[10px] font-medium border border-[#2EC4BE]/20">Kapcsolat</span>
                      )}
                      {email.has_attachments > 0 && <Paperclip className="w-3 h-3 text-gray-500" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Legacy List
            <div className="divide-y divide-white/5">
              {emails.map(email => (
                <button key={`${email.source}-${email.id}`} onClick={() => openEmail(email)}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-all text-left">
                  <div className="w-9 h-9 rounded-full bg-[#1AA19C]/15 flex items-center justify-center text-[#2EC4BE] text-xs font-bold shrink-0">
                    {(email.contact_name || email.recipient)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-200 truncate">{email.contact_name || email.recipient}</span>
                      {email.contact_name && (
                        <span className="px-1.5 py-0.5 rounded bg-[#1AA19C]/10 text-[#2EC4BE] text-[10px] font-medium shrink-0">Kapcsolat</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{email.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {email.has_attachments > 0 && <Paperclip className="w-3.5 h-3.5 text-gray-500" />}
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(email.date)}</span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{page}. oldal / {totalPages} ({total})</p>
          <div className="flex gap-1">
            <button onClick={() => { setPage(page - 1); fetchEmails(page - 1, search) }} disabled={page <= 1}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => { setPage(page + 1); fetchEmails(page + 1, search) }} disabled={page >= totalPages}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ÚJ LEVÉL FÜL - innen küldesz egy darab emailt valakinek
   ═══════════════════════════════════════════════════════════════ */
function ComposeTab({ isModern }) {
  const { login_domain } = useBranding()
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
  const [showEcommerce, setShowEcommerce] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [recipientMode, setRecipientMode] = useState('manual')
  const [contacts, setContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [customTemplates, setCustomTemplates] = useState([])
  const [editorMode, setEditorMode] = useState('visual') // 'visual' | 'code'
  const fileInputRef = useRef(null)

  const showBuiltin = login_domain === 'intimix.hu'
  const allTemplates = [...(showBuiltin ? builtinTemplates : []), ...customTemplates]

  useEffect(() => {
    getContacts().then(setContacts).catch(() => {})
    getCustomTemplates().then(setCustomTemplates).catch(() => {})
  }, [])

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase())
  )

  const selectContact = (contact) => { setSelectedContact(contact); setTo(contact.email); setRecipientName(contact.name); setContactSearch('') }
  const clearContact = () => { setSelectedContact(null); setTo(''); setRecipientName('') }

  const applyTemplate = (template) => {
    setSelectedTemplate(template.id)
    setSubject(template.subject)
    setHtml(template.html)
    setShowTemplateSelector(false)
    toast.success(`"${template.name}" sablon alkalmazva`)
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

  const getPreviewHtml = () => replaceVariables(html)
    .replace(/cid:intimix-logo-header/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/nyl/588/ikm/IntimiX2.svg')
    .replace(/cid:intimix-logo-png/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/mwf/5mo/xol/IntimiX.png')

  const handleSend = async () => {
    if (!to || !subject || !html) return toast.error('Töltsd ki az összes kötelező mezőt')
    setSending(true)
    try {
      await sendEmail({
        to, subject: replaceVariables(subject), html: replaceVariables(html),
        cc: cc || undefined, bcc: bcc || undefined,
        attachments: attachments.length > 0 ? attachments : undefined
      })
      toast.success('Email elküldve!')
      setTo(''); setRecipientName(''); setOrderId(''); setTrackingNumber(''); setTrackingUrl('')
      setDeliveryTime(''); setDeliveryPhone(''); setSubject(''); setHtml(''); setCc(''); setBcc('')
      setAttachments([]); setSelectedTemplate(null); setSelectedContact(null); setRecipientMode('manual')
    } catch (err) { toast.error(err.message) }
    finally { setSending(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Sablon választó */}
        <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
          <button onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${isModern ? 'bg-white/5 hover:bg-white/10' : 'glass-light hover:border-[#1AA19C]/30'}`}>
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-4 h-4 text-[#1AA19C]" />
              <span className="text-sm font-medium">
                {selectedTemplate ? allTemplates.find(t => t.id === selectedTemplate)?.name : 'Válassz sablont'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTemplateSelector ? 'rotate-180' : ''}`} />
          </button>
          {showTemplateSelector && (
            <div className="mt-3 grid grid-cols-2 gap-2 fade-in max-h-[300px] overflow-y-auto">
              {allTemplates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className={`p-3 rounded-xl text-left transition-all ${isModern ? 'hover:bg-white/5' : 'template-card'} ${selectedTemplate === t.id ? (isModern ? 'bg-[#2EC4BE]/10 border border-[#2EC4BE]/20' : 'selected') : ''}`}>
                  <p className="text-sm font-medium text-gray-200">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full ${isModern ? 'bg-[#2EC4BE]/10 text-[#2EC4BE]' : 'bg-[#1AA19C]/10 text-[#2EC4BE]'}`}>{t.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Címzett */}
        <div className={`${isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'} space-y-3`}>
          <div className="flex items-center gap-2">
            <button onClick={() => { setRecipientMode('contact'); clearContact() }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                recipientMode === 'contact' 
                  ? (isModern ? 'bg-[#2EC4BE]/10 text-[#2EC4BE] border border-[#2EC4BE]/20' : 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20')
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}><BookUser className="w-3.5 h-3.5" />Kapcsolat</button>
            <button onClick={() => { setRecipientMode('manual'); setSelectedContact(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                recipientMode === 'manual' 
                  ? (isModern ? 'bg-[#2EC4BE]/10 text-[#2EC4BE] border border-[#2EC4BE]/20' : 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20')
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}><UserPen className="w-3.5 h-3.5" />Kézi</button>
          </div>

          {recipientMode === 'contact' && (
            <div className="fade-in">
              {selectedContact ? (
                <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isModern ? 'bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] text-white shadow-lg' : 'bg-[#1AA19C]/15 text-[#2EC4BE]'}`}>{selectedContact.name?.[0]?.toUpperCase()}</div>
                    <div><p className="text-sm font-medium text-gray-200">{selectedContact.name}</p><p className="text-xs text-gray-500">{selectedContact.email}</p></div>
                  </div>
                  <button onClick={clearContact} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Kapcsolat keresése..." className={`input-field w-full pl-10 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} autoFocus />
                  </div>
                  <div className="mt-2 max-h-[160px] overflow-y-auto space-y-1">
                    {filteredContacts.map(c => (
                      <button key={c.id} onClick={() => selectContact(c)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-all">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isModern ? 'bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] text-white' : 'bg-[#1AA19C]/10 text-[#2EC4BE]'}`}>{c.name?.[0]?.toUpperCase()}</div>
                        <div className="min-w-0"><p className="text-sm text-gray-200 truncate">{c.name}</p><p className="text-xs text-gray-500 truncate">{c.email}</p></div>
                      </button>
                    ))}
                    {filteredContacts.length === 0 && <p className="text-xs text-gray-500 text-center py-2">Nincs találat</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {recipientMode === 'manual' && (
            <div className="grid grid-cols-2 gap-3 fade-in">
              <div><label className="block text-xs text-gray-400 mb-1">Email *</label>
                <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="vevo@example.com" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Név</label>
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Kiss Anna" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
            </div>
          )}

          <button onClick={() => setShowEcommerce(!showEcommerce)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full ${isModern ? 'bg-white/5 hover:bg-white/10' : 'glass-light hover:border-[#1AA19C]/20'}`}>
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-gray-300">E-commerce mezők</span>
            <span className="text-[10px] text-gray-500 ml-1">(rendelés, nyomkövetés, szállítás)</span>
            <span className="ml-auto">{showEcommerce ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}</span>
          </button>
          {showEcommerce && (
            <div className="space-y-3 fade-in pl-1 border-l-2 border-amber-500/20 ml-1">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-400 mb-1">Rendelés azon.</label>
                  <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="12345" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Nyomkövetési szám</label>
                  <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="HU1234567890" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
              </div>
              <div><label className="block text-xs text-gray-400 mb-1">Nyomkövetési link</label>
                <input type="url" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-400 mb-1">Szállítási idő</label>
                  <input type="text" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} placeholder="11:00-14:00" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Futár telefon</label>
                  <input type="tel" value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} placeholder="+3630..." className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
              </div>
            </div>
          )}

          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} CC / BCC
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 fade-in">
              <div><label className="block text-xs text-gray-400 mb-1">CC</label>
                <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">BCC</label>
                <input type="text" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@example.com" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
            </div>
          )}
        </div>

        {/* Tárgy */}
        <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
          <label className="block text-xs text-gray-400 mb-1">Tárgy *</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email tárgya" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
        </div>

        {/* HTML szerkesztő */}
        <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400">Törzs (HTML) *</label>
              {!showPreview && (
                <div className="flex bg-white/5 rounded-lg p-0.5">
                  <button onClick={() => setEditorMode('visual')}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${editorMode === 'visual' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'}`}>
                    Vizuális
                  </button>
                  <button onClick={() => setEditorMode('code')}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${editorMode === 'code' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'}`}>
                    Kód
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] transition-colors">
              {showPreview ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? 'Szerkesztés' : 'Előnézet'}
            </button>
          </div>
          {showPreview ? (
            <iframe
              srcDoc={getPreviewHtml()}
              className="w-full rounded-lg min-h-[250px] max-h-[400px] border-0 bg-white"
              sandbox="allow-same-origin"
              title="Email preview"
            />
          ) : (
            editorMode === 'visual' ? (
              <SimpleRichEditor
                initialHtml={html}
                onChange={setHtml}
                className="min-h-[250px]"
              />
            ) : (
              <textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="HTML tartalom..."
                className={`input-field w-full px-3 py-2 text-sm font-mono min-h-[250px] resize-y ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} spellCheck={false} />
            )
          )}
        </div>

        {/* Csatolmányok */}
        <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">Csatolmányok</label>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C]">
              <Paperclip className="w-3.5 h-3.5" /> Fájl hozzáadása
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} className="hidden" />
          </div>
          {attachments.length > 0 ? (
            <div className="space-y-1.5">
              {attachments.map((f, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                  <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-[#1AA19C]" /><span className="text-gray-300">{f.name}</span><span className="text-gray-500">({(f.size/1024).toFixed(1)}KB)</span></div>
                  <button onClick={() => setAttachments(prev => prev.filter((_,j) => j !== i))} className="text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-500">Nincs csatolmány</p>}
        </div>
      </div>

      {/* Jobb oldali előnézet */}
      <div className="space-y-4">
        <div className={`${isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'} sticky top-8`}>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Előnézet</h3>
          <div className="rounded-lg overflow-hidden max-h-[350px]">
            {html ? (
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full h-[350px] border-0 bg-white rounded-lg"
                sandbox="allow-same-origin"
                title="Live preview"
                style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '182%', height: '636px' }}
              />
            ) : (
              <div className="p-6 text-center text-gray-400 text-sm">Válassz sablont vagy írj HTML-t</div>
            )}
          </div>
          <button onClick={handleSend} disabled={sending || !to || !subject || !html}
            className={`btn-primary w-full mt-4 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Küldés...</> : <><Send className="w-4 h-4" />Email küldése</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TÖMEGES KÜLDÉS FÜL - egyszerre több címzettnek megy ki a levél
   ═══════════════════════════════════════════════════════════════ */
function BulkTab({ isModern }) {
  const { login_domain } = useBranding()
  const [recipients, setRecipients] = useState([{ name: '', email: '', order_id: '', tracking_number: '', tracking_url: '', delivery_time: '', delivery_phone: '' }])
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [attachments, setAttachments] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null)
  const [customTemplates, setCustomTemplates] = useState([])
  const [showEcommerce, setShowEcommerce] = useState(false)
  const [editorMode, setEditorMode] = useState('visual') // 'visual' | 'code'
  const fileInputRef = useRef(null)

  const showBuiltin = login_domain === 'intimix.hu'
  const allTemplates = [...(showBuiltin ? builtinTemplates : []), ...customTemplates]

  useEffect(() => { getCustomTemplates().then(setCustomTemplates).catch(() => {}) }, [])

  const applyTemplate = (template) => {
    setSelectedTemplate(template.id)
    setSubject(template.subject)
    setHtml(template.html)
    setShowTemplateSelector(false)
    toast.success(`"${template.name}" sablon alkalmazva`)
  }

  const addRecipient = () => setRecipients(prev => [...prev, { name: '', email: '', order_id: '', tracking_number: '', tracking_url: '', delivery_time: '', delivery_phone: '' }])
  const removeRecipient = (i) => { if (recipients.length > 1) setRecipients(prev => prev.filter((_, j) => j !== i)) }
  const updateRecipient = (i, field, value) => setRecipients(prev => prev.map((r, j) => j === i ? { ...r, [field]: value } : r))

  const handleSend = async () => {
    const valid = recipients.filter(r => r.email)
    if (!valid.length || !subject || !html) return toast.error('Töltsd ki az összes kötelező mezőt')
    setSending(true); setResults(null)
    try {
      const data = await sendBulkEmails({ recipients: valid, subject, html, attachments: attachments.length > 0 ? attachments : undefined })
      setResults(data.results)
      const sent = data.results.filter(r => r.status === 'sent').length
      const failed = data.results.filter(r => r.status === 'failed').length
      if (failed === 0) toast.success(`Mind a ${sent} email elküldve!`)
      else toast(`${sent} elküldve, ${failed} sikertelen`, { icon: '⚠️' })
    } catch (err) { toast.error(err.message) }
    finally { setSending(false) }
  }

  const handleCsvPaste = (e) => {
    const text = e.clipboardData.getData('text')
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length > 1 || lines[0]?.includes(',') || lines[0]?.includes('\t')) {
      e.preventDefault()
      const newR = lines.map(line => {
        const p = line.split(/[,\t]/).map(s => s.trim())
        return { email: p[0]||'', name: p[1]||'', order_id: p[2]||'', tracking_number: p[3]||'', tracking_url: p[4]||'', delivery_time: p[5]||'', delivery_phone: p[6]||'' }
      }).filter(r => r.email)
      if (newR.length) { setRecipients(newR); toast.success(`${newR.length} címzett importálva`) }
    }
  }

  return (
    <div className="space-y-4">
      {/* Sablon */}
      <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
        <button onClick={() => setShowTemplateSelector(!showTemplateSelector)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${isModern ? 'bg-white/5 hover:bg-white/10' : 'glass-light hover:border-[#1AA19C]/30'}`}>
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-4 h-4 text-[#1AA19C]" />
            <span className="text-sm font-medium">{selectedTemplate ? allTemplates.find(t => t.id === selectedTemplate)?.name : 'Válassz sablont'}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTemplateSelector ? 'rotate-180' : ''}`} />
        </button>
        {showTemplateSelector && (
          <div className="mt-3 grid grid-cols-2 gap-2 fade-in max-h-[250px] overflow-y-auto">
            {allTemplates.map(t => (
              <button key={t.id} onClick={() => applyTemplate(t)}
                className={`p-3 rounded-xl text-left transition-all ${isModern ? 'hover:bg-white/5' : 'template-card'} ${selectedTemplate === t.id ? (isModern ? 'bg-[#2EC4BE]/10 border border-[#2EC4BE]/20' : 'selected') : ''}`}>
                <p className="text-sm font-medium text-gray-200">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tárgy */}
      <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
        <label className="block text-xs text-gray-400 mb-1">Tárgy *</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Tárgy (használd: {{name}}, {{order_id}}...)" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
      </div>

      {/* Címzettek */}
      <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1AA19C]" />
            <span className="text-sm font-medium text-gray-300">Címzettek ({recipients.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">CSV beillesztés</span>
            <button onClick={addRecipient} className="flex items-center gap-1 text-xs text-[#1AA19C] hover:text-[#2EC4BE] px-2 py-1 rounded-lg hover:bg-[#1AA19C]/10">
              <Plus className="w-3.5 h-3.5" /> Hozzáadás
            </button>
          </div>
        </div>

        <button onClick={() => setShowEcommerce(!showEcommerce)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full mb-3 ${isModern ? 'bg-white/5 hover:bg-white/10' : 'glass-light hover:border-[#1AA19C]/20'}`}>
          <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-gray-300">E-commerce mezők</span>
          <span className="text-[10px] text-gray-500 ml-1">(rendelés, nyomkövetés, szállítás)</span>
          <span className="ml-auto">{showEcommerce ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}</span>
        </button>

        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {recipients.map((r, i) => (
            <div key={i} className={`space-y-2 p-3 rounded-xl ${isModern ? 'bg-white/5' : 'glass-light'}`}>
              <div className="grid grid-cols-12 gap-2 items-center">
                <input type="email" value={r.email} onChange={(e) => updateRecipient(i, 'email', e.target.value)}
                  onPaste={i === 0 ? handleCsvPaste : undefined} placeholder="Email *" className={`input-field px-2 py-1.5 rounded-lg text-xs ${showEcommerce ? 'col-span-4' : 'col-span-6'} ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                <input type="text" value={r.name} onChange={(e) => updateRecipient(i, 'name', e.target.value)}
                  placeholder="Név" className={`input-field px-2 py-1.5 rounded-lg text-xs ${showEcommerce ? 'col-span-3' : 'col-span-5'} ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                {showEcommerce && (
                  <>
                    <input type="text" value={r.order_id} onChange={(e) => updateRecipient(i, 'order_id', e.target.value)}
                      placeholder="Rend. azon." className={`input-field col-span-2 px-2 py-1.5 rounded-lg text-xs ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                    <input type="text" value={r.tracking_number} onChange={(e) => updateRecipient(i, 'tracking_number', e.target.value)}
                      placeholder="Nyomkövetés" className={`input-field col-span-2 px-2 py-1.5 rounded-lg text-xs ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </>
                )}
                <button onClick={() => removeRecipient(i)} disabled={recipients.length === 1}
                  className="col-span-1 flex items-center justify-center text-gray-500 hover:text-red-400 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {showEcommerce && (
                <>
                  <input type="url" value={r.tracking_url} onChange={(e) => updateRecipient(i, 'tracking_url', e.target.value)}
                    placeholder="Nyomkövetési link" className={`input-field w-full px-2 py-1.5 rounded-lg text-xs ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={r.delivery_time} onChange={(e) => updateRecipient(i, 'delivery_time', e.target.value)}
                      placeholder="Szállítási idő" className={`input-field px-2 py-1.5 rounded-lg text-xs ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                    <input type="tel" value={r.delivery_phone} onChange={(e) => updateRecipient(i, 'delivery_phone', e.target.value)}
                      placeholder="Futár telefon" className={`input-field px-2 py-1.5 rounded-lg text-xs ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* HTML */}
      <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <label className="block text-xs text-gray-400">Törzs (HTML) *</label>
            <div className="flex bg-white/5 rounded-lg p-0.5">
              <button onClick={() => setEditorMode('visual')}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${editorMode === 'visual' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'}`}>
                Vizuális
              </button>
              <button onClick={() => setEditorMode('code')}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${editorMode === 'code' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'}`}>
                Kód
              </button>
            </div>
          </div>
        </div>
        {editorMode === 'visual' ? (
          <SimpleRichEditor
            initialHtml={html}
            onChange={setHtml}
            className="min-h-[180px]"
          />
        ) : (
          <textarea value={html} onChange={(e) => setHtml(e.target.value)}
            placeholder="HTML tartalom {{name}}, {{order_id}}..." className={`input-field w-full px-3 py-2 text-sm font-mono min-h-[180px] resize-y ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} spellCheck={false} />
        )}
      </div>

      {/* Csatolmányok */}
      <div className={isModern ? 'modern-card p-4' : 'glass rounded-xl p-4'}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Csatolmányok</label>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C]">
            <Paperclip className="w-3.5 h-3.5" /> Fájl hozzáadása
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} className="hidden" />
        </div>
        {attachments.length > 0 && (
          <div className="space-y-1.5">
            {attachments.map((f, i) => (
              <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-[#1AA19C]" /><span className="text-gray-300">{f.name}</span></div>
                <button onClick={() => setAttachments(prev => prev.filter((_,j) => j !== i))} className="text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Küldés */}
      <button onClick={handleSend} disabled={sending || !recipients.some(r => r.email) || !subject || !html}
        className={`btn-primary w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
        {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Küldés {recipients.filter(r => r.email).length} címzettnek...</> : <><Send className="w-4 h-4" />Küldés {recipients.filter(r => r.email).length} címzettnek</>}
      </button>

      {results && (
        <div className={isModern ? 'modern-card p-4 fade-in' : 'glass rounded-xl p-4 fade-in'}>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Eredmények</h3>
          <div className="space-y-1">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                <span className="text-gray-300">{r.email}</span>
                <span className={r.status === 'sent' ? 'text-green-400' : 'text-red-400'}>{r.status === 'sent' ? '✓ Elküldve' : `✗ ${r.error}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
