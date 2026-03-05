// Enhanced Mail View - Apple Mail inspired UX
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Inbox as InboxIcon, SendHorizontal, PenLine, Users, RefreshCw, Search, X,
  Paperclip, ChevronLeft, ChevronRight, ArrowLeft, Download, User, Clock,
  FileText, Loader2, Trash2, Reply, ReplyAll, Forward, Send, Eye, Code, ChevronDown, ChevronUp,
  LayoutGrid, BookUser, UserPen, Plus, UserPlus, ShoppingBag, Lock,
  MoreVertical, CheckSquare, Star, Archive, Flag, MoreHorizontal,
  Maximize2, Minimize2, Sidebar, Mail, MailOpen, AtSign
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

// Full ComposeTab component from backup
function ComposeTab({ isModern, onClose, onSendSuccess }) {
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
      onClose()
      if (onSendSuccess) onSendSuccess()
    } catch (err) { toast.error(err.message) }
    finally { setSending(false) }
  }

  return (
    <div className="space-y-4">
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
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="HTML tartalom..."
              className={`input-field w-full min-h-[250px] resize-y text-sm font-mono ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`}
            />
          )
        )}
      </div>

      {/* Küldés gomb */}
      <div className="flex justify-end">
        <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors mr-3">
          Mégse
        </button>
        <button onClick={handleSend} disabled={sending}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all disabled:opacity-50 ${
            isModern 
              ? 'bg-[#2EC4BE] text-black hover:bg-[#2EC4BE]/90 shadow-lg shadow-[#2EC4BE]/20' 
              : 'bg-[#1AA19C] hover:bg-[#2EC4BE] text-white'
          }`}
        >
          {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Küldés...</> : <><Send className="w-4 h-4" /> Küldés</>}
        </button>
      </div>
    </div>
  )
}

const MAIL_FOLDERS = [
  { id: 'inbox', label: 'Bejövő', icon: InboxIcon, count: 0 },
  { id: 'sent', label: 'Elküldött', icon: SendHorizontal, count: 0 },
  { id: 'trash', label: 'Kuka', icon: Trash2, count: 0 }
]

export default function EnhancedMailView({ onNavigate }) {
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [emailDetail, setEmailDetail] = useState(null)
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'conversation'
  const [selectedEmails, setSelectedEmails] = useState(new Set())
  const [showCompose, setShowCompose] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [replyHtml, setReplyHtml] = useState('')
  const [editorMode, setEditorMode] = useState('visual')
  const [replyTemplate, setReplyTemplate] = useState(null)
  const [showReplyTemplateSelector, setShowReplyTemplateSelector] = useState(false)
  const [replyTemplates, setReplyTemplates] = useState([])
  const [loadingReplyTemplates, setLoadingReplyTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [emailToDelete, setEmailToDelete] = useState(null)
  const [trashEmails, setTrashEmails] = useState(() => {
    // Load trash emails from localStorage on component mount
    try {
      const saved = localStorage.getItem('intimix_trash_emails')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Failed to load trash emails from localStorage:', error)
      return []
    }
  })
  
  const { hasSubscription } = useAuth()
  const { uiMode } = useUI()
  const isModern = uiMode === 'modern'
  
  const emailListRef = useRef(null)

  // Load emails for current folder
  const loadEmails = async () => {
    setLoading(true)
    try {
      let data = { emails: [] }
      if (activeFolder === 'inbox') {
        data = await getInbox()
        console.log('Inbox emails loaded:', data)
      } else if (activeFolder === 'sent') {
        data = await getSentEmails()
        console.log('Sent emails loaded:', data)
        console.log('First sent email structure:', data.emails?.[0] ? Object.keys(data.emails[0]) : 'No emails')
        console.log('Sample sent email:', data.emails?.[0])
        console.log('All field names in first sent email:', data.emails?.[0] ? Object.keys(data.emails[0]).map(key => `${key}: ${data.emails[0][key]}`).join(', ') : 'No emails')
      } else if (activeFolder === 'trash') {
        // Load deleted emails from client-side trash storage
        data.emails = trashEmails
        console.log('Trash folder loaded with emails:', trashEmails.length)
      } else if (activeFolder === 'drafts') {
        // TODO: Implement drafts API
        data.emails = []
      } else if (activeFolder === 'starred') {
        // TODO: Implement starred API
        data.emails = []
      } else if (activeFolder === 'archive') {
        // TODO: Implement archive API
        data.emails = []
      }
      setEmails(data.emails || [])
      console.log('Final emails array:', data.emails || [])
    } catch (err) {
      console.error('Failed to load emails:', err)
      toast.error(err.message || 'Hiba a levelek betöltésekor')
      setEmails([])
    } finally {
      setLoading(false)
    }
  }

  // Filter emails based on search query
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails
    
    const query = searchQuery.toLowerCase()
    return emails.filter(email => {
      // Search in subject
      if (email.subject && email.subject.toLowerCase().includes(query)) return true
      
      // Search in sender/recipient
      if (activeFolder === 'sent') {
        const recipient = email.recipient || email.to_address || email.recipient_email || ''
        if (recipient.toLowerCase().includes(query)) return true
      } else {
        const sender = email.from_name || email.from_address || ''
        if (sender.toLowerCase().includes(query)) return true
      }
      
      // Search in content
      const content = email.text_body || email.preview || email.body || email.content || ''
      if (content.toLowerCase().includes(query)) return true
      
      return false
    })
  }, [emails, searchQuery, activeFolder])

  useEffect(() => {
    loadEmails()
  }, [activeFolder])

  // Save trash emails to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('intimix_trash_emails', JSON.stringify(trashEmails))
    } catch (error) {
      console.error('Failed to save trash emails to localStorage:', error)
    }
  }, [trashEmails])

  const openEmail = async (email) => {
    setSelectedEmail(email)
    setLoading(true)
    try {
      console.log('Opening email:', email)
      console.log('Active folder:', activeFolder)
      console.log('Email ID:', email.id)
      console.log('Email source:', email.source)
      
      let detail = null
      if (activeFolder === 'inbox') {
        console.log('Calling getInboxEmail for:', email.id)
        detail = await getInboxEmail(email.id)
      } else if (activeFolder === 'sent') {
        // Use the same logic as the original SentTab
        if (email.source === 'imap') {
          console.log('Calling getSentImapEmail for:', email.id)
          detail = await getSentImapEmail(email.id)
        } else {
          console.log('Calling getEmailDetail for:', email.id)
          detail = await getEmailDetail(email.id)
        }
      } else if (activeFolder === 'trash') {
        // For trash emails, use the email data directly since we stored it locally
        console.log('Using local trash email data for:', email.id)
        detail = email
      }
      
      console.log('Email detail loaded:', detail)
      console.log('Complete email structure:', JSON.stringify(detail, null, 2))
      console.log('All email fields:', {
        id: detail.id,
        subject: detail.subject,
        from_address: detail.from_address,
        to_address: detail.to_address,
        date: detail.date,
        html_body: detail.html_body,
        text_body: detail.text_body,
        body: detail.body,
        content: detail.content,
        message: detail.message,
        plain_text: detail.plain_text,
        text: detail.text,
        preview: detail.preview,
        html: detail.html,
        recipient_email: detail.recipient_email,
        sent_at: detail.sent_at,
        deleted_at: detail.deleted_at,
        original_folder: detail.original_folder
      })
      
      setEmailDetail(detail)
    } catch (err) {
      console.error('Failed to load email detail:', err)
      toast.error(err.message || 'Hiba az email betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    setShowReply(true)
    setReplyHtml('')
    setReplyTemplate(null)
    setShowReplyTemplateSelector(false)
    
    setLoadingReplyTemplates(true)
    try {
      const templates = await getCustomTemplates()
      setReplyTemplates(templates)
    } catch (err) {
      console.error('Failed to load templates:', err)
      setReplyTemplates([])
    } finally {
      setLoadingReplyTemplates(false)
    }
  }

  const applyReplyTemplate = (template) => {
    setReplyTemplate(template.id)
    setReplyHtml(template.html)
    setShowReplyTemplateSelector(false)
  }

  const handleSendReply = async () => {
    if (!replyHtml.trim()) return toast.error('Írj valamit a válaszba')
    setSending(true)
    try {
      const originalDate = new Date(emailDetail.date).toLocaleString('hu-HU')
      const originalFrom = activeFolder === 'sent' 
        ? (emailDetail.to_address || emailDetail.recipient_email)
        : activeFolder === 'trash'
          ? (emailDetail.original_folder === 'sent'
            ? (emailDetail.to_address || emailDetail.recipient_email || emailDetail.recipient)
            : (emailDetail.from_name
              ? `${emailDetail.from_name} <${emailDetail.from_address}>`
              : emailDetail.from_address))
          : (emailDetail.from_name
            ? `${emailDetail.from_name} <${emailDetail.from_address}>`
            : emailDetail.from_address)
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
      const replyTo = activeFolder === 'sent' 
        ? (emailDetail.to_address || emailDetail.recipient_email)
        : activeFolder === 'trash'
          ? (emailDetail.original_folder === 'sent'
            ? (emailDetail.to_address || emailDetail.recipient_email || emailDetail.recipient)
            : emailDetail.from_address)
          : emailDetail.from_address
      await replyToEmail({ to: replyTo, subject, html: fullHtml, inReplyTo: emailDetail.message_id || undefined })
      toast.success('Válasz elküldve!')
      setShowReply(false)
      setReplyHtml('')
      setReplyTemplate(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const toggleEmailSelection = (emailId) => {
    const newSelection = new Set(selectedEmails)
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId)
    } else {
      newSelection.add(emailId)
    }
    setSelectedEmails(newSelection)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
  }

  const handleComposeSuccess = () => {
    // Refresh sent emails if we're in sent folder
    if (activeFolder === 'sent') {
      loadEmails()
    }
  }

  const handleDelete = async (emailId) => {
    setEmailToDelete(emailId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      if (activeFolder === 'inbox') {
        // Find the email to delete from current emails
        const emailToDeleteData = emails.find(email => email.id === emailToDelete)
        if (emailToDeleteData) {
          // Fetch full email content before moving to trash
          let fullEmailData = emailToDeleteData
          try {
            const emailDetail = await getInboxEmail(emailToDelete)
            fullEmailData = { ...emailToDeleteData, ...emailDetail }
            console.log('Fetched full email content for trash:', fullEmailData)
          } catch (err) {
            console.warn('Could not fetch full email content, using basic data:', err)
          }
          
          // Add to trash with timestamp and full content
          const trashEmail = {
            ...fullEmailData,
            deleted_at: new Date().toISOString(),
            original_folder: 'inbox'
          }
          setTrashEmails(prev => [...prev, trashEmail])
          
          // Remove from inbox (simulate deletion)
          setEmails(prev => prev.filter(email => email.id !== emailToDelete))
          toast.success('Levél a kukába helyezve')
        }
      } else if (activeFolder === 'sent') {
        // TODO: Implement sent email delete API
        toast.warning('Kimenő levelek törlése hamarosan elérhető lesz')
        setShowDeleteConfirm(false)
        setEmailToDelete(null)
        return
      } else if (activeFolder === 'trash') {
        // Permanently delete from trash
        setTrashEmails(prev => prev.filter(email => email.id !== emailToDelete))
        toast.success('Levél véglegesen törölve')
        // Auto-refresh trash folder after permanent deletion
        setTimeout(() => {
          loadEmails()
        }, 500)
      }
      setSelectedEmail(null)
      setEmailDetail(null)
    } catch (err) {
      toast.error(err.message || 'Hiba a levél törlésekor')
    } finally {
      setShowDeleteConfirm(false)
      setEmailToDelete(null)
    }
  }

  return (
    <div className={`h-screen flex flex-col ${isModern ? 'bg-[#0f1115]' : 'bg-[#1a1d23]'} text-[#e0e2e7]`}>
      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl ${isModern ? 'modern-card' : 'glass'} flex flex-col`}>
            {/* Compose Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Új levél</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compose Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <ComposeTab 
                isModern={isModern} 
                onClose={() => setShowCompose(false)}
                onSendSuccess={handleComposeSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl ${isModern ? 'modern-card' : 'glass'} p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Levél törlése</h3>
            </div>
            <p className="text-gray-300 mb-6">
              {activeFolder === 'trash' 
                ? 'Biztosan véglegesen törölni szeretnéd ezt a levelet? Ez a művelet nem vonható vissza.'
                : 'Biztosan törölni szeretnéd ezt a levelet? A levél a kukába kerül, ahonnan később visszaállítható.'
              }
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-gray-300"
              >
                Mégse
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                {activeFolder === 'trash' ? 'Végleges törlés' : 'Törlés'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      {/* Header with Back Button */}
      <div className="w-full border-b border-white/10 bg-[#1a1d23]">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('analytics')}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Vissza
            </button>
            <h1 className="text-xl font-semibold text-white">Levelezés</h1>
          </div>
        </div>
      </div>

      {/* Email Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Email Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} border-r border-white/10 flex flex-col transition-all duration-300`}>
          {/* Compose Button */}
          <div className="p-4">
            <button
              onClick={() => setShowCompose(true)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                isModern 
                  ? 'bg-[#2EC4BE] text-black hover:bg-[#2EC4BE]/90 shadow-lg shadow-[#2EC4BE]/20' 
                  : 'bg-[#1AA19C] hover:bg-[#2EC4BE] text-white'
              }`}
            >
              <PenLine className="w-4 h-4" />
              {!sidebarCollapsed && 'Új levél'}
            </button>
          </div>

          {/* Folders */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1 p-2">
              {MAIL_FOLDERS.map(folder => {
                const Icon = folder.icon
                const isActive = activeFolder === folder.id
                return (
                  <button
                    key={folder.id}
                    onClick={() => setActiveFolder(folder.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? isModern 
                          ? 'bg-[#2EC4BE]/10 text-[#2EC4BE] border border-[#2EC4BE]/20'
                          : 'bg-[#1AA19C]/15 text-[#2EC4BE]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left text-sm font-medium">{folder.label}</span>
                        {folder.count > 0 && (
                          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">{folder.count}</span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className={`border-r border-white/10 flex flex-col ${selectedEmail ? 'w-96' : 'flex-1'}`}>
          {/* List Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Keresés..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${
                    isModern ? 'bg-white/5 border border-white/10 focus:bg-white/10' : 'bg-white/5'
                  }`}
                />
              </div>
              <button
                onClick={loadEmails}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'conversation' : 'list')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" ref={emailListRef}>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Betöltés...</p>
            </div>
          ) : filteredEmails.length === 0 && searchQuery.trim() ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nincs találat a keresésre: "{searchQuery}"</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-8 text-center">
              <InboxIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nincs levél a mappában</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredEmails.map(email => (
                <div
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${
                    selectedEmail?.id === email.id ? (isModern ? 'bg-[#2EC4BE]/10' : 'bg-white/10') : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(email.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleEmailSelection(email.id)
                      }}
                      className="mt-1 rounded border-gray-600 bg-white/5 text-[#2EC4BE] focus:ring-[#2EC4BE]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-200 truncate">
                          {activeFolder === 'sent' 
                            ? (email.recipient || email.to_address || email.recipient_email || 'Nincs címzett')
                            : (email.from_name || email.from_address)
                          }
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(email.date)}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-300 truncate mb-1">
                        {email.subject}
                      </div>
                      
                      {/* <div className="text-sm text-gray-500 truncate">
                        {activeFolder === 'sent' 
                          ? `To: ${email.recipient || email.to_address || email.recipient_email || 'Nincs címzett'}` 
                          : (email.text_body || email.preview || email.body || email.content || 'Nincs tartalom')
                        }
                      </div> */}
                      
                    </div>
                    {!email.read && (
                      <div className="w-2 h-2 bg-[#2EC4BE] rounded-full shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      {selectedEmail && emailDetail && (
        <div className="flex-1 flex flex-col">
          {/* Email Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold text-white">{emailDetail.subject}</h1>
              <button
                onClick={() => {
                  setSelectedEmail(null)
                  setEmailDetail(null)
                  setShowReply(false)
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5" />
                  Válasz neki: <span className="text-gray-200">
                    {activeFolder === 'sent' 
                      ? (emailDetail.to_address || emailDetail.recipient_email)
                      : activeFolder === 'trash'
                        ? (emailDetail.original_folder === 'sent'
                          ? (emailDetail.to_address || emailDetail.recipient_email || emailDetail.recipient)
                          : (emailDetail.from_name || emailDetail.from_address))
                        : (emailDetail.from_name || emailDetail.from_address)
                    }
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {new Date(
                  activeFolder === 'sent' 
                    ? (emailDetail.sent_at || emailDetail.date)
                    : activeFolder === 'trash'
                      ? (emailDetail.deleted_at || emailDetail.date)
                      : emailDetail.date
                ).toLocaleString('hu-HU')}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleReply}
                className="flex items-center gap-2 px-4 py-2 bg-[#1AA19C] hover:bg-[#2EC4BE] text-white rounded-lg transition-colors"
              >
                <Reply className="w-4 h-4" />
                Válasz
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <ReplyAll className="w-4 h-4" />
                Válasz mindenkinek
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Forward className="w-4 h-4" />
                Továbbítás
              </button>
              <button 
                onClick={() => handleDelete(emailDetail.id)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                Törlés
              </button>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {(() => {
              const isImap = activeFolder === 'sent' && emailDetail && emailDetail.to_address
              const isTrash = activeFolder === 'trash'
              
              // For trash emails, use all available content fields since they're stored locally
              const bodyHtml = isTrash 
                ? (emailDetail.html_body || emailDetail.html || emailDetail.body || emailDetail.content || emailDetail.message)
                : isImap 
                  ? emailDetail.html_body 
                  : (emailDetail.html_body || emailDetail.html || emailDetail.body || emailDetail.content || emailDetail.message)
              
              const bodyText = isTrash
                ? (emailDetail.text_body || emailDetail.plain_text || emailDetail.text || emailDetail.preview)
                : isImap 
                  ? emailDetail.text_body 
                  : (emailDetail.text_body || emailDetail.plain_text || emailDetail.text)
              
              return bodyHtml ? (
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {bodyText || '(Nincs tartalom)'}
                </pre>
              )
            })()}
          </div>

          {/* Reply Section */}
          {showReply && (
            <div className="border-t border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-white">Válasz</h3>
                  <p className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Reply className="w-3.5 h-3.5" />
                    Válasz neki: <span className="text-gray-200">
                      {activeFolder === 'sent' 
                        ? (emailDetail.to_address || emailDetail.recipient_email)
                        : activeFolder === 'trash'
                          ? (emailDetail.original_folder === 'sent'
                            ? (emailDetail.to_address || emailDetail.recipient_email || emailDetail.recipient)
                            : (emailDetail.from_name || emailDetail.from_address))
                          : (emailDetail.from_name || emailDetail.from_address)
                      }
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => setEditorMode('visual')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                        editorMode === 'visual' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500'
                      }`}
                    >
                      Vizuális
                    </button>
                    <button
                      onClick={() => setEditorMode('code')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                        editorMode === 'code' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500'
                      }`}
                    >
                      Kód
                    </button>
                  </div>
                  <button
                    onClick={() => setShowReply(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Template Selector */}
              <div className={`mb-4 p-4 rounded-lg ${isModern ? 'bg-white/5' : 'bg-white/5'}`}>
                <button
                  onClick={() => setShowReplyTemplateSelector(!showReplyTemplateSelector)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#1AA19C]" />
                    <span className="text-sm">
                      {replyTemplate ? replyTemplates.find(t => t.id === replyTemplate)?.name : 'Válassz sablont (opcionális)'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showReplyTemplateSelector ? 'rotate-180' : ''}`} />
                </button>
                {showReplyTemplateSelector && (
                  <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                    {loadingReplyTemplates ? (
                      <div className="p-3 text-center">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-gray-400" />
                        <p className="text-xs text-gray-500">Betöltés...</p>
                      </div>
                    ) : replyTemplates.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-2">Nincs elérhető sablon</p>
                    ) : (
                      replyTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => applyReplyTemplate(t)}
                          className={`w-full p-2 rounded-lg text-left transition-all ${
                            replyTemplate === t.id ? 'bg-[#2EC4BE]/10 border border-[#2EC4BE]/20' : 'hover:bg-white/5'
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-200">{t.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Reply Editor */}
              <div className="mb-4">
                {editorMode === 'visual' ? (
                  <SimpleRichEditor
                    initialHtml={replyHtml}
                    onChange={setReplyHtml}
                    className="min-h-[200px]"
                  />
                ) : (
                  <textarea
                    value={replyHtml}
                    onChange={(e) => setReplyHtml(e.target.value)}
                    placeholder="Írd ide a választ..."
                    className={`w-full min-h-[200px] p-4 rounded-lg resize-y ${
                      isModern ? 'bg-white/5 border border-white/10 focus:bg-white/10' : 'bg-white/5'
                    }`}
                  />
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSendReply}
                  className="flex items-center gap-2 px-6 py-2 bg-[#1AA19C] hover:bg-[#2EC4BE] text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Válasz küldése
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
    </div>
  )
}
