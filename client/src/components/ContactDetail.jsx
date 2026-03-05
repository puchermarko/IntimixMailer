// Kapcsolat részletes nézet - emailek, fogadott levelek, fájlok mind itt vannak
import { useState, useEffect, useMemo } from 'react'
import { getContact, getEmailDetail, getAttachmentUrl, getInboxEmail, getInboxAttachmentUrl, getSentImapEmail, getSentImapAttachmentUrl, getDownloadToken, getInbox, getSentEmails } from '../lib/api'
import toast from 'react-hot-toast'
import { useAuth, useUI } from '../App'
import {
  ArrowLeft, Mail, Phone, StickyNote, Calendar, Paperclip,
  FileText, Image, File, Download, Eye, X, Loader2, Edit3,
  Clock, ChevronDown, ChevronUp, Inbox, SendHorizontal, Receipt,
  TrendingUp, Target, Zap, UserPlus, BarChart3, ExternalLink
} from 'lucide-react'
import SimpleRichEditor from './SimpleRichEditor'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

function formatDate(dateStr) {
  if (!dateStr) return ''
  // Only append Z for bare SQLite timestamps (YYYY-MM-DD HH:MM:SS) that lack timezone info
  const hasTimezone = /[Z+\-]\d{2}:?\d{2}$|Z$/i.test(dateStr)
  const d = new Date(hasTimezone ? dateStr : dateStr + 'Z')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimetype) {
  if (mimetype?.startsWith('image/')) return Image
  if (mimetype?.includes('pdf')) return FileText
  return File
}

function isPreviewable(mimetype) {
  return mimetype?.startsWith('image/') || mimetype?.includes('pdf')
}

export default function ContactDetail({ contactId, onBack, onEdit, onNavigate, enhancedMail }) {
  const { uiMode } = useUI()
  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [contactEmails, setContactEmails] = useState([])
  const [contactReceivedEmails, setContactReceivedEmails] = useState([])
  const [loadingContactEmails, setLoadingContactEmails] = useState(false)
  const [activeTab, setActiveTab] = useState('emails')
  const [expandedEmail, setExpandedEmail] = useState(null)
  const [emailDetail, setEmailDetail] = useState(null)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [expandedReceived, setExpandedReceived] = useState(null)
  const [receivedDetail, setReceivedDetail] = useState(null)
  const [loadingReceived, setLoadingReceived] = useState(false)
  const [expandedSentImap, setExpandedSentImap] = useState(null)
  const [sentImapDetail, setSentImapDetail] = useState(null)
  const [loadingSentImap, setLoadingSentImap] = useState(false)
  const [editorMode, setEditorMode] = useState('visual') // 'visual' | 'code'

  const [dlToken, setDlToken] = useState('')

  const isModern = uiMode === 'modern'

  useEffect(() => {
    getDownloadToken().then(t => setDlToken(t)).catch(() => {})
  }, [contactId])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getContact(contactId)
        console.log('Contact data loaded:', data)
        console.log('Contact emails:', data.emails)
        console.log('Contact sentImap:', data.sentImap)
        console.log('Contact received:', data.received)
        setContact(data)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contactId])

  useEffect(() => {
    const loadContactEmails = async () => {
      if (!contact || !contact.email) return
      
      setLoadingContactEmails(true)
      try {
        console.log('Fetching emails for contact:', contactId, 'email:', contact.email)
        
        // Search for sent emails to/from this contact
        try {
          const sentData = await getSentEmails({ page: 1, limit: 100, search: contact.email })
          console.log('Contact sent emails (search):', sentData)
          setContactEmails(sentData.emails || [])
        } catch (err) {
          console.warn('Failed to fetch contact sent emails:', err)
          setContactEmails([])
        }
        
        // Search for received emails from/to this contact
        try {
          const receivedData = await getInbox({ page: 1, limit: 100, search: contact.email })
          console.log('Contact received emails (search):', receivedData)
          setContactReceivedEmails(receivedData.emails || [])
        } catch (err) {
          console.warn('Failed to fetch contact received emails:', err)
          setContactReceivedEmails([])
        }
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoadingContactEmails(false)
      }
    }
    
    loadContactEmails()
  }, [contact, contactId])

  const handleExpandEmail = async (emailId) => {
    // If enhanced mail view is enabled, navigate to it instead of expanding inline
    if (enhancedMail && onNavigate) {
      onNavigate('mail')
      return
    }
    
    // Original inline expansion logic
    if (expandedEmail === emailId) {
      setExpandedEmail(null)
      setEmailDetail(null)
      return
    }
    setExpandedEmail(emailId)
    setLoadingEmail(true)
    try {
      const data = await getEmailDetail(emailId)
      setEmailDetail(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingEmail(false)
    }
  }

  const getAuthUrl = (id) => {
    return `${getAttachmentUrl(id)}?token=${dlToken}`
  }

  const getInboxAuthUrl = (id) => {
    return `${getInboxAttachmentUrl(id)}?token=${dlToken}`
  }

  const handleExpandReceived = async (emailId) => {
    // If enhanced mail view is enabled, navigate to it instead of expanding inline
    if (enhancedMail && onNavigate) {
      onNavigate('mail')
      return
    }
    
    // Original inline expansion logic
    if (expandedReceived === emailId) {
      setExpandedReceived(null)
      setReceivedDetail(null)
      return
    }
    setExpandedReceived(emailId)
    setLoadingReceived(true)
    try {
      const data = await getInboxEmail(emailId)
      setReceivedDetail(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingReceived(false)
    }
  }

  const handleExpandSentImap = async (emailId) => {
    // If enhanced mail view is enabled, navigate to it instead of expanding inline
    if (enhancedMail && onNavigate) {
      onNavigate('mail')
      return
    }
    
    // Original inline expansion logic
    if (expandedSentImap === emailId) {
      setExpandedSentImap(null)
      setSentImapDetail(null)
      return
    }
    setExpandedSentImap(emailId)
    setLoadingSentImap(true)
    try {
      const data = await getSentImapEmail(emailId)
      setSentImapDetail(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingSentImap(false)
    }
  }

  const getSentImapAuthUrl = (id) => {
    return `${getSentImapAttachmentUrl(id)}?token=${dlToken}`
  }

  const getAttUrl = (att) => {
    if (att._authUrl) return att._authUrl
    if (att.source === 'inbox') return getInboxAuthUrl(att.id)
    if (att.source === 'sent_imap') return getSentImapAuthUrl(att.id)
    return getAuthUrl(att.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#1AA19C] animate-spin" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Kapcsolat nem található</p>
        <button onClick={onBack} className="text-[#2EC4BE] text-sm mt-2 hover:underline">Vissza</button>
      </div>
    )
  }

  return (
    <div className={`fade-in ${isModern ? 'max-w-[1600px] mx-auto' : ''}`}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center mt-2 justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-bold shrink-0 ${isModern ? 'bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] text-white shadow-lg' : 'bg-[#1AA19C]/15 text-[#2EC4BE]'}`}>
              {contact.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white truncate">{contact.name}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-0.5 sm:mt-1">
                <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </span>
                {contact.phone && (
                  <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {contact.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => onEdit(contact)}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm transition-all shrink-0 ${isModern ? 'text-gray-300 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10 border border-white/5' : 'text-[#2EC4BE] hover:bg-[#1AA19C]/10'}`}
        >
          <Edit3 className="w-4 h-4" />
          Szerkesztés
        </button>
      </div>

      {/* Megjegyzések */}
      {contact.notes && (
        <div className={`${isModern ? 'modern-card p-4 mb-6' : 'glass rounded-xl p-4 mb-4'}`}>
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-400">{contact.notes}</p>
          </div>
        </div>
      )}

      {/* Statisztikák */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
        <div className={`${isModern ? 'modern-card p-4 hover:border-[#2EC4BE]/30 transition-all' : 'glass rounded-xl p-3 sm:p-4'} text-center`}>
          <p className="text-lg sm:text-2xl font-bold text-white">{(contact.emails?.length || 0) + (contact.sentImap?.length || 0)}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Küldött</p>
        </div>
        <div className={`${isModern ? 'modern-card p-4 hover:border-[#2EC4BE]/30 transition-all' : 'glass rounded-xl p-3 sm:p-4'} text-center`}>
          <p className="text-lg sm:text-2xl font-bold text-white">{contact.received?.length || 0}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Fogadott</p>
        </div>
        <div className={`${isModern ? 'modern-card p-4 hover:border-[#2EC4BE]/30 transition-all' : 'glass rounded-xl p-3 sm:p-4'} text-center`}>
          <p className="text-lg sm:text-2xl font-bold text-white">{contact.attachments?.length || 0}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Fájlok</p>
        </div>
        <div className={`${isModern ? 'modern-card p-4 hover:border-[#2EC4BE]/30 transition-all' : 'glass rounded-xl p-3 sm:p-4'} text-center`}>
          <p className="text-lg sm:text-2xl font-bold text-white">{contact.quotes?.length || 0}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Árajánlatok</p>
        </div>
      </div>

      {/* Fülek */}
      <div className={`flex gap-1 mb-6 overflow-x-auto scrollbar-hide ${isModern ? 'p-1 bg-white/5 rounded-2xl w-fit mx-auto sm:mx-0' : '-mx-1 px-1'}`}>
        {[
          { id: 'emails', icon: SendHorizontal, label: 'Küldött', count: (contactEmails?.length || 0) + (contact.sentImap?.length || 0) },
          { id: 'received', icon: Inbox, label: 'Fogadott', count: contactReceivedEmails?.length || 0 },
          { id: 'files', icon: Paperclip, label: 'Fájlok', count: contact.attachments?.length || 0 },
          { id: 'quotes', icon: Receipt, label: 'Árajánlatok', count: contact.quotes?.length || 0 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? (isModern ? 'bg-[#2EC4BE] text-black shadow-lg shadow-[#2EC4BE]/20' : 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20')
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <tab.icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== null && <span className="text-[10px] sm:text-xs opacity-70">({tab.count})</span>}
            </span>
          </button>
        ))}
      </div>

      {/* Küldött levelek fül (helyi + IMAP összefésülve) */}
      {activeTab === 'emails' && (() => {
        const localEmails = (contactEmails || []).map(e => ({ ...e, _source: 'local', _date: e.sent_at }))
        const imapEmails = (contact.sentImap || []).map(e => ({ ...e, _source: 'imap', _date: e.date }))
        const allSent = [...localEmails, ...imapEmails].sort((a, b) => new Date(b._date) - new Date(a._date))

        return (
          <div className="space-y-2">
            {allSent.length === 0 ? (
              <div className="glass rounded-xl p-10 text-center">
                <SendHorizontal className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Még nem küldtél emailt ennek a kapcsolatnak</p>
              </div>
            ) : (
              allSent.map(email => {
                const isLocal = email._source === 'local'
                const isExpanded = isLocal ? expandedEmail === email.id : expandedSentImap === email.id
                const isLoading = isLocal ? loadingEmail : loadingSentImap
                const detail = isLocal ? emailDetail : sentImapDetail
                const handleExpand = isLocal ? handleExpandEmail : handleExpandSentImap

                return (
                  <div key={`${email._source}-${email.id}`} className="glass rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleExpand(email.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isLocal ? (email.status === 'sent' ? 'bg-green-400' : 'bg-red-400') : 'bg-green-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">{email.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(email._date)}
                            {!isLocal && email.has_attachments === 1 && <Paperclip className="w-3 h-3 ml-2" />}
                          </p>
                        </div>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                      }
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/5 fade-in">
                        {isLoading ? (
                          <div className="p-6 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-[#1AA19C] animate-spin" />
                          </div>
                        ) : detail ? (
                          <div>
                            <div className="p-4">
                              {(isLocal ? detail.html : detail.html_body) ? (
                                <div className="rounded-lg overflow-hidden max-h-[400px]">
                                  <iframe
                                    srcDoc={(isLocal ? detail.html : detail.html_body)
                                      .replace(/cid:intimix-logo-header/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/nyl/588/ikm/IntimiX2.svg')
                                      .replace(/cid:intimix-logo-png/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/mwf/5mo/xol/IntimiX.png')
                                    }
                                    className="w-full h-[400px] border-0 bg-white rounded-lg"
                                    sandbox="allow-same-origin"
                                    title="Email content"
                                    style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '800px' }}
                                  />
                                </div>
                              ) : (
                                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-white/5 rounded-lg p-4 max-h-[400px] overflow-auto">
                                  {detail.text_body || '(Nincs tartalom)'}
                                </pre>
                              )}
                            </div>
                            {detail.attachments?.length > 0 && (
                              <div className="px-4 pb-4">
                                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" />
                                  {detail.attachments.length} csatolmány
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {detail.attachments.map(att => {
                                    const Icon = getFileIcon(att.mimetype)
                                    const attUrl = isLocal ? getAuthUrl(att.id) : getSentImapAuthUrl(att.id)
                                    return (
                                      <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-light text-xs">
                                        <Icon className="w-3.5 h-3.5 text-[#1AA19C]" />
                                        <span className="text-gray-300">{att.filename}</span>
                                        <span className="text-gray-600">({formatSize(att.size)})</span>
                                        {isPreviewable(att.mimetype) && (
                                          <button
                                            onClick={() => setPreviewAttachment({ ...att, _authUrl: attUrl })}
                                            className="text-[#2EC4BE] hover:text-[#1AA19C] transition-colors"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <a href={attUrl} target="_blank" rel="noopener noreferrer"
                                          className="text-[#2EC4BE] hover:text-[#1AA19C] transition-colors">
                                          <Download className="w-3.5 h-3.5" />
                                        </a>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )
      })()}

      {/* Fogadott levelek fül */}
      {activeTab === 'received' && (
        <div className="space-y-2">
          {(!contactReceivedEmails || contactReceivedEmails.length === 0) ? (
            <div className="glass rounded-xl p-10 text-center">
              <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Még nem érkezett email ettől a kapcsolattól</p>
            </div>
          ) : (
            contactReceivedEmails.map(email => (
              <div key={email.id} className="glass rounded-xl overflow-hidden">
                <button
                  onClick={() => handleExpandReceived(email.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{email.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(email.date)}
                        {email.has_attachments === 1 && <Paperclip className="w-3 h-3 ml-2" />}
                      </p>
                    </div>
                  </div>
                  {expandedReceived === email.id
                    ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  }
                </button>

                {expandedReceived === email.id && (
                  <div className="border-t border-white/5 fade-in">
                    {loadingReceived ? (
                      <div className="p-6 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-[#1AA19C] animate-spin" />
                      </div>
                    ) : receivedDetail ? (
                      <div>
                        <div className="p-4">
                          {receivedDetail.html_body ? (
                            <div className="rounded-lg overflow-hidden max-h-[400px]">
                              <iframe
                                srcDoc={receivedDetail.html_body}
                                className="w-full h-[400px] border-0 bg-white rounded-lg"
                                sandbox="allow-same-origin"
                                title="Email content"
                                style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '800px' }}
                              />
                            </div>
                          ) : (
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-white/5 rounded-lg p-4 max-h-[400px] overflow-auto">
                              {receivedDetail.text_body || '(Nincs tartalom)'}
                            </pre>
                          )}
                        </div>
                        {receivedDetail.attachments?.length > 0 && (
                          <div className="px-4 pb-4">
                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {receivedDetail.attachments.length} csatolmány
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {receivedDetail.attachments.map(att => {
                                const Icon = getFileIcon(att.mimetype)
                                return (
                                  <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-light text-xs">
                                    <Icon className="w-3.5 h-3.5 text-[#1AA19C]" />
                                    <span className="text-gray-300">{att.filename}</span>
                                    <span className="text-gray-600">({formatSize(att.size)})</span>
                                    <a
                                      href={getInboxAuthUrl(att.id)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#2EC4BE] hover:text-[#1AA19C] transition-colors"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Fájlkezelő fül */}
      {activeTab === 'files' && (
        <div>
          {(!contact.attachments || contact.attachments.length === 0) ? (
            <div className="glass rounded-xl p-10 text-center">
              <Paperclip className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Még nincs fájl ehhez a kapcsolathoz</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contact.attachments.map(att => {
                const Icon = getFileIcon(att.mimetype)
                const canPreview = isPreviewable(att.mimetype)
                return (
                  <div key={att.id} className="glass rounded-xl p-4 group hover:border-[#1AA19C]/20 transition-all">
                    {/* Preview area */}
                    <div
                      className="w-full h-32 rounded-lg bg-[#1e2128] flex items-center justify-center mb-3 overflow-hidden cursor-pointer"
                      onClick={() => canPreview && setPreviewAttachment(att)}
                    >
                      {att.mimetype?.startsWith('image/') ? (
                        <img
                          src={getAttUrl(att)}
                          alt={att.filename}
                          className="w-full h-full object-contain"
                        />
                      ) : att.mimetype?.includes('pdf') ? (
                        <div className="text-center">
                          <FileText className="w-10 h-10 text-red-400 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-500">PDF dokumentum</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <File className="w-10 h-10 text-gray-500 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-500">{att.mimetype}</p>
                        </div>
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 font-medium truncate">{att.filename}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatSize(att.size)}</p>
                        {att.email_subject && (
                          <p className="text-[10px] text-gray-600 mt-1 truncate" title={att.email_subject}>
                            {att.source === 'inbox' ? 'Fogadott:' : 'Küldött:'} {att.email_subject}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-600 mt-0.5">{formatDate(att.uploaded_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canPreview && (
                          <button
                            onClick={() => setPreviewAttachment(att)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={getAttUrl(att)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Árajánlatok fül */}
      {activeTab === 'quotes' && (() => {
        const statusColors = {
          draft: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'Piszkozat' },
          sent: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Elküldve' },
          accepted: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Elfogadva' },
          rejected: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Elutasítva' },
        }
        return (
          <div className="space-y-2">
            {(!contact.quotes || contact.quotes.length === 0) ? (
              <div className="glass rounded-xl p-10 text-center">
                <Receipt className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Még nincs árajánlat ehhez a kapcsolathoz</p>
              </div>
            ) : (
              contact.quotes.map(quote => {
                const st = statusColors[quote.status] || statusColors.draft
                return (
                  <div key={quote.id} onClick={() => {
                      localStorage.setItem('intimix_open_quote', quote.id)
                      onNavigate?.('quotes')
                    }} className="glass rounded-xl p-4 hover:border-[#1AA19C]/20 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-200">#{quote.quote_number}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.bg} ${st.text} border border-current/20`}>
                              {st.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(quote.created_at)}
                            </p>
                            {quote.valid_until && (
                              <p className="text-xs text-gray-600">
                                Érvényes: {new Date(quote.valid_until).toLocaleDateString('hu-HU')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <p className="text-sm font-bold text-white">
                          {Number(quote.total).toLocaleString('hu-HU')} {quote.currency}
                        </p>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#2EC4BE] transition-colors" />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )
      })()}

      {/* Kapcsolat útja fül */}
      {activeTab === 'journey' && <ContactJourney contact={contact} />}

      {/* Csatolmány előnézet modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-white">{previewAttachment.filename}</p>
                <span className="text-xs text-gray-500">{formatSize(previewAttachment.size)}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getAttUrl(previewAttachment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Letöltés
                </a>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-xl overflow-hidden flex items-center justify-center">
              {previewAttachment.mimetype?.startsWith('image/') ? (
                <img
                  src={getAttUrl(previewAttachment)}
                  alt={previewAttachment.filename}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : previewAttachment.mimetype?.includes('pdf') ? (
                <iframe
                  src={getAttUrl(previewAttachment)}
                  className="w-full h-[80vh]"
                  title={previewAttachment.filename}
                />
              ) : (
                <div className="p-10 text-center text-gray-500">
                  <File className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                  <p>Előnézet nem elérhető ehhez a fájltípushoz</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Contact Journey Sub-Component ──────────────────────────
const CHART_COLORS = ['#1AA19C', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const PIE_COLORS = { draft: '#6B7280', sent: '#3B82F6', accepted: '#22C55E', rejected: '#EF4444' }
const STATUS_LABELS = { draft: 'Piszkozat', sent: 'Elküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' }

function ContactJourney({ contact }) {
  const { uiMode } = useUI()
  const isModern = uiMode === 'modern'

  const sentCount = (contact.emails?.length || 0) + (contact.sentImap?.length || 0)
  const receivedCount = contact.received?.length || 0
  const totalEmails = sentCount + receivedCount
  const quotes = contact.quotes || []
  const accepted = quotes.filter(q => q.status === 'accepted').length
  const rejected = quotes.filter(q => q.status === 'rejected').length
  const sent = quotes.filter(q => q.status === 'sent').length
  const draft = quotes.filter(q => q.status === 'draft').length
  const totalQuotes = quotes.length
  const decidedQuotes = accepted + rejected

  // ─── Possibility Score ───
  const calcPossibility = () => {
    let score = 50 // base

    // Quote history factor (strongest signal)
    if (decidedQuotes > 0) {
      const acceptRate = accepted / decidedQuotes
      score = score + (acceptRate - 0.5) * 40
    }

    // Email engagement factor
    if (sentCount > 0 && receivedCount > 0) {
      const responseRate = Math.min(receivedCount / sentCount, 1)
      score += responseRate * 15
    } else if (sentCount > 0 && receivedCount === 0) {
      score -= 10
    }

    // Volume factor — more interaction = more trust
    if (totalEmails > 20) score += 8
    else if (totalEmails > 10) score += 5
    else if (totalEmails > 5) score += 2

    // Pending quotes factor
    if (sent > 0) score += 3

    // No history at all
    if (totalEmails === 0 && totalQuotes === 0) score = 50

    return Math.max(5, Math.min(95, Math.round(score)))
  }

  const possibility = calcPossibility()
  const possibilityColor = possibility >= 70 ? 'text-green-400' : possibility >= 40 ? 'text-amber-400' : 'text-red-400'
  const possibilityBg = possibility >= 70 ? 'from-green-500/20 to-green-500/5' : possibility >= 40 ? 'from-amber-500/20 to-amber-500/5' : 'from-red-500/20 to-red-500/5'
  const possibilityGradient = possibility >= 70 ? 'from-green-500 to-emerald-400' : possibility >= 40 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-orange-400'
  const possibilityLabel = possibility >= 70 ? 'Magas esély' : possibility >= 40 ? 'Közepes esély' : 'Alacsony esély'
  const possibilityHint = possibility >= 70
    ? 'A kapcsolat aktív és pozitív előzményekkel rendelkezik. Jó esély van az elfogadásra.'
    : possibility >= 40
    ? 'Vegyes előzmények. Érdemes személyre szabott ajánlatot küldeni.'
    : 'Kevés interakció vagy negatív előzmények. Fontolja meg a kapcsolat újraépítését.'

  // ─── Email Activity Chart Data (last 30 days) ───
  const emailChartData = useMemo(() => {
    const days = 30
    const now = new Date()
    const data = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      data.push({ day: key, sent: 0, received: 0 })
    }

    const localEmails = (contact.emails || []).map(e => ({ date: e.sent_at }))
    const imapEmails = (contact.sentImap || []).map(e => ({ date: e.date }))
    const allSent = [...localEmails, ...imapEmails]
    const allReceived = (contact.received || []).map(e => ({ date: e.date }))

    allSent.forEach(e => {
      if (!e.date) return
      const key = new Date(e.date).toISOString().split('T')[0]
      const entry = data.find(d => d.day === key)
      if (entry) entry.sent++
    })
    allReceived.forEach(e => {
      if (!e.date) return
      const key = new Date(e.date).toISOString().split('T')[0]
      const entry = data.find(d => d.day === key)
      if (entry) entry.received++
    })
    return data
  }, [contact])

  // ─── Quote Status Pie Data ───
  const quoteStatusData = useMemo(() => {
    const counts = { draft, sent, accepted, rejected }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: STATUS_LABELS[key], value, fill: PIE_COLORS[key] }))
  }, [draft, sent, accepted, rejected])

  // ─── Quote Value Chart ───
  const quoteValueData = useMemo(() => {
    return quotes
      .filter(q => q.total > 0)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(q => ({
        name: `#${q.quote_number}`,
        total: Number(q.total),
        status: STATUS_LABELS[q.status] || q.status,
        fill: PIE_COLORS[q.status] || '#6B7280'
      }))
  }, [quotes])

  // ─── Timeline Events ───
  const timeline = useMemo(() => {
    const events = []

    // Contact created
    if (contact.created_at) {
      events.push({ date: contact.created_at, type: 'created', icon: UserPlus, color: 'bg-[#1AA19C]', label: 'Kapcsolat létrehozva' })
    }

    // First email sent
    const allSentDates = [
      ...(contact.emails || []).map(e => e.sent_at),
      ...(contact.sentImap || []).map(e => e.date)
    ].filter(Boolean).sort()
    if (allSentDates.length > 0) {
      events.push({ date: allSentDates[0], type: 'first_sent', icon: SendHorizontal, color: 'bg-green-500', label: 'Első email küldve' })
    }

    // First email received
    const allRecvDates = (contact.received || []).map(e => e.date).filter(Boolean).sort()
    if (allRecvDates.length > 0) {
      events.push({ date: allRecvDates[0], type: 'first_received', icon: Inbox, color: 'bg-blue-500', label: 'Első válasz érkezett' })
    }

    // Quotes
    quotes.forEach(q => {
      events.push({
        date: q.created_at,
        type: 'quote',
        icon: FileText,
        color: q.status === 'accepted' ? 'bg-green-500' : q.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500',
        label: `Árajánlat #${q.quote_number} — ${STATUS_LABELS[q.status] || q.status}`,
        extra: `${Number(q.total).toLocaleString('hu-HU')} ${q.currency}`
      })
    })

    return events.sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [contact, quotes])

  const formatDay = (day) => {
    const d = new Date(day + 'T00:00:00')
    return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass rounded-lg px-3 py-2 text-xs border border-white/10 shadow-xl">
        <p className="text-gray-400 mb-1">{formatDay(label)}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }

  const BarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="glass rounded-lg px-3 py-2 text-xs border border-white/10 shadow-xl">
        <p className="text-gray-300 font-medium">{d.name}</p>
        <p className="text-gray-400">{d.status}</p>
        <p className="text-white font-bold">{d.total.toLocaleString('hu-HU')} Ft</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 fade-in">
      {/* Possibility Card */}
      <div className={`glass rounded-2xl p-4 sm:p-6 bg-gradient-to-br ${possibilityBg} relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Target className="w-full h-full" />
        </div>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <div className="text-center">
              <p className={`text-xl sm:text-2xl font-black ${possibilityColor}`}>{possibility}%</p>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className={`w-4 h-4 ${possibilityColor}`} />
              <h3 className="text-sm font-bold text-white">{possibilityLabel}</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{possibilityHint}</p>
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${possibilityGradient} transition-all duration-1000`}
                style={{ width: `${possibility}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-gray-600">Alacsony</span>
              <span className="text-[10px] text-gray-600">Magas</span>
            </div>
          </div>
        </div>
        {/* Factor breakdown */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{totalEmails}</p>
            <p className="text-[10px] text-gray-500">Email váltás</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{decidedQuotes > 0 ? Math.round((accepted / decidedQuotes) * 100) : '—'}%</p>
            <p className="text-[10px] text-gray-500">Elfogadási arány</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{sentCount > 0 ? Math.round((receivedCount / sentCount) * 100) : '—'}%</p>
            <p className="text-[10px] text-gray-500">Válaszadási arány</p>
          </div>
        </div>
      </div>

      {/* Email Activity Chart */}
      <div className="glass rounded-xl p-3 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#1AA19C]/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[#2EC4BE]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Email aktivitás</p>
            <p className="text-[10px] text-gray-500">Küldött és fogadott levelek az elmúlt 30 napban</p>
          </div>
        </div>
        <div className="h-[180px] sm:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={emailChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="cjSentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1AA19C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1AA19C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cjRecvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
              <Area type="monotone" dataKey="sent" name="Küldött" stroke="#1AA19C" fill="url(#cjSentGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="received" name="Fogadott" stroke="#3B82F6" fill="url(#cjRecvGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    {/* Quote charts row */}
    {totalQuotes > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        {/* Quote Status Pie */}
        <div className={`${isModern ? 'modern-card p-4' : 'glass rounded-xl p-3 sm:p-5'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Árajánlat státuszok</p>
              <p className="text-[10px] text-gray-500">{totalQuotes} árajánlat összesen</p>
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={quoteStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {quoteStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} db`, name]} contentStyle={{ background: 'rgba(30,33,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quote Values Bar */}
        {quoteValueData.length > 0 && (
          <div className={`${isModern ? 'modern-card p-4' : 'glass rounded-xl p-3 sm:p-5'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Árajánlat értékek</p>
                <p className="text-[10px] text-gray-500">Összeg árajánlatonként</p>
              </div>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quoteValueData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {quoteValueData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    )}

    {/* Timeline */}
    <div className={`${isModern ? 'modern-card p-4' : 'glass rounded-xl p-3 sm:p-5'}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Kapcsolat idővonal</p>
          <p className="text-[10px] text-gray-500">Fontos események időrendben</p>
        </div>
      </div>
      {timeline.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Még nincs esemény</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-white/10" />
          <div className="space-y-4">
            {timeline.map((event, i) => {
              const Icon = event.icon
              return (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-9 h-9 rounded-full ${event.color} flex items-center justify-center shrink-0 z-10 shadow-lg`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 pt-1.5">
                    <p className="text-sm text-gray-200 font-medium">{event.label}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-[10px] text-gray-500">{formatDate(event.date)}</p>
                      {event.extra && <p className="text-[10px] text-gray-400 font-medium">{event.extra}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  </div>
)
}
