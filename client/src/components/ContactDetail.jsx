import { useState, useEffect } from 'react'
import { getContact, getEmailDetail, getAttachmentUrl } from '../lib/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Mail, Phone, StickyNote, Calendar, Paperclip,
  FileText, Image, File, Download, Eye, X, Loader2, Edit3,
  Clock, ChevronDown, ChevronUp
} from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'Z')
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
        <p className="text-gray-400">Contact not found</p>
        <button onClick={onBack} className="text-[#2EC4BE] text-sm mt-2 hover:underline">Go back</button>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1AA19C]/15 flex items-center justify-center text-[#2EC4BE] text-xl font-bold">
              {contact.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{contact.name}</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {contact.email}
                </span>
                {contact.phone && (
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {contact.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => onEdit(contact)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all"
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-400">{contact.notes}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{contact.emails?.length || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Emails Sent</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{contact.attachments?.length || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Files</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">
            {contact.created_at ? new Date(contact.created_at + 'Z').toLocaleDateString('hu-HU') : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Created</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'emails'
              ? 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email History ({contact.emails?.length || 0})
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
            File Manager ({contact.attachments?.length || 0})
          </span>
        </button>
      </div>

      {/* Email History Tab */}
      {activeTab === 'emails' && (
        <div className="space-y-2">
          {(!contact.emails || contact.emails.length === 0) ? (
            <div className="glass rounded-xl p-10 text-center">
              <Mail className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No emails sent to this contact yet</p>
            </div>
          ) : (
            contact.emails.map(email => (
              <div key={email.id} className="glass rounded-xl overflow-hidden">
                <button
                  onClick={() => handleExpandEmail(email.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${email.status === 'sent' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{email.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(email.sent_at)}
                      </p>
                    </div>
                  </div>
                  {expandedEmail === email.id
                    ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  }
                </button>

                {expandedEmail === email.id && (
                  <div className="border-t border-white/5 fade-in">
                    {loadingEmail ? (
                      <div className="p-6 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-[#1AA19C] animate-spin" />
                      </div>
                    ) : emailDetail ? (
                      <div>
                        {/* Email preview */}
                        <div className="p-4">
                          <div className="bg-white rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                            <div
                              className="transform scale-[0.5] origin-top-left w-[200%]"
                              dangerouslySetInnerHTML={{ __html: emailDetail.html
                                .replace(/cid:intimix-logo-header/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/nyl/588/ikm/IntimiX2.svg')
                                .replace(/cid:intimix-logo-png/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/mwf/5mo/xol/IntimiX.png')
                              }}
                            />
                          </div>
                        </div>
                        {/* Email attachments */}
                        {emailDetail.attachments?.length > 0 && (
                          <div className="px-4 pb-4">
                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {emailDetail.attachments.length} attachment(s)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {emailDetail.attachments.map(att => {
                                const Icon = getFileIcon(att.mimetype)
                                return (
                                  <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-light text-xs">
                                    <Icon className="w-3.5 h-3.5 text-[#1AA19C]" />
                                    <span className="text-gray-300">{att.filename}</span>
                                    <span className="text-gray-600">({formatSize(att.size)})</span>
                                    {isPreviewable(att.mimetype) && (
                                      <button
                                        onClick={() => setPreviewAttachment(att)}
                                        className="text-[#2EC4BE] hover:text-[#1AA19C] transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <a
                                      href={getAuthUrl(att.id)}
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

      {/* File Manager Tab */}
      {activeTab === 'files' && (
        <div>
          {(!contact.attachments || contact.attachments.length === 0) ? (
            <div className="glass rounded-xl p-10 text-center">
              <Paperclip className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No files have been sent to this contact yet</p>
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
                          src={getAuthUrl(att.id)}
                          alt={att.filename}
                          className="w-full h-full object-contain"
                        />
                      ) : att.mimetype?.includes('pdf') ? (
                        <div className="text-center">
                          <FileText className="w-10 h-10 text-red-400 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-500">PDF Document</p>
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
                            From: {att.email_subject}
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
                          href={getAuthUrl(att.id)}
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

      {/* Attachment Preview Modal */}
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
                  href={getAuthUrl(previewAttachment.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
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
                  src={getAuthUrl(previewAttachment.id)}
                  alt={previewAttachment.filename}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              ) : previewAttachment.mimetype?.includes('pdf') ? (
                <iframe
                  src={getAuthUrl(previewAttachment.id)}
                  className="w-full h-[80vh]"
                  title={previewAttachment.filename}
                />
              ) : (
                <div className="p-10 text-center text-gray-500">
                  <File className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
