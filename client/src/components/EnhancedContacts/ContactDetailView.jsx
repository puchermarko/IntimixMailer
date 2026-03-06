// Kapcsolat részletes nézet - emailek, fogadott levelek, fájlok mind itt vannak
import { useState, useEffect, useMemo, useRef } from 'react'
import { getContact, getEmailDetail, getAttachmentUrl, getInboxEmail, getInboxAttachmentUrl, getSentImapEmail, getSentImapAttachmentUrl, getDownloadToken, getInbox, getSentEmails, replyToEmail } from '../../lib/api'
import toast from 'react-hot-toast'
import { useAuth, useUI } from '../../App'
import {
  ArrowLeft, Mail, Phone, StickyNote, Calendar, Paperclip,
  FileText, Image, File, Download, Eye, X, Loader2, Edit3,
  Clock, ChevronDown, ChevronUp, Inbox, SendHorizontal, Receipt,
  TrendingUp, Target, Zap, UserPlus, BarChart3, ExternalLink, Reply,
  Forward, Send, FolderPlus, Upload, FolderOpen, Trash2, MoreVertical, Activity,
  Home, List, Grid, ChevronRight, Plus
} from 'lucide-react'
import SimpleRichEditor from '../SimpleRichEditor'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, Legend, PieChart, Pie
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

export default function ContactDetailView({ contactId, onBack, onEdit, onNavigate, enhancedMail }) {
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
  const [showReply, setShowReply] = useState(false)
  const [replyHtml, setReplyHtml] = useState('')
  const [replyToEmailData, setReplyToEmailData] = useState(null)
  const [sendingReply, setSendingReply] = useState(false)
  const [isForwarding, setIsForwarding] = useState(false)
  const [forwardTo, setForwardTo] = useState('')
  // File Manager state — Home Folder is always the root
  const HOME_FOLDER_ID = 'home'
  const [contactFolders, setContactFolders] = useState(() => {
    try {
      const saved = localStorage.getItem(`intimix_contact_folders_${contactId}`)
      let folders = saved ? JSON.parse(saved) : []
      // Ensure Home Folder always exists as root
      if (!folders.find(f => f.id === 'home')) {
        folders = [{ id: 'home', name: 'Kezdőmappa', created_at: new Date().toISOString(), isRoot: true }, ...folders]
      }
      // Migrate old folders: make them children of Home if they have no parent
      folders = folders.map(f => f.id === 'home' ? f : { ...f, parentId: f.parentId || 'home' })
      return folders
    } catch { return [{ id: 'home', name: 'Kezdőmappa', created_at: new Date().toISOString(), isRoot: true }] }
  })
  const [contactFiles, setContactFiles] = useState(() => {
    try {
      const saved = localStorage.getItem(`intimix_contact_files_${contactId}`)
      let files = saved ? JSON.parse(saved) : []
      // Migrate: move root files to home folder
      files = files.map(f => f.folderId === 'root' ? { ...f, folderId: 'home' } : f)
      return files
    } catch { return [] }
  })
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState('home')
  const [fileViewMode, setFileViewMode] = useState('grid') // 'grid' | 'list'
  const [fileSearch, setFileSearch] = useState('')
  const [fileSort, setFileSort] = useState('name')
  const [renamingFolderId, setRenamingFolderId] = useState(null)
  const [renamingFolderName, setRenamingFolderName] = useState('')
  const [renamingFileId, setRenamingFileId] = useState(null)
  const [renamingFileName, setRenamingFileName] = useState('')
  const fileInputRef = useRef(null)

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

  // Debug reply modal state
  useEffect(() => {
    if (showReply && replyToEmailData) {
      console.log('Reply modal is open, replyToEmailData:', replyToEmailData)
    }
  }, [showReply, replyToEmailData])

  const handleExpandEmail = async (emailId) => {
    // Always use inline expansion for contact details, regardless of enhanced mail setting
    // Enhanced mail view should only be accessed from main navigation
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
    // Always use inline expansion for contact details, regardless of enhanced mail setting
    // Enhanced mail view should only be accessed from main navigation
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
    // Always use inline expansion for contact details, regardless of enhanced mail setting
    // Enhanced mail view should only be accessed from main navigation
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

  const handleReply = (email, emailType) => {
    setReplyToEmailData({ ...email, type: emailType })
    setShowReply(true)
    setIsForwarding(false)
    setForwardTo('')
    setReplyHtml('')
  }

  const handleForwardEmail = (email, emailType) => {
    setReplyToEmailData({ ...email, type: emailType })
    setIsForwarding(true)
    setShowReply(true)
    setForwardTo('')
    const originalDate = new Date(email.date || email.sent_at).toLocaleString('hu-HU')
    const originalFrom = email.from_name 
      ? `${email.from_name} <${email.from_address}>`
      : (email.from_address || email.to_address || email.recipient_email || '')
    const originalTo = email.to_address || email.recipient_email || ''
    const fwdBody = `<br><br>
<div style="border-top:1px solid #ccc;padding-top:12px;margin-top:16px;color:#666;font-size:13px;">
  <p style="margin:0 0 4px;"><strong>---------- Továbbított üzenet ----------</strong></p>
  <p style="margin:0 0 2px;">Feladó: ${originalFrom}</p>
  <p style="margin:0 0 2px;">Dátum: ${originalDate}</p>
  <p style="margin:0 0 2px;">Tárgy: ${email.subject || ''}</p>
  <p style="margin:0 0 8px;">Címzett: ${originalTo}</p>
  ${email.html_body || email.text_body?.replace(/\n/g, '<br>') || ''}
</div>`
    setReplyHtml(fwdBody)
  }

  const handleSendReply = async () => {
    if (isForwarding && !forwardTo.trim()) return toast.error('Add meg a címzett email címét')
    if (!replyHtml.trim()) return toast.error('Írj valamit a válaszba')
    setSendingReply(true)
    try {
      const email = replyToEmailData
      let fullHtml, subject, sendTo

      if (isForwarding) {
        fullHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">${replyHtml.replace(/\n/g, '<br>')}</div>`
        subject = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject || ''}`
        sendTo = forwardTo.trim()
      } else {
        const originalDate = new Date(email.date || email.sent_at).toLocaleString('hu-HU')
        const originalFrom = email.type === 'sent' 
          ? (email.to_address || email.recipient_email)
          : (email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address)
        fullHtml = `
          <div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">${replyHtml.replace(/\n/g, '<br>')}</div>
          <br>
          <div style="border-left:2px solid #ccc;padding-left:12px;margin-top:16px;color:#666;font-size:13px;">
            <p style="margin:0 0 8px;"><strong>On ${originalDate}, ${originalFrom} wrote:</strong></p>
            ${email.html_body || email.text_body?.replace(/\n/g, '<br>') || ''}
          </div>`
        subject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
        sendTo = email.type === 'sent' ? (email.to_address || email.recipient_email) : email.from_address
      }
      
      await replyToEmail({ to: sendTo, subject, html: fullHtml, inReplyTo: isForwarding ? undefined : (email.message_id || undefined) })
      toast.success(isForwarding ? 'Email továbbítva!' : 'Válasz elküldve!')
      setShowReply(false)
      setReplyHtml('')
      setReplyToEmailData(null)
      setIsForwarding(false)
      setForwardTo('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSendingReply(false)
    }
  }

  // File Manager functions
  const saveFilesToStorage = (folders, files) => {
    localStorage.setItem(`intimix_contact_folders_${contactId}`, JSON.stringify(folders))
    localStorage.setItem(`intimix_contact_files_${contactId}`, JSON.stringify(files))
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return toast.error('Adj nevet a mappának')
    const folder = { id: Date.now().toString(), name: newFolderName.trim(), created_at: new Date().toISOString(), parentId: selectedFolder || 'home' }
    const updated = [...contactFolders, folder]
    setContactFolders(updated)
    saveFilesToStorage(updated, contactFiles)
    setNewFolderName('')
    setShowNewFolder(false)
    toast.success('Mappa létrehozva')
  }

  const handleDeleteFolder = (folderId) => {
    if (folderId === HOME_FOLDER_ID) return toast.error('A Kezdőmappa nem törölhető')
    if (!confirm('Törlöd ezt a mappát és a benne lévő fájlokat?')) return
    const descendantIds = new Set([folderId])
    let changed = true
    while (changed) {
      changed = false
      contactFolders.forEach(folder => {
        if (!descendantIds.has(folder.id) && descendantIds.has(folder.parentId)) {
          descendantIds.add(folder.id)
          changed = true
        }
      })
    }
    const updatedFolders = contactFolders.filter(f => !descendantIds.has(f.id))
    const updatedFiles = contactFiles.filter(f => !descendantIds.has(f.folderId))
    setContactFolders(updatedFolders)
    setContactFiles(updatedFiles)
    saveFilesToStorage(updatedFolders, updatedFiles)
    if (descendantIds.has(selectedFolder)) setSelectedFolder(HOME_FOLDER_ID)
    toast.success('Mappa törölve')
  }

  const handleRenameFolder = (folderId) => {
    const name = renamingFolderName.trim()
    if (!name) return toast.error('Adj nevet a mappának')
    const updatedFolders = contactFolders.map(folder => folder.id === folderId ? { ...folder, name } : folder)
    setContactFolders(updatedFolders)
    saveFilesToStorage(updatedFolders, contactFiles)
    setRenamingFolderId(null)
    setRenamingFolderName('')
    toast.success('Mappa átnevezve')
  }

  const handleRenameFile = (fileId) => {
    const name = renamingFileName.trim()
    if (!name) return toast.error('Adj nevet a fájlnak')
    const updatedFiles = contactFiles.map(file => file.id === fileId ? { ...file, name } : file)
    setContactFiles(updatedFiles)
    saveFilesToStorage(contactFolders, updatedFiles)
    setRenamingFileId(null)
    setRenamingFileName('')
    toast.success('Fájl átnevezve')
  }

  const handleDuplicateFile = (file) => {
    const duplicate = {
      ...file,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: `${file.name} másolat`,
      created_at: new Date().toISOString()
    }
    const updatedFiles = [...contactFiles, duplicate]
    setContactFiles(updatedFiles)
    saveFilesToStorage(contactFolders, updatedFiles)
    toast.success('Fájl duplikálva')
  }

  const handleMoveFileToCurrentFolder = (fileId) => {
    const updatedFiles = contactFiles.map(file => file.id === fileId ? { ...file, folderId: selectedFolder || HOME_FOLDER_ID } : file)
    setContactFiles(updatedFiles)
    saveFilesToStorage(contactFolders, updatedFiles)
    toast.success('Fájl áthelyezve')
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newFiles = files.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      folderId: selectedFolder || 'home',
      created_at: new Date().toISOString(),
      dataUrl: URL.createObjectURL(file)
    }))
    const updated = [...contactFiles, ...newFiles]
    setContactFiles(updated)
    saveFilesToStorage(contactFolders, updated)
    toast.success(`${files.length} fájl feltöltve`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteFile = (fileId) => {
    const updated = contactFiles.filter(f => f.id !== fileId)
    setContactFiles(updated)
    saveFilesToStorage(contactFolders, updated)
    toast.success('Fájl törölve')
  }

  const handleSaveEmailAttachment = (att, attUrl) => {
    const file = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: att.filename,
      size: att.size,
      type: att.mimetype,
      folderId: selectedFolder || 'home',
      created_at: new Date().toISOString(),
      dataUrl: attUrl,
      source: 'email'
    }
    const updated = [...contactFiles, file]
    setContactFiles(updated)
    saveFilesToStorage(contactFolders, updated)
    toast.success(`"${att.filename}" mentve a fájlkezelőbe`)
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
          { id: 'emails', icon: SendHorizontal, label: 'Küldött', mobileLabel: 'Küldött', count: (contactEmails?.length || 0) + (contact.sentImap?.length || 0) },
          { id: 'received', icon: Inbox, label: 'Fogadott', mobileLabel: 'Bejövő', count: contactReceivedEmails?.length || 0 },
          { id: 'files', icon: Paperclip, label: 'Fájlok', mobileLabel: 'Fájlok', count: (contact.attachments?.length || 0) + contactFiles.length },
          { id: 'quotes', icon: Receipt, label: 'Árajánlatok', mobileLabel: 'Ajánlat', count: contact.quotes?.length || 0 },
          { id: 'journey', icon: Activity, label: 'Ügyfélút', mobileLabel: 'Út', count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] shrink-0 ${
              activeTab === tab.id
                ? (isModern ? 'bg-[#2EC4BE] text-black shadow-lg shadow-[#2EC4BE]/20' : 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20')
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <tab.icon className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">{tab.mobileLabel}</span>
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
                      onClick={() => isLocal ? handleExpandEmail(email.id) : handleExpandSentImap(email.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isLocal ? (email.status === 'sent' ? 'bg-green-400' : 'bg-red-400') : 'bg-green-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">{email.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            {isLocal ? (
                              <>
                                <span>To: {email.recipient || email.to_address || email.recipient_email}</span>
                                <span>•</span>
                                <span>{formatDate(email._date)}</span>
                              </>
                            ) : (
                              <>
                                <span>From: {email.from_name || email.from_address}</span>
                                <span>•</span>
                                <span>{formatDate(email._date)}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReply(email, isLocal ? 'sent' : 'received') }}
                          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                          title="Válasz"
                        >
                          <Reply className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleForwardEmail(email, isLocal ? 'sent' : 'received') }}
                          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                          title="Továbbítás"
                        >
                          <Forward className="w-4 h-4 text-gray-400" />
                        </button>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                        }
                      </div>
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
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReply(email, 'received') }}
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                      title="Válasz"
                    >
                      <Reply className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleForwardEmail(email, 'received') }}
                      className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                      title="Továbbítás"
                    >
                      <Forward className="w-4 h-4 text-gray-400" />
                    </button>
                    {expandedReceived === email.id
                      ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    }
                  </div>
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
      {activeTab === 'files' && (() => {
        // Build breadcrumb path
        const getBreadcrumbs = () => {
          const crumbs = []
          let currentId = selectedFolder
          while (currentId) {
            const folder = contactFolders.find(f => f.id === currentId)
            if (!folder) break
            crumbs.unshift(folder)
            currentId = folder.parentId || null
          }
          return crumbs
        }
        const breadcrumbs = getBreadcrumbs()

        // Get subfolders of current folder
        const searchNeedle = fileSearch.trim().toLowerCase()
        const subFolders = contactFolders
          .filter(f => f.parentId === selectedFolder && f.id !== 'home')
          .filter(f => !searchNeedle || f.name.toLowerCase().includes(searchNeedle))

        // Get files in current folder + email attachments when at home
        const currentFiles = contactFiles.filter(f => f.folderId === selectedFolder)
        const emailAttachments = selectedFolder === 'home' ? (contact.attachments || []).map(a => ({ ...a, _type: 'email' })) : []
        const allFiles = [...emailAttachments, ...currentFiles.map(f => ({ ...f, _type: 'user' }))]
          .filter(item => {
            if (!searchNeedle) return true
            const name = (item._type === 'email' ? item.filename : item.name) || ''
            const type = (item._type === 'email' ? item.mimetype : item.type) || ''
            return name.toLowerCase().includes(searchNeedle) || type.toLowerCase().includes(searchNeedle)
          })
          .sort((a, b) => {
            if (fileSort === 'date') {
              return new Date(b.uploaded_at || b.created_at || 0) - new Date(a.uploaded_at || a.created_at || 0)
            }
            if (fileSort === 'size') {
              return (b.size || 0) - (a.size || 0)
            }
            if (fileSort === 'type') {
              const aType = (a._type === 'email' ? a.mimetype : a.type) || ''
              const bType = (b._type === 'email' ? b.mimetype : b.type) || ''
              return aType.localeCompare(bType, 'hu')
            }
            const aName = (a._type === 'email' ? a.filename : a.name) || ''
            const bName = (b._type === 'email' ? b.filename : b.name) || ''
            return aName.localeCompare(bName, 'hu')
          })

        return (
          <div className="space-y-3 relative">
            {/* Breadcrumbs + toolbar */}
            <div className={`${isModern ? 'modern-card' : 'glass rounded-xl'} p-3 sm:p-4`}>
              {/* Breadcrumb navigation */}
              <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-hide text-sm">
                <button
                  onClick={() => setSelectedFolder('home')}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-400 hover:text-[#2EC4BE] hover:bg-white/5 transition-all shrink-0 min-h-[36px]"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-medium">Kezdőmappa</span>
                </button>
                {breadcrumbs.slice(1).map((crumb) => (
                  <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    <button
                      onClick={() => setSelectedFolder(crumb.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px] ${
                        selectedFolder === crumb.id ? 'text-[#2EC4BE] bg-[#2EC4BE]/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Toolbar row */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {showNewFolder ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }}
                        placeholder="Mappa neve..."
                        className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-[#2EC4BE] w-36 sm:w-48 min-h-[40px]"
                        autoFocus
                      />
                      <button onClick={handleCreateFolder} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#2EC4BE] hover:bg-[#2EC4BE]/10 rounded-lg transition-all">
                        <Send className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewFolder(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-[#2EC4BE] hover:bg-white/5 transition-all min-h-[40px]"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Új mappa</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-start">
                  <div className="relative min-w-[180px] flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      placeholder="Keresés fájlokra, mappákra..."
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-[#2EC4BE]"
                    />
                  </div>
                  <select
                    value={fileSort}
                    onChange={(e) => setFileSort(e.target.value)}
                    className="px-3 py-2.5 rounded-lg text-sm bg-white/5 border border-white/10 text-gray-200 outline-none focus:border-[#2EC4BE]"
                  >
                    <option value="name">Név szerint</option>
                    <option value="date">Dátum szerint</option>
                    <option value="size">Méret szerint</option>
                    <option value="type">Típus szerint</option>
                  </select>
                  <div className="flex bg-white/5 rounded-lg p-0.5">
                    <button onClick={() => setFileViewMode('grid')} className={`p-1.5 rounded transition-all ${fileViewMode === 'grid' ? 'bg-[#2EC4BE]/15 text-[#2EC4BE]' : 'text-gray-500'}`}>
                      <Grid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setFileViewMode('list')} className={`p-1.5 rounded transition-all ${fileViewMode === 'list' ? 'bg-[#2EC4BE]/15 text-[#2EC4BE]' : 'text-gray-500'}`}>
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] ${
                      isModern ? 'bg-[#2EC4BE] text-black hover:bg-[#2EC4BE]/90 shadow-md' : 'bg-[#1AA19C] text-white hover:bg-[#2EC4BE]'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Feltöltés</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subfolders */}
            {subFolders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {subFolders.map(folder => (
                  <div
                    key={folder.id}
                    className={`${isModern ? 'modern-card' : 'glass rounded-xl'} p-3 sm:p-4 group cursor-pointer hover:border-[#2EC4BE]/30 transition-all`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <FolderOpen className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {renamingFolderId === folder.id ? (
                          <input
                            value={renamingFolderName}
                            onChange={(e) => setRenamingFolderName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder(folder.id)
                              if (e.key === 'Escape') { setRenamingFolderId(null); setRenamingFolderName('') }
                            }}
                            onBlur={() => handleRenameFolder(folder.id)}
                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-[#2EC4BE]"
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-200 truncate">{folder.name}</p>
                        )}
                        <p className="text-[11px] text-gray-500">{contactFiles.filter(f => f.folderId === folder.id).length} fájl</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setRenamingFolderId(folder.id)
                          setRenamingFolderName(folder.name)
                        }}
                        className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-600 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                        className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Files */}
            {allFiles.length === 0 && subFolders.length === 0 ? (
              <div className={`${isModern ? 'modern-card' : 'glass rounded-xl'} p-8 sm:p-10 text-center`}>
                <Paperclip className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Ez a mappa üres</p>
                <p className="text-xs text-gray-600 mt-1">Tölts fel fájlokat vagy hozz létre almappákat</p>
              </div>
            ) : fileViewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allFiles.map(item => {
                  const isEmail = item._type === 'email'
                  const Icon = isEmail ? getFileIcon(item.mimetype) : getFileIcon(item.type)
                  const canPreview = isEmail ? isPreviewable(item.mimetype) : isPreviewable(item.type)
                  const fileUrl = isEmail ? getAttUrl(item) : item.dataUrl
                  const mimeType = isEmail ? item.mimetype : item.type
                  const fileName = isEmail ? item.filename : item.name

                  return (
                    <div key={`${item._type}-${item.id}`} className={`${isModern ? 'modern-card' : 'glass rounded-xl'} p-3 sm:p-4 group hover:border-[#1AA19C]/20 transition-all`}>
                      <div
                        className="w-full h-28 sm:h-32 rounded-lg bg-[#1e2128] flex items-center justify-center mb-3 overflow-hidden cursor-pointer"
                        onClick={() => canPreview && setPreviewAttachment(isEmail ? item : { ...item, mimetype: item.type, filename: item.name })}
                      >
                        {mimeType?.startsWith('image/') && fileUrl ? (
                          <img src={fileUrl} alt={fileName} className="w-full h-full object-contain" />
                        ) : mimeType?.includes('pdf') ? (
                          <div className="text-center">
                            <FileText className="w-8 h-8 text-red-400 mx-auto mb-1" />
                            <p className="text-[10px] text-gray-500">PDF</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Icon className="w-8 h-8 text-gray-500 mx-auto mb-1" />
                            <p className="text-[10px] text-gray-500 truncate max-w-[100px]">{mimeType || 'Fájl'}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {renamingFileId === item.id && !isEmail ? (
                            <input
                              value={renamingFileName}
                              onChange={(e) => setRenamingFileName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameFile(item.id)
                                if (e.key === 'Escape') { setRenamingFileId(null); setRenamingFileName('') }
                              }}
                              onBlur={() => handleRenameFile(item.id)}
                              className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-[#2EC4BE]"
                              autoFocus
                            />
                          ) : (
                            <p className="text-sm text-gray-200 font-medium truncate">{fileName}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-gray-500">{formatSize(item.size)}</p>
                            {isEmail && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Email</span>}
                            {!isEmail && item.source === 'email' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Mentett</span>}
                          </div>
                          <p className="text-[10px] text-gray-600 mt-0.5">{formatDate(isEmail ? item.uploaded_at : item.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {isEmail && (
                            <button onClick={() => handleSaveEmailAttachment(item, getAttUrl(item))} className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-green-400 hover:bg-green-500/10 transition-all" title="Mentés">
                              <FolderPlus className="w-4 h-4" />
                            </button>
                          )}
                          {canPreview && (
                            <button onClick={() => setPreviewAttachment(isEmail ? item : { ...item, mimetype: item.type, filename: item.name })} className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all">
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {fileUrl && (
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all">
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {!isEmail && (
                            <>
                              <button onClick={() => { setRenamingFileId(item.id); setRenamingFileName(item.name) }} className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10 transition-all">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDuplicateFile(item)} className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                                <Plus className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleMoveFileToCurrentFolder(item.id)} className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                                <FolderOpen className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteFile(item.id)} className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* List view */
              <div className="space-y-1">
                {allFiles.map(item => {
                  const isEmail = item._type === 'email'
                  const Icon = isEmail ? getFileIcon(item.mimetype) : getFileIcon(item.type)
                  const canPreview = isEmail ? isPreviewable(item.mimetype) : isPreviewable(item.type)
                  const fileUrl = isEmail ? getAttUrl(item) : item.dataUrl
                  const fileName = isEmail ? item.filename : item.name

                  return (
                    <div
                      key={`${item._type}-${item.id}`}
                      className={`${isModern ? 'modern-card' : 'glass rounded-xl'} p-3 flex items-center gap-3 group hover:border-[#1AA19C]/20 transition-all`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#1e2128] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {renamingFileId === item.id && !isEmail ? (
                          <input
                            value={renamingFileName}
                            onChange={(e) => setRenamingFileName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFile(item.id)
                              if (e.key === 'Escape') { setRenamingFileId(null); setRenamingFileName('') }
                            }}
                            onBlur={() => handleRenameFile(item.id)}
                            className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-[#2EC4BE]"
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm text-gray-200 font-medium truncate">{fileName}</p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span>{formatSize(item.size)}</span>
                          <span>•</span>
                          <span>{formatDate(isEmail ? item.uploaded_at : item.created_at)}</span>
                          {isEmail && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">Email</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isEmail && (
                          <button onClick={() => handleSaveEmailAttachment(item, getAttUrl(item))} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-500 hover:text-green-400 hover:bg-green-500/10 transition-all" title="Mentés">
                            <FolderPlus className="w-4 h-4" />
                          </button>
                        )}
                        {canPreview && (
                          <button onClick={() => setPreviewAttachment(isEmail ? item : { ...item, mimetype: item.type, filename: item.name })} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {fileUrl && (
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        {!isEmail && (
                          <>
                            <button onClick={() => { setRenamingFileId(item.id); setRenamingFileName(item.name) }} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10 transition-all">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDuplicateFile(item)} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                              <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleMoveFileToCurrentFolder(item.id)} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                              <FolderOpen className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteFile(item.id)} className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mobile FAB for quick upload */}
            <div className="sm:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3">
              <button
                onClick={() => setShowNewFolder(true)}
                className="w-12 h-12 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
              >
                <FolderPlus className="w-5 h-5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-full bg-[#2EC4BE] text-black flex items-center justify-center shadow-lg shadow-[#2EC4BE]/30 active:scale-95 transition-transform"
              >
                <Upload className="w-6 h-6" />
              </button>
            </div>
          </div>
        )
      })()}

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
      {/* Reply / Forward Modal — full-screen on mobile, centered card on desktop */}
      {showReply && replyToEmailData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] sm:p-4" onClick={() => { setShowReply(false); setIsForwarding(false); setForwardTo('') }}>
          <div className={`${isModern ? 'modern-card' : 'glass'} w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl fade-in border-t sm:border border-[#2EC4BE]/20 flex flex-col max-h-[95vh] sm:max-h-[85vh]`} onClick={(e) => e.stopPropagation()}>
            {/* Modal header — sticky */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                {isForwarding ? <Forward className="w-5 h-5 text-[#2EC4BE]" /> : <Reply className="w-5 h-5 text-[#2EC4BE]" />}
                <h3 className="text-base sm:text-lg font-semibold text-white">{isForwarding ? 'Továbbítás' : 'Válasz'}</h3>
              </div>
              <button onClick={() => { setShowReply(false); setIsForwarding(false); setForwardTo('') }} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal content — scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500 mb-1">{isForwarding ? 'Eredeti üzenet:' : 'Válasz erre:'}</p>
                <p className="text-sm text-white font-medium truncate">{replyToEmailData.subject}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {replyToEmailData.type === 'sent'
                    ? `Címzett: ${replyToEmailData.to_address || replyToEmailData.recipient_email || replyToEmailData.recipient}`
                    : `Feladó: ${replyToEmailData.from_name || replyToEmailData.from_address}`
                  }
                </p>
              </div>

              {isForwarding && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Címzett</label>
                  <input
                    type="email"
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    placeholder="pelda@email.com"
                    className={`w-full px-4 py-3 rounded-lg text-base sm:text-sm ${isModern ? 'bg-white/5 border border-white/10 focus:border-[#2EC4BE] focus:bg-white/10' : 'bg-white/5 border border-white/10 focus:border-[#2EC4BE]'} text-white placeholder-gray-500 outline-none transition-colors`}
                    autoFocus
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-gray-400">{isForwarding ? 'Üzenet:' : 'Válasz szövege:'}</label>
                  <div className="flex bg-white/5 rounded-lg p-0.5">
                    <button onClick={() => setEditorMode('visual')} className={`px-3 py-1.5 rounded text-xs font-medium transition-all min-h-[32px] ${editorMode === 'visual' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500'}`}>
                      Vizuális
                    </button>
                    <button onClick={() => setEditorMode('code')} className={`px-3 py-1.5 rounded text-xs font-medium transition-all min-h-[32px] ${editorMode === 'code' ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500'}`}>
                      Kód
                    </button>
                  </div>
                </div>
                {editorMode === 'visual' ? (
                  <SimpleRichEditor initialHtml={replyHtml} onChange={setReplyHtml} className="min-h-[160px] sm:min-h-[180px]" />
                ) : (
                  <textarea
                    value={replyHtml}
                    onChange={(e) => setReplyHtml(e.target.value)}
                    placeholder={isForwarding ? 'Adj hozzá üzenetet...' : 'Írd ide a válaszodat...'}
                    className={`w-full min-h-[160px] sm:min-h-[180px] p-4 rounded-lg resize-y text-base sm:text-sm ${isModern ? 'bg-white/5 border border-white/10 focus:bg-white/10' : 'bg-white/5 border border-white/10'} text-white placeholder-gray-500 outline-none focus:border-[#2EC4BE] transition-colors`}
                  />
                )}
              </div>
            </div>

            {/* Modal footer — sticky bottom */}
            <div className="flex items-center gap-3 p-4 sm:p-5 border-t border-white/10 shrink-0">
              <button
                onClick={() => { setShowReply(false); setIsForwarding(false); setForwardTo('') }}
                className={`flex-1 py-3 sm:py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 transition-all min-h-[48px] ${isModern ? 'bg-white/5 hover:bg-white/10' : 'glass-light'}`}
              >
                Mégse
              </button>
              <button
                onClick={handleSendReply}
                disabled={sendingReply || !replyHtml.trim() || (isForwarding && !forwardTo.trim())}
                className={`flex-1 py-3 sm:py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all min-h-[48px] ${
                  isModern ? 'bg-[#2EC4BE] text-black hover:bg-[#2EC4BE]/90 shadow-lg shadow-[#2EC4BE]/20' : 'btn-primary text-white'
                }`}
              >
                {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isForwarding ? 'Továbbítás' : 'Válasz küldése'}
              </button>
            </div>
          </div>
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
