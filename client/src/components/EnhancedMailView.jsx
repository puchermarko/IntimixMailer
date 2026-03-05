// Enhanced Mail View - Apple Mail inspired UX
import { useState, useEffect, useRef } from 'react'
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

const MAIL_FOLDERS = [
  { id: 'inbox', label: 'Bejövő', icon: InboxIcon, count: 0 },
  { id: 'sent', label: 'Elküldött', icon: SendHorizontal, count: 0 },
  { id: 'drafts', label: 'Piszkozatok', icon: PenLine, count: 0 },
  { id: 'starred', label: 'Csillagozott', icon: Star, count: 0 },
  { id: 'archive', label: 'Archívum', icon: Archive, count: 0 },
  { id: 'trash', label: 'Kuka', icon: Trash2, count: 0 }
]

export default function EnhancedMailView() {
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
  
  const { hasSubscription } = useAuth()
  const { uiMode } = useUI()
  const isModern = uiMode === 'modern'
  
  const emailListRef = useRef(null)

  // Load emails for current folder
  const loadEmails = async () => {
    setLoading(true)
    try {
      if (activeFolder === 'inbox') {
        const data = await getInbox()
        setEmails(data.emails || [])
      } else if (activeFolder === 'sent') {
        const data = await getSentEmails()
        setEmails(data.emails || [])
      }
      // Add other folders as needed
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmails()
  }, [activeFolder])

  const openEmail = async (email) => {
    setSelectedEmail(email)
    setLoading(true)
    try {
      const detail = await getInboxEmail(email.id)
      setEmailDetail(detail)
    } catch (err) {
      toast.error(err.message)
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
    try {
      const originalDate = new Date(emailDetail.date).toLocaleString('hu-HU')
      const originalFrom = emailDetail.from_name
        ? `${emailDetail.from_name} <${emailDetail.from_address}>`
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

  return (
    <div className={`h-screen flex ${isModern ? 'bg-[#0f1115]' : 'bg-[#1a1d23]'} text-[#e0e2e7]`}>
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} border-r border-white/10 flex flex-col transition-all duration-300`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && <h2 className="font-semibold text-white">Levelezés</h2>}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Sidebar className="w-4 h-4" />
            </button>
          </div>
        </div>

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
                      <span className="flex-1 text-left text-sm">{folder.label}</span>
                      {folder.count > 0 && (
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                          {folder.count}
                        </span>
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

        {/* Email List */}
        <div className="flex-1 overflow-y-auto" ref={emailListRef}>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Betöltés...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center">
              <InboxIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nincs levél a mappában</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {emails.map(email => (
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
                          {email.from_name || email.from_address}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(email.date)}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-300 truncate mb-1">
                        {email.subject}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {email.text_body || email.preview || 'Nincs tartalom'}
                      </div>
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
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-gray-200">
                  {emailDetail.from_name || emailDetail.from_address}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {new Date(emailDetail.date).toLocaleString('hu-HU')}
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
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Archive className="w-4 h-4" />
                Archiválás
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-red-400">
                <Trash2 className="w-4 h-4" />
                Törlés
              </button>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {emailDetail.html_body ? (
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: emailDetail.html_body }}
              />
            ) : (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {emailDetail.text_body || '(Nincs tartalom)'}
              </pre>
            )}
          </div>

          {/* Reply Section */}
          {showReply && (
            <div className="border-t border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Válasz</h3>
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
  )
}
