// Kapcsolat részletes nézet - emailek, fogadott levelek, fájlok mind itt vannak
import { useState, useEffect } from 'react'
import { getContact, getEmailDetail, getAttachmentUrl, getInboxEmail, getInboxAttachmentUrl, getSentImapEmail, getSentImapAttachmentUrl } from '../lib/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Mail, Phone, StickyNote, Calendar, Paperclip,
  FileText, Image, File, Download, Eye, X, Loader2, Edit3,
  Clock, ChevronDown, ChevronUp, Inbox, SendHorizontal
} from 'lucide-react'

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

export default function ContactDetail({ contactId, onBack, onEdit }) {
  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)
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

  const token = localStorage.getItem('intimix_token')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getContact(contactId)
        setContact(data)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contactId])

  const handleExpandEmail = async (emailId) => {
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
    return `${getAttachmentUrl(id)}?token=${token}`
  }

  const getInboxAuthUrl = (id) => {
    return `${getInboxAttachmentUrl(id)}?token=${token}`
  }

  const handleExpandReceived = async (emailId) => {
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
    return `${getSentImapAttachmentUrl(id)}?token=${token}`
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
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#1AA19C]/15 flex items-center justify-center text-[#2EC4BE] text-base sm:text-xl font-bold shrink-0">
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
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all shrink-0"
        >
          <Edit3 className="w-4 h-4" />
          Szerkesztés
        </button>
      </div>

      {/* Megjegyzések */}
      {contact.notes && (
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-400">{contact.notes}</p>
          </div>
        </div>
      )}

      {/* Statisztikák */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <div className="glass rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-white">{(contact.emails?.length || 0) + (contact.sentImap?.length || 0)}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Küldött</p>
        </div>
        <div className="glass rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-white">{contact.received?.length || 0}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Fogadott</p>
        </div>
        <div className="glass rounded-xl p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-white">{contact.attachments?.length || 0}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Fájlok</p>
        </div>
      </div>

      {/* Fülek */}
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'emails'
              ? 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2">
            <SendHorizontal className="w-4 h-4" />
            Küldött ({(contact.emails?.length || 0) + (contact.sentImap?.length || 0)})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'received'
              ? 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Fogadott ({contact.received?.length || 0})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'files'
              ? 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Fájlok ({contact.attachments?.length || 0})
          </span>
        </button>
      </div>

      {/* Küldött levelek fül (helyi + IMAP összefésülve) */}
      {activeTab === 'emails' && (() => {
        const localEmails = (contact.emails || []).map(e => ({ ...e, _source: 'local', _date: e.sent_at }))
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
          {(!contact.received || contact.received.length === 0) ? (
            <div className="glass rounded-xl p-10 text-center">
              <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Még nem érkezett email ettől a kapcsolattól</p>
            </div>
          ) : (
            contact.received.map(email => (
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
