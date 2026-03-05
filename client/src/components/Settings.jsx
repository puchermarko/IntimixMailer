// Beállítások oldal - itt van az SMTP, API kulcsok, meg a doki is
import { useState, useEffect, useRef } from 'react'
import { testSmtp, getApiKeys, createApiKey, deleteApiKey, toggleApiKey, getEnvConfig, updateEnvConfig, getBranding, updateBranding, uploadLogo, exportBackup, importBackup, cleanupDatabase, getSubscription, getStripePrices, createStripeCheckout, openStripePortal, changePassword, deleteAccount } from '../lib/api'
import { useBranding, useAuth, useUI } from '../App'
import toast from 'react-hot-toast'
import {
  Server, CheckCircle, XCircle, Loader2, Shield, Info, Key, Plus, Trash2,
  Copy, Check, Eye, EyeOff, BookOpen, Globe, Settings2, Save, AlertTriangle, Upload, Palette,
  Download, UploadCloud, Database, FileJson, Users, HardDrive, CreditCard, Play, ExternalLink, RefreshCw,
  Lock, UserX, Layout, Monitor, Mail
} from 'lucide-react'

export default function Settings({ onStartTour, enhancedMail, setEnhancedMail }) {
  const [testing, setTesting] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('general')
  const { uiMode, toggleUiMode } = useUI()
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [visibleKeys, setVisibleKeys] = useState({})
  const [docLang, setDocLang] = useState('hu')
  const [envConfig, setEnvConfig] = useState({})
  const [envLoading, setEnvLoading] = useState(false)
  const [envSaving, setEnvSaving] = useState(false)
  const [envDirty, setEnvDirty] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [brandSubtitle, setBrandSubtitle] = useState('')
  const [brandLogo, setBrandLogo] = useState('')
  const [brandLoading, setBrandLoading] = useState(false)
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandDirty, setBrandDirty] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef(null)
  const { refreshBranding } = useBranding()
  const { isAdmin, setSubscriptionStatus, logout } = useAuth()
  const [backupExporting, setBackupExporting] = useState(false)
  const [backupImporting, setBackupImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const backupInputRef = useRef(null)
  const [cleaning, setCleaning] = useState(false)
  const [cleanupResult, setCleanupResult] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [subLoading, setSubLoading] = useState(false)
  const [stripePrices, setStripePrices] = useState([])
  const [stripeLoading, setStripeLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [companyVat, setCompanyVat] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyStreet, setCompanyStreet] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyZip, setCompanyZip] = useState('')
  const [companyCountry, setCompanyCountry] = useState('')
  const [companyBankName, setCompanyBankName] = useState('')
  const [companyBankIban, setCompanyBankIban] = useState('')
  const [quotePrefix, setQuotePrefix] = useState('AJ')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showDeletePw, setShowDeletePw] = useState(false)

  const isModern = uiMode === 'modern'

  // Handle Stripe redirect URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'subscription') {
      setActiveTab('subscription')
      if (params.get('stripe') === 'success') {
        toast.success('Előfizetés sikeresen aktiválva!')
        window.history.replaceState({}, '', window.location.pathname)
      } else if (params.get('stripe') === 'cancelled') {
        toast('Fizetés megszakítva', { icon: '⚠️' })
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'expert') loadKeys()
    if (activeTab === 'config' || activeTab === 'general' || activeTab === 'branding') loadEnv()
    if (activeTab === 'branding') loadBrand()
    if (activeTab === 'subscription') loadSubscription()
  }, [activeTab])

  const loadSubscription = async () => {
    setSubLoading(true)
    try {
      const sub = await getSubscription()
      setSubscription(sub)
      // Sync status back to AuthContext so the rest of the app stays up to date
      if (sub.status && setSubscriptionStatus) {
        setSubscriptionStatus(sub.status)
        localStorage.setItem('intimix_sub_status', sub.status)
      }
      // Load Stripe prices if not admin and not already active
      if (sub.status !== 'admin' && sub.status !== 'active') {
        setStripeLoading(true)
        try {
          const prices = await getStripePrices()
          setStripePrices(prices)
        } catch {} finally { setStripeLoading(false) }
      }
    } catch (err) { toast.error(err.message) }
    finally { setSubLoading(false) }
  }

  const handleStripeCheckout = async (priceId) => {
    setCheckoutLoading(true)
    try {
      const { url } = await createStripeCheckout(priceId)
      if (url) window.location.href = url
    } catch (err) { toast.error(err.message) }
    finally { setCheckoutLoading(false) }
  }

  const handleStripePortal = async () => {
    setPortalLoading(true)
    try {
      const { url } = await openStripePortal()
      if (url) window.location.href = url
    } catch (err) { toast.error(err.message) }
    finally { setPortalLoading(false) }
  }

  const loadBrand = async () => {
    setBrandLoading(true)
    try {
      const data = await getBranding()
      setBrandName(data.app_name || '')
      setBrandSubtitle(data.app_subtitle || '')
      setBrandLogo(data.app_logo || '')
      setCompanyName(data.company_name || '')
      setCompanyVat(data.company_vat || '')
      setCompanyEmail(data.company_email || '')
      setCompanyPhone(data.company_phone || '')
      setCompanyStreet(data.company_street || '')
      setCompanyCity(data.company_city || '')
      setCompanyZip(data.company_zip || '')
      setCompanyCountry(data.company_country || '')
      setCompanyBankName(data.company_bank_name || '')
      setCompanyBankIban(data.company_bank_iban || '')
      setQuotePrefix(data.quote_prefix || 'AJ')
      setBrandDirty(false)
    } catch (err) { toast.error(err.message) }
    finally { setBrandLoading(false) }
  }

  const handleBrandSave = async () => {
    setBrandSaving(true)
    try {
      await updateBranding({ app_name: brandName, app_subtitle: brandSubtitle, company_name: companyName, company_vat: companyVat, company_email: companyEmail, company_phone: companyPhone, company_street: companyStreet, company_city: companyCity, company_zip: companyZip, company_country: companyCountry, company_bank_name: companyBankName, company_bank_iban: companyBankIban, quote_prefix: quotePrefix })
      toast.success('Márka beállítások mentve!')
      setBrandDirty(false)
      await refreshBranding()
    } catch (err) { toast.error(err.message) }
    finally { setBrandSaving(false) }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const result = await uploadLogo(file)
      setBrandLogo(result.logo)
      toast.success('Logó feltöltve!')
      await refreshBranding()
    } catch (err) { toast.error(err.message) }
    finally { setLogoUploading(false) }
  }

  const loadEnv = async () => {
    setEnvLoading(true)
    try { setEnvConfig(await getEnvConfig()); setEnvDirty(false) } catch (err) { toast.error(err.message) }
    finally { setEnvLoading(false) }
  }

  const handleEnvChange = (key, value) => {
    setEnvConfig(prev => ({ ...prev, [key]: value }))
    setEnvDirty(true)
  }

  const handleEnvSave = async () => {
    setEnvSaving(true)
    try {
      const result = await updateEnvConfig(envConfig)
      toast.success(result.message || 'Mentve!')
      setEnvDirty(false)
      await loadEnv()
    } catch (err) { toast.error(err.message) }
    finally { setEnvSaving(false) }
  }

  const loadKeys = async () => {
    try { setApiKeys(await getApiKeys()) } catch {}
  }

  const handleTestSmtp = async () => {
    setTesting(true); setSmtpStatus(null)
    try { await testSmtp(); setSmtpStatus('success'); toast.success('SMTP kapcsolat rendben!') }
    catch (err) { setSmtpStatus('error'); toast.error(err.message) }
    finally { setTesting(false) }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return toast.error('Adj meg egy nevet a kulcsnak')
    setCreatingKey(true)
    try {
      const result = await createApiKey(newKeyName.trim())
      setNewlyCreatedKey(result.key)
      setNewKeyName('')
      await loadKeys()
      toast.success('API kulcs létrehozva!')
    } catch (err) { toast.error(err.message) }
    finally { setCreatingKey(false) }
  }

  const handleDeleteKey = async (id) => {
    if (!confirm('Törlöd ezt az API kulcsot? A külső appok amik használják le fognak állni.')) return
    try { await deleteApiKey(id); await loadKeys(); toast.success('Kulcs törölve') } catch (err) { toast.error(err.message) }
  }

  const handleToggleKey = async (id) => {
    try { await toggleApiKey(id); await loadKeys() } catch (err) { toast.error(err.message) }
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    toast.success('Másolva!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const maskKey = (key) => key.slice(0, 8) + '••••••••••••••••' + key.slice(-4)

  const handleExportBackup = async () => {
    setBackupExporting(true)
    try {
      const data = await exportBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${isAdmin ? 'full' : 'user'}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Mentés letöltve!')
    } catch (err) { toast.error(err.message) }
    finally { setBackupExporting(false) }
  }

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBackupImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = await importBackup(data)
      setImportResult(result.results)
      toast.success('Visszaállítás sikeres!')
    } catch (err) { toast.error(err.message) }
    finally { setBackupImporting(false); if (backupInputRef.current) backupInputRef.current.value = '' }
  }

  const tabs = [
    { id: 'account', label: 'Fiók' },
    { id: 'general', label: 'Általános' },
    { id: 'branding', label: 'Márka' },
    { id: 'config', label: 'Konfiguráció' },
    { id: 'subscription', label: 'Előfizetés' },
    { id: 'backup', label: 'Mentés' },
    { id: 'expert', label: 'Haladó' },
  ]

  const baseUrl = 'https://pultify.hu'

  return (
    <div className={isModern ? 'max-w-[1600px] mx-auto fade-in' : ''}>
      <div className="mb-6 mt-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Beállítások</h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Konfiguráció, API kulcsok és dokumentáció</p>
      </div>

      {/* Fülek */}
      <div className={`flex items-center gap-1 overflow-x-auto scrollbar-hide mb-6 ${isModern ? 'p-1 bg-white/5 rounded-2xl w-fit' : 'border-b border-white/5'}`}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`transition-all whitespace-nowrap ${
              isModern 
                ? `px-4 py-2 rounded-xl text-sm font-medium ${activeTab === tab.id ? 'bg-[#2EC4BE] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
                : `px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium border-b-2 -mb-px ${activeTab === tab.id ? 'text-[#2EC4BE] border-[#1AA19C]' : 'text-gray-400 border-transparent hover:text-gray-200'}`
            }`}>{tab.label}</button>
        ))}
      </div>

      {/* ═══ FIÓK FÜL ═══ */}
      {activeTab === 'account' && (
        <div className="space-y-6 max-w-2xl fade-in">
          {/* Jelszó változtatás */}
          <div className={isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}><Lock className="w-5 h-5 text-[#1AA19C]" /></div>
              <div><h3 className="text-base font-semibold text-white">Jelszó változtatás</h3><p className="text-xs text-gray-500">Változtasd meg a jelenlegi jelszavadat</p></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Jelenlegi jelszó</label>
                <div className="relative">
                  <input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••" className={`input-field w-full px-3 py-2 text-sm pr-10 ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Új jelszó</label>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Legalább 6 karakter" className={`input-field w-full px-3 py-2 text-sm pr-10 ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Új jelszó megerősítése</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Írd be újra az új jelszót" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">A jelszavak nem egyeznek</p>
                )}
              </div>
              <button
                onClick={async () => {
                  if (!currentPassword || !newPassword) return toast.error('Töltsd ki az összes mezőt')
                  if (newPassword.length < 6) return toast.error('Az új jelszónak legalább 6 karakter hosszúnak kell lennie')
                  if (newPassword !== confirmPassword) return toast.error('A jelszavak nem egyeznek')
                  setChangingPassword(true)
                  try {
                    await changePassword(currentPassword, newPassword)
                    toast.success('Jelszó sikeresen megváltoztatva!')
                    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
                  } catch (err) { toast.error(err.message) }
                  finally { setChangingPassword(false) }
                }}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className={`btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Jelszó változtatás
              </button>
            </div>
          </div>

          {/* Fiók törlés */}
          {!isAdmin && (
            <div className={`${isModern ? 'modern-card p-6 border-red-500/20' : 'glass rounded-xl p-6 border border-red-500/20'}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><UserX className="w-5 h-5 text-red-400" /></div>
                <div><h3 className="text-base font-semibold text-white">Fiók törlése</h3><p className="text-xs text-gray-500">Véglegesen töröld a fiókodat és minden adatodat</p></div>
              </div>

              <div className={`rounded-lg p-4 flex items-start gap-3 border border-red-500/20 mb-5 ${isModern ? 'bg-red-500/5' : 'glass'}`}>
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-300 font-medium">Figyelem — ez a művelet visszavonhatatlan!</p>
                  <p className="text-xs text-gray-500 mt-1">A fiók törlésével az összes adatod véglegesen törlődik: kapcsolatok, emailek, árajánlatok, sablonok és beállítások. Ez a művelet nem vonható vissza.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Írd be: <span className="font-mono text-red-400">TÖRLÉS</span> a megerősítéshez</label>
                  <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="TÖRLÉS" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Jelszó megerősítés</label>
                  <div className="relative">
                    <input type={showDeletePw ? 'text' : 'password'} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Add meg a jelszavadat" className={`input-field w-full px-3 py-2 text-sm pr-10 ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                    <button type="button" onClick={() => setShowDeletePw(!showDeletePw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showDeletePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (deleteConfirmText !== 'TÖRLÉS') return toast.error('Írd be pontosan: TÖRLÉS')
                    if (!deletePassword) return toast.error('Add meg a jelszavadat')
                    setDeletingAccount(true)
                    try {
                      await deleteAccount(deletePassword)
                      toast.success('Fiók sikeresen törölve')
                      logout()
                    } catch (err) {
                      if (err.hasActiveSubscription) {
                        toast.error('Aktív előfizetéssel rendelkezel. Először mondd le az előfizetésed az Előfizetés fülön, majd próbáld újra.', { duration: 6000 })
                      } else {
                        toast.error(err.message)
                      }
                    }
                    finally { setDeletingAccount(false) }
                  }}
                  disabled={deletingAccount || deleteConfirmText !== 'TÖRLÉS' || !deletePassword}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-sm text-red-400 font-medium transition-all disabled:opacity-50">
                  {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Fiók végleges törlése
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ÁLTALÁNOS FÜL ═══ */}
      {activeTab === 'general' && (
        <div className="space-y-6 max-w-2xl fade-in">
          {/* UI Beállítások */}
          <div className={`${isModern ? 'modern-card p-6 border-[#2EC4BE]/20' : 'glass rounded-xl p-6 border border-[#2EC4BE]/20'} relative overflow-hidden group`}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#2EC4BE]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-5 relative">
              <div className="w-10 h-10 rounded-xl bg-[#2EC4BE]/10 flex items-center justify-center">
                <Layout className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Felhasználói Felület</h3>
                <p className="text-xs text-gray-500">Válassz a klasszikus és a modern megjelenés között</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5 relative">
              <div className="flex items-center gap-3">
                <Monitor className={`w-5 h-5 ${uiMode === 'legacy' ? 'text-gray-400' : 'text-[#2EC4BE]'}`} />
                <div>
                  <p className="text-sm font-medium text-white">Klasszikus Felület</p>
                  <p className="text-xs text-gray-400">Válts vissza a hagyományos megjelenésre</p>
                </div>
              </div>
              
              <button
                onClick={() => toggleUiMode()}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  uiMode === 'legacy' ? 'bg-gray-700' : 'bg-[#2EC4BE]'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                    uiMode === 'legacy' ? 'translate-x-0' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Enhanced Mail Toggle */}
          <div className={`${isModern ? 'modern-card p-6 border-[#2EC4BE]/20' : 'glass rounded-xl p-6 border border-[#2EC4BE]/20'} relative overflow-hidden group`}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#2EC4BE]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-5 relative">
              <div className="w-10 h-10 rounded-xl bg-[#2EC4BE]/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Továbbfejlesztett Levelezés</h3>
                <p className="text-xs text-gray-500">Apple Mail stílusú, modern levelező felület</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5 relative">
              <div className="flex items-center gap-3">
                <Mail className={`w-5 h-5 ${enhancedMail ? 'text-[#2EC4BE]' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-white">Modern Levelező</p>
                  <p className="text-xs text-gray-400">Oszlopos elrendezés, jobb UX</p>
                </div>
              </div>
              
              <button
                onClick={() => setEnhancedMail(!enhancedMail)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  enhancedMail ? 'bg-[#2EC4BE]' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                    enhancedMail ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className={isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center"><Server className="w-5 h-5 text-[#1AA19C]" /></div>
              <div><h3 className="text-base font-semibold text-white">SMTP Szerver</h3><p className="text-xs text-gray-500">Levelezőszerver kapcsolat</p></div>
            </div>
            <div className="space-y-2">
              {[['Hoszt', envConfig.smtp_host || '—'],['Port', envConfig.smtp_port ? `${envConfig.smtp_port} (${envConfig.smtp_port === '465' ? 'SSL' : 'TLS'})` : '—'],['Felhasználó', envConfig.smtp_user || '—'],['Titkosítás', envConfig.smtp_port === '465' ? 'SSL' : 'TLS'],['Feladó', envConfig.smtp_from_name || envConfig.smtp_user || '—']].map(([l,v]) => (
                <div key={l} className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                  <span className="text-xs text-gray-400">{l}</span><span className="text-sm text-gray-200 font-mono">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={handleTestSmtp} disabled={testing}
                className={`btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                {testing ? <><Loader2 className="w-4 h-4 animate-spin" />Tesztelés...</> : 'Kapcsolat tesztelése'}
              </button>
              {smtpStatus === 'success' && <span className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle className="w-4 h-4" />Kapcsolódva</span>}
              {smtpStatus === 'error' && <span className="flex items-center gap-1.5 text-red-400 text-sm"><XCircle className="w-4 h-4" />Sikertelen</span>}
            </div>
          </div>

          <div className={isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-green-400" /></div>
              <div><h3 className="text-base font-semibold text-white">Biztonság</h3></div>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              {['SMTP adatok szerver oldali környezeti változókban tárolva','JWT tokenek 24 órás lejárattal','Minden kapcsolat TLS/SSL titkosítással'].map(t => (
                <div key={t} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /><p>{t}</p></div>
              ))}
            </div>
          </div>

          <div className={isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Info className="w-5 h-5 text-blue-400" /></div>
              <div><h3 className="text-base font-semibold text-white">Sablon változók</h3></div>
            </div>
            <div className="space-y-2">
              {[['{{name}}','Címzett neve'],['{{email}}','Email cím'],['{{order_id}}','Rendelés azonosító'],['{{tracking_number}}','Nyomkövetési szám'],['{{tracking_url}}','Nyomkövetési link'],['{{delivery_time}}','Szállítási idő'],['{{delivery_phone}}','Futár telefonszáma']].map(([v,d]) => (
                <div key={v} className={`flex items-center justify-between px-4 py-2 rounded-lg ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                  <code className="text-xs text-[#2EC4BE] font-mono">{v}</code><span className="text-xs text-gray-400">{d}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center"><Play className="w-5 h-5 text-[#1AA19C]" /></div>
              <div><h3 className="text-base font-semibold text-white">Gyors Bemutató</h3><p className="text-xs text-gray-500">Nézd meg újra a funkciók bemutatóját</p></div>
            </div>
            <p className="text-sm text-gray-400 mb-4">Ha szeretnéd újra megnézni a rendszer funkcióinak bemutatóját, kattints az alábbi gombra.</p>
            <button onClick={() => { if (onStartTour) { localStorage.removeItem('intimix_tour_completed'); onStartTour() } }}
              className={`btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
              <Play className="w-4 h-4" /> Bemutató Újraindítása
            </button>
          </div>
        </div>
      )}

      {/* ═══ MÁRKA FÜL - logó és alkalmazás neve ═══ */}
      {activeTab === 'branding' && (
        <div className="space-y-6 max-w-2xl fade-in">
          {brandLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#1AA19C] animate-spin" /></div>
          ) : (
            <>
              {/* Logó feltöltés */}
              <div className={isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"><Palette className="w-5 h-5 text-purple-400" /></div>
                  <div><h3 className="text-base font-semibold text-white">Logó</h3><p className="text-xs text-gray-500">Az alkalmazás logója (fejléc, bejelentkezés)</p></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className={`w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden p-2 ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                    <img src={brandLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="space-y-3">
                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" className="hidden" />
                    <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-300 transition-all disabled:opacity-50 ${isModern ? 'bg-white/5 hover:bg-white/10' : 'glass-light hover:border-[#1AA19C]/20'}`}>
                      {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Új logó feltöltése
                    </button>
                    <p className="text-[10px] text-gray-500">PNG, JPG, SVG, WebP vagy GIF (max 10MB)</p>
                  </div>
                </div>
              </div>

              {/* Alkalmazás neve */}
              <div className={isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center"><Settings2 className="w-5 h-5 text-[#1AA19C]" /></div>
                  <div><h3 className="text-base font-semibold text-white">Alkalmazás neve</h3><p className="text-xs text-gray-500">Ez jelenik meg a fejlécben és a bejelentkezésnél</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Név (pl. cég neve)</label>
                    <input type="text" value={brandName} onChange={(e) => { setBrandName(e.target.value); setBrandDirty(true) }}
                      placeholder="Pultify" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Alcím</label>
                    <input type="text" value={brandSubtitle} onChange={(e) => { setBrandSubtitle(e.target.value); setBrandDirty(true) }}
                      placeholder="Mailer" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>

                {/* Előnézet */}
                <div className={`mt-5 p-4 rounded-xl ${isModern ? 'bg-white/5' : 'glass-light'}`}>
                  <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Előnézet</p>
                  <div className="flex items-center gap-3">
                    <img src={brandLogo} alt="Preview" className="h-8 object-contain" />
                    <div className="h-5 w-px bg-white/10" />
                    <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">{brandSubtitle || 'Mailer'}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{brandName || 'Pultify'} — {brandSubtitle || 'Management'}</p>
                </div>
              </div>

              {/* Cégadatok */}
              <div className={isModern ? 'modern-card p-6' : 'glass rounded-xl p-6'}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Info className="w-5 h-5 text-blue-400" /></div>
                  <div><h3 className="text-base font-semibold text-white">Cégadatok</h3><p className="text-xs text-gray-500">Árajánlatokon és emailekben megjelenő adatok</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-400 mb-1">Cégnév</label>
                    <input type="text" value={companyName} onChange={(e) => { setCompanyName(e.target.value); setBrandDirty(true) }}
                      placeholder="Cég neve" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Adószám</label>
                    <input type="text" value={companyVat} onChange={(e) => { setCompanyVat(e.target.value); setBrandDirty(true) }}
                      placeholder="12345678-1-23" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Email</label>
                    <input type="email" value={companyEmail} onChange={(e) => { setCompanyEmail(e.target.value); setBrandDirty(true) }}
                      placeholder="info@ceg.hu" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Telefon</label>
                    <input type="tel" value={companyPhone} onChange={(e) => { setCompanyPhone(e.target.value); setBrandDirty(true) }}
                      placeholder="+3630..." className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
                  <div className="col-span-2"><label className="block text-xs text-gray-400 mb-1">Utca, házszám</label>
                    <input type="text" value={companyStreet} onChange={(e) => { setCompanyStreet(e.target.value); setBrandDirty(true) }}
                      placeholder="Példa utca 1." className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Irányítószám</label>
                    <input type="text" value={companyZip} onChange={(e) => { setCompanyZip(e.target.value); setBrandDirty(true) }}
                      placeholder="1234" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} /></div>                  <div><label className="block text-xs text-gray-400 mb-1">Város</label>
                    <input type="text" value={companyCity} onChange={(e) => { setCompanyCity(e.target.value); setBrandDirty(true) }}
                      placeholder="Budapest" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Ország</label>
                    <input type="text" value={companyCountry} onChange={(e) => { setCompanyCountry(e.target.value); setBrandDirty(true) }}
                      placeholder="Magyarország" className="input-field w-full px-3 py-2 text-sm" /></div>
                </div>
              </div>

              {/* Bankszámla */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-green-400" /></div>
                  <div><h3 className="text-base font-semibold text-white">Bankszámla</h3><p className="text-xs text-gray-500">Árajánlatokon megjelenő bankadatok</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-400 mb-1">Bank neve</label>
                    <input type="text" value={companyBankName} onChange={(e) => { setCompanyBankName(e.target.value); setBrandDirty(true) }}
                      placeholder="OTP Bank" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">IBAN / Számlaszám</label>
                    <input type="text" value={companyBankIban} onChange={(e) => { setCompanyBankIban(e.target.value); setBrandDirty(true) }}
                      placeholder="HU12 1234 5678 9112 1234 1234 1234" className="input-field w-full px-3 py-2 text-sm" /></div>
                </div>
              </div>

              {/* Árajánlat számozás */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-amber-400" /></div>
                  <div><h3 className="text-base font-semibold text-white">Árajánlat számozás</h3><p className="text-xs text-gray-500">Egyedi számozási minta az árajánlatokhoz</p></div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Előtag (prefix)</label>
                    <input type="text" value={quotePrefix} onChange={(e) => { setQuotePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setBrandDirty(true) }}
                      placeholder="AJ" maxLength={6} className="input-field w-full px-3 py-2 text-sm font-mono uppercase" />
                    <p className="text-[10px] text-gray-500 mt-1">Max 6 karakter, csak betűk és számok. Pl: AJ, INV, QT</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Domain (automatikus)</label>
                    <div className="input-field w-full px-3 py-2 text-sm font-mono text-gray-500 bg-white/[0.02]">
                      {(() => {
                        const smtp = envConfig.smtp_user || ''
                        return smtp.includes('@') ? smtp.split('@')[1].split('.')[0].toUpperCase() : '—'
                      })()}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Az SMTP email domain neve alapján automatikusan generálódik</p>
                  </div>
                  <div className="p-4 rounded-xl glass-light">
                    <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Előnézet</p>
                    <p className="text-lg font-mono text-[#2EC4BE] font-semibold">
                      {(() => {
                        const p = quotePrefix || 'AJ'
                        const smtp = envConfig.smtp_user || ''
                        const d = smtp.includes('@') ? smtp.split('@')[1].split('.')[0].toUpperCase() : ''
                        const y = new Date().getFullYear()
                        return d ? `${p}-${d}-${y}-0001` : `${p}-${y}-0001`
                      })()}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-2">A sorszám (0001, 0002...) automatikusan növekszik minden új árajánlatnál</p>
                  </div>
                </div>
              </div>

              {/* Mentés gomb */}
              <div className="flex items-center gap-3">
                <button onClick={handleBrandSave} disabled={brandSaving || !brandDirty}
                  className="btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                  {brandSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Mentés
                </button>
                {brandDirty && <span className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Mentetlen változások</span>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ KONFIGURÁCIÓ FÜL - .env szerkesztése ═══ */}
      {activeTab === 'config' && (
        <div className="space-y-6 max-w-2xl fade-in">
          {envLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#1AA19C] animate-spin" /></div>
          ) : (
            <>
              <div className="glass rounded-xl p-4 flex items-start gap-3 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-300 font-medium">SMTP/IMAP beállítások</p>
                  <p className="text-xs text-gray-500 mt-0.5">A jelszavak maszkolt formában jelennek meg. Csak akkor írd felül, ha változtatni akarod.</p>
                </div>
              </div>

              {/* SMTP */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center"><Server className="w-5 h-5 text-[#1AA19C]" /></div>
                  <div><h3 className="text-base font-semibold text-white">SMTP beállítások</h3><p className="text-xs text-gray-500">Kimenő levelezőszerver</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-400 mb-1">SMTP hoszt</label>
                    <input type="text" value={envConfig.smtp_host || ''} onChange={(e) => handleEnvChange('smtp_host', e.target.value)}
                      placeholder="mail.example.com" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">SMTP port</label>
                    <input type="text" value={envConfig.smtp_port || ''} onChange={(e) => handleEnvChange('smtp_port', e.target.value)}
                      placeholder="465" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">SMTP felhasználó</label>
                    <input type="text" value={envConfig.smtp_user || ''} onChange={(e) => handleEnvChange('smtp_user', e.target.value)}
                      placeholder="info@example.com" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">SMTP jelszó</label>
                    <input type="password" value={envConfig.smtp_pass || ''} onChange={(e) => handleEnvChange('smtp_pass', e.target.value)}
                      placeholder="••••••••" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div className="col-span-2"><label className="block text-xs text-gray-400 mb-1">Feladó neve</label>
                    <input type="text" value={envConfig.smtp_from_name || ''} onChange={(e) => handleEnvChange('smtp_from_name', e.target.value)}
                      placeholder="Cég neve" className="input-field w-full px-3 py-2 text-sm" /></div>
                </div>
              </div>

              {/* IMAP */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Server className="w-5 h-5 text-blue-400" /></div>
                  <div><h3 className="text-base font-semibold text-white">IMAP beállítások</h3><p className="text-xs text-gray-500">Bejövő levelezőszerver (szinkronizálás)</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-400 mb-1">IMAP hoszt</label>
                    <input type="text" value={envConfig.imap_host || ''} onChange={(e) => handleEnvChange('imap_host', e.target.value)}
                      placeholder="mail.example.com" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">IMAP port</label>
                    <input type="text" value={envConfig.imap_port || ''} onChange={(e) => handleEnvChange('imap_port', e.target.value)}
                      placeholder="993" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">IMAP felhasználó</label>
                    <input type="text" value={envConfig.imap_user || ''} onChange={(e) => handleEnvChange('imap_user', e.target.value)}
                      placeholder="info@example.com" className="input-field w-full px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">IMAP jelszó</label>
                    <input type="password" value={envConfig.imap_pass || ''} onChange={(e) => handleEnvChange('imap_pass', e.target.value)}
                      placeholder="••••••••" className="input-field w-full px-3 py-2 text-sm" /></div>
                </div>
              </div>

              {/* Automatikus szinkronizálás */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><RefreshCw className="w-5 h-5 text-green-400" /></div>
                  <div><h3 className="text-base font-semibold text-white">Automatikus szinkronizálás</h3><p className="text-xs text-gray-500">Bejövő és kimenő levelek automatikus szinkronizálása megnyitáskor</p></div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
                  <div>
                    <p className="text-sm text-gray-200">Automatikus szinkronizálás</p>
                    <p className="text-[10px] text-gray-500">Ha be van kapcsolva, a bejövő és kimenő levelek automatikusan szinkronizálódnak az oldal megnyitásakor</p>
                  </div>
                  <button onClick={() => handleEnvChange('auto_sync', envConfig.auto_sync === 'true' ? 'false' : 'true')}
                    className={`relative w-11 h-6 rounded-full transition-colors ${envConfig.auto_sync === 'true' ? 'bg-[#1AA19C]' : 'bg-gray-600'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${envConfig.auto_sync === 'true' ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Mentés gomb */}
              <div className="flex items-center gap-3">
                <button onClick={handleEnvSave} disabled={envSaving || !envDirty}
                  className="btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                  {envSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Mentés
                </button>
                {envDirty && <span className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Mentetlen változások</span>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ ELŐFIZETÉS FÜL ═══ */}
      {activeTab === 'subscription' && (
        <div className="space-y-6 max-w-2xl fade-in">
          {subLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#1AA19C] animate-spin" /></div>
          ) : subscription ? (
            <>
              {/* Státusz */}
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-[#1AA19C]" /></div>
                  <div><h3 className="text-base font-semibold text-white">Előfizetés állapota</h3><p className="text-xs text-gray-500">Jelenlegi előfizetési státuszod</p></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
                    <span className="text-xs text-gray-400">Státusz</span>
                    <span className={`text-sm font-medium px-2.5 py-1 rounded-lg ${
                      subscription.status === 'active' ? 'bg-green-500/15 text-green-400' :
                      subscription.status === 'trial' ? 'bg-blue-500/15 text-blue-400' :
                      subscription.status === 'admin' ? 'bg-purple-500/15 text-purple-400' :
                      subscription.status === 'expired' ? 'bg-red-500/15 text-red-400' :
                      'bg-gray-500/15 text-gray-400'
                    }`}>
                      {subscription.status === 'active' ? 'Aktív előfizetés' :
                       subscription.status === 'trial' ? 'Próbaidőszak' :
                       subscription.status === 'admin' ? 'Adminisztrátor' :
                       subscription.status === 'expired' ? 'Lejárt' :
                       subscription.status === 'inactive' ? 'Inaktív' : 'Nincs előfizetés'}
                    </span>
                  </div>
                  {subscription.status === 'trial' && subscription.trial_end && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
                      <span className="text-xs text-gray-400">Próbaidőszak vége</span>
                      <span className="text-sm text-gray-200">{new Date(subscription.trial_end + 'Z').toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  )}
                  {subscription.status === 'trial' && subscription.trial_end && (() => {
                    const days = Math.ceil((new Date(subscription.trial_end + 'Z') - new Date()) / (1000 * 60 * 60 * 24))
                    return (
                      <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
                        <span className="text-xs text-gray-400">Hátralévő napok</span>
                        <span className={`text-sm font-medium ${days <= 7 ? 'text-amber-400' : 'text-gray-200'}`}>{days > 0 ? `${days} nap` : 'Lejárt'}</span>
                      </div>
                    )
                  })()}
                  {subscription.status === 'active' && subscription.subscription_start && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
                      <span className="text-xs text-gray-400">Előfizetés kezdete</span>
                      <span className="text-sm text-gray-200">{new Date(subscription.subscription_start + 'Z').toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stripe előfizetés kezelése */}
              {subscription.status !== 'admin' && (
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-purple-400" /></div>
                    <div><h3 className="text-base font-semibold text-white">Előfizetés kezelése</h3><p className="text-xs text-gray-500">Fizetési lehetőségek</p></div>
                  </div>

                  {/* Active subscriber — show portal button */}
                  {subscription.status === 'active' && subscription.has_stripe && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg glass-light">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-200 font-medium">Aktív előfizetés</p>
                          <p className="text-[10px] text-gray-500">Számlák, fizetési mód és lemondás kezelése a Stripe felületen</p>
                        </div>
                      </div>
                      <button onClick={handleStripePortal} disabled={portalLoading}
                        className="btn-primary w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                        {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        Előfizetés kezelése
                      </button>
                    </div>
                  )}

                  {/* Not active — show available plans */}
                  {subscription.status !== 'active' && (
                    <div className="space-y-4">
                      {stripeLoading ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-[#1AA19C] animate-spin" /></div>
                      ) : stripePrices.length > 0 ? (
                        <div className="space-y-3">
                          {stripePrices.map(price => (
                            <div key={price.id} className="flex items-center justify-between px-4 py-4 rounded-xl glass-light">
                              <div>
                                <p className="text-sm font-medium text-gray-200">{price.product_name}</p>
                                <p className="text-xs text-gray-500">
                                  {(price.unit_amount / 100).toLocaleString('hu-HU')} {price.currency.toUpperCase()} / {price.interval === 'month' ? 'hó' : price.interval === 'year' ? 'év' : price.interval}
                                </p>
                              </div>
                              <button onClick={() => handleStripeCheckout(price.id)} disabled={checkoutLoading}
                                className="btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                Előfizetés
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl glass-light p-6 text-center">
                          <CreditCard className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                          <p className="text-sm text-gray-300 font-medium">Nincs elérhető csomag</p>
                          <p className="text-xs text-gray-500 mt-1">Kérjük, vedd fel a kapcsolatot az adminisztrátorral.</p>
                        </div>
                      )}
                      {subscription.has_stripe && (
                        <button onClick={handleStripePortal} disabled={portalLoading}
                          className="w-full py-2.5 rounded-xl text-gray-400 hover:text-gray-200 text-sm font-medium flex items-center justify-center gap-2 transition-colors glass-light">
                          {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                          Korábbi számlák megtekintése
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ═══ MENTÉS FÜL ═══ */}
      {activeTab === 'backup' && (
        <div className="space-y-6 max-w-2xl fade-in">
          {/* Export */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center"><Download className="w-5 h-5 text-[#1AA19C]" /></div>
              <div>
                <h3 className="text-base font-semibold text-white">Mentés exportálása</h3>
                <p className="text-xs text-gray-500">
                  {isAdmin
                    ? 'Teljes mentés: összes felhasználó, kapcsolatok, árajánlatok, emailek, sablonok és beállítások'
                    : 'Saját fiók mentése: kapcsolatok, árajánlatok, emailek, sablonok és beállítások'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg glass-light">
                <Database className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{isAdmin ? 'Teljes rendszer mentés' : 'Fiók mentés'}</p>
                  <p className="text-[10px] text-gray-500">JSON formátum, minden adat benne van</p>
                </div>
                <button onClick={handleExportBackup} disabled={backupExporting}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                  {backupExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Letöltés
                </button>
              </div>
            </div>
          </div>

          {/* Import */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><UploadCloud className="w-5 h-5 text-amber-400" /></div>
              <div>
                <h3 className="text-base font-semibold text-white">Mentés visszaállítása</h3>
                <p className="text-xs text-gray-500">
                  {isAdmin
                    ? 'Teljes mentés importálása: felhasználók és adataik visszaállítása'
                    : 'Saját fiók visszaállítása egy korábbi mentésből'}
                </p>
              </div>
            </div>

            <div className="glass rounded-lg p-4 flex items-start gap-3 border border-amber-500/20 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-300 font-medium">Figyelem</p>
                <p className="text-xs text-gray-500 mt-0.5">Az importálás nem törli a meglévő adatokat, csak hozzáadja az újakat. Duplikált rekordok automatikusan kiszűrésre kerülnek.</p>
              </div>
            </div>

            <div className="space-y-3">
              <input type="file" ref={backupInputRef} onChange={handleImportBackup} accept=".json" className="hidden" />
              <button onClick={() => backupInputRef.current?.click()} disabled={backupImporting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-light hover:border-amber-500/20 border border-white/5 text-sm text-gray-300 transition-all disabled:opacity-50 w-full justify-center">
                {backupImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {backupImporting ? 'Importálás...' : 'JSON fájl kiválasztása'}
              </button>
            </div>

            {importResult && (
              <div className="mt-4 space-y-2 fade-in">
                <p className="text-xs text-green-400 font-medium">Importálás eredménye:</p>
                {importResult.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg glass-light">
                    <FileJson className="w-4 h-4 text-[#1AA19C]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 font-medium">{r.user === 'current' ? 'Saját fiók' : r.user}</p>
                      <p className="text-[10px] text-gray-500">
                        {r.contacts} kapcsolat · {r.emails} email · {r.templates} sablon · {r.quotes} árajánlat · {r.settings} beállítás
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cleanup */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <div>
                <h3 className="text-base font-semibold text-white">Adatbázis tisztítás</h3>
                <p className="text-xs text-gray-500">Árva rekordok eltávolítása törölt kapcsolatokból</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Ha egy kapcsolatot töröltél, de az email előzmények vagy csatolmányok töredékei megmaradtak az adatbázisban, 
              ez a funkció eltávolítja azokat. Ezután újra hozzáadhatod ugyanazt az email címet.
            </p>
            <button
              onClick={async () => {
                if (!confirm('Biztosan futtatod az adatbázis tisztítást? Az árva rekordok véglegesen törlődnek.')) return
                setCleaning(true)
                setCleanupResult(null)
                try {
                  const result = await cleanupDatabase()
                  setCleanupResult(result)
                  if (result.totalCleaned > 0) {
                    toast.success(`Tisztítás kész! ${result.totalCleaned} árva rekord eltávolítva.`)
                  } else {
                    toast.success('Az adatbázis tiszta, nincs árva rekord.')
                  }
                } catch (err) { toast.error(err.message) }
                finally { setCleaning(false) }
              }}
              disabled={cleaning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-sm text-red-400 font-medium transition-all disabled:opacity-50 w-full justify-center"
            >
              {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {cleaning ? 'Tisztítás...' : 'Adatbázis tisztítás futtatása'}
            </button>

            {cleanupResult && (
              <div className="mt-4 space-y-2 fade-in">
                <p className="text-xs text-green-400 font-medium">Tisztítás eredménye:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 rounded-lg glass-light">
                    <p className="text-[10px] text-gray-500">Árva email napló</p>
                    <p className="text-sm text-gray-200 font-medium">{cleanupResult.stats.orphaned_email_log}</p>
                  </div>
                  <div className="px-3 py-2 rounded-lg glass-light">
                    <p className="text-[10px] text-gray-500">Árva csatolmányok</p>
                    <p className="text-sm text-gray-200 font-medium">{cleanupResult.stats.orphaned_attachments}</p>
                  </div>
                  <div className="px-3 py-2 rounded-lg glass-light">
                    <p className="text-[10px] text-gray-500">Árva bejövő levelek</p>
                    <p className="text-sm text-gray-200 font-medium">{cleanupResult.stats.orphaned_inbox}</p>
                  </div>
                  <div className="px-3 py-2 rounded-lg glass-light">
                    <p className="text-[10px] text-gray-500">Árva kimenő levelek</p>
                    <p className="text-sm text-gray-200 font-medium">{cleanupResult.stats.orphaned_sent_imap}</p>
                  </div>
                  <div className="px-3 py-2 rounded-lg glass-light">
                    <p className="text-[10px] text-gray-500">Törölt fájlok</p>
                    <p className="text-sm text-gray-200 font-medium">{cleanupResult.stats.files_deleted}</p>
                  </div>
                  <div className="px-3 py-2 rounded-lg glass-light">
                    <p className="text-[10px] text-gray-500">Összesen tisztítva</p>
                    <p className="text-sm text-gray-200 font-bold">{cleanupResult.totalCleaned}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ HALADÓ FÜL (API Kulcsok + Dokumentáció) ═══ */}
      {activeTab === 'expert' && (
        <div className="space-y-6 max-w-2xl fade-in">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Key className="w-5 h-5 text-amber-400" /></div>
              <div><h3 className="text-base font-semibold text-white">API Kulcsok</h3><p className="text-xs text-gray-500">Kulcsok kezelése külső alkalmazásokhoz (Laravel, Rust, stb.)</p></div>
            </div>

            {/* Új kulcs létrehozása */}
            <div className="flex items-center gap-2 mb-4">
              <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Kulcs neve (pl. Laravel Webshop, Rust Backend)" className="input-field flex-1 px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()} />
              <button onClick={handleCreateKey} disabled={creatingKey}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1AA19C] hover:bg-[#2EC4BE] text-white text-sm font-medium transition-all disabled:opacity-50 shrink-0">
                {creatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Generálás
              </button>
            </div>

            {/* Frissen generált kulcs figyelmeztetés */}
            {newlyCreatedKey && (
              <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 fade-in">
                <p className="text-xs text-amber-400 font-medium mb-2">⚠ Másold ki most ezt a kulcsot — többet nem fog teljes egészében megjelenni!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-white font-mono bg-black/30 px-3 py-2 rounded-lg break-all">{newlyCreatedKey}</code>
                  <button onClick={() => copyToClipboard(newlyCreatedKey, 'new')}
                    className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-all shrink-0">
                    {copiedKey === 'new' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Kulcs lista */}
            {apiKeys.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Még nincs API kulcs. Generálj egyet fent.</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map(k => (
                  <div key={k.id} className="flex items-center gap-3 px-4 py-3 rounded-lg glass-light">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-200">{k.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${k.active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                          {k.active ? 'Aktív' : 'Letiltva'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-gray-400 font-mono">
                          {visibleKeys[k.id] ? k.key : maskKey(k.key)}
                        </code>
                        <button onClick={() => setVisibleKeys(v => ({ ...v, [k.id]: !v[k.id] }))}
                          className="text-gray-500 hover:text-gray-300"><Eye className="w-3 h-3" /></button>
                        <button onClick={() => copyToClipboard(k.key, k.id)}
                          className="text-gray-500 hover:text-[#2EC4BE]">
                          {copiedKey === k.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">
                        Létrehozva: {new Date(k.created_at + 'Z').toLocaleDateString('hu-HU')}
                        {k.last_used_at && <> · Utoljára használva: {new Date(k.last_used_at + 'Z').toLocaleDateString('hu-HU')}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleToggleKey(k.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${k.active ? 'text-amber-400 hover:bg-amber-500/10' : 'text-green-400 hover:bg-green-500/10'}`}>
                        {k.active ? 'Letiltás' : 'Engedélyezés'}
                      </button>
                      <button onClick={() => handleDeleteKey(k.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* API Dokumentáció — same tab */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-[#1AA19C]" />
              <h3 className="text-base font-semibold text-white">API Dokumentáció</h3>
            </div>
            <div className="flex bg-white/5 rounded-lg p-0.5">
              <button onClick={() => setDocLang('hu')} className={`px-2 py-1 rounded text-xs font-medium transition-all ${docLang === 'hu' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>HU</button>
              <button onClick={() => setDocLang('en')} className={`px-2 py-1 rounded text-xs font-medium transition-all ${docLang === 'en' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>EN</button>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                method: 'POST', path: '/api/v1/email/send',
                desc: docLang === 'hu' ? 'Email küldése' : 'Send an email',
                body: `{
  "to": "user@example.com",
  "subject": "Hello",
  "html": "<p>Message...</p>",
  "template_id": "OPTIONAL_TEMPLATE_ID",
  "variables": { "name": "John" }
}`
              },
              {
                method: 'POST', path: '/api/v1/contact',
                desc: docLang === 'hu' ? 'Kapcsolat létrehozása/frissítése' : 'Create or update contact',
                body: `{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+36301234567"
}`
              }
            ].map(ep => (
              <div key={ep.path} className={isModern ? 'modern-card p-5' : 'glass rounded-xl p-5'}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-1 rounded bg-[#1AA19C]/20 text-[#2EC4BE] text-xs font-bold">{ep.method}</span>
                  <code className="text-sm text-gray-300 font-mono">{ep.path}</code>
                </div>
                <p className="text-sm text-gray-400 mb-3">{ep.desc}</p>
                <div className="relative group">
                  <pre className={`text-xs font-mono text-gray-400 p-3 rounded-lg overflow-x-auto ${isModern ? 'bg-black/30' : 'bg-black/30'}`}>
                    {ep.body}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(ep.body, ep.path)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {copiedKey === ep.path ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={isModern ? 'modern-card p-5' : 'glass rounded-xl p-5'}>
            <h4 className="text-sm font-medium text-white mb-2">{docLang === 'hu' ? 'Hitelesítés' : 'Authentication'}</h4>
            <p className="text-xs text-gray-400 mb-3">
              {docLang === 'hu' 
                ? 'Minden kéréshez szükséges az X-API-Key fejléc.' 
                : 'All requests require the X-API-Key header.'}
            </p>
            <div className={`p-3 rounded-lg font-mono text-xs text-gray-300 ${isModern ? 'bg-black/30' : 'bg-black/30'}`}>
              Authorization: Bearer YOUR_API_KEY
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Na ezek itt a segéd komponensek a dokihoz, semmi extra


function CodeBlock({ code, label, onCopy, copiedKey }) {
  const id = code.slice(0, 30)
  return (
    <div className="relative group">
      {label && <p className="text-[10px] text-gray-500 mb-1">{label}</p>}
      <pre className="bg-black/40 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
      <button onClick={() => onCopy(code, id)}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 text-gray-500 hover:text-[#2EC4BE] opacity-0 group-hover:opacity-100 transition-all">
        {copiedKey === id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

function ApiSection({ title, desc, children }) {
  return (
    <div className="glass rounded-xl p-6">
      <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
      {desc && <p className="text-xs text-gray-500 mb-4">{desc}</p>}
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Endpoint({ method, path, desc, params, body, response, copyToClipboard, copiedKey, docLang }) {
  const methodColors = { GET: 'text-green-400 bg-green-500/10', POST: 'text-blue-400 bg-blue-500/10', PUT: 'text-amber-400 bg-amber-500/10', DELETE: 'text-red-400 bg-red-500/10' }
  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.02]">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${methodColors[method] || ''}`}>{method}</span>
        <code className="text-sm text-gray-200 font-mono">{path}</code>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs text-gray-400">{desc}</p>
        {params && <p className="text-[10px] text-gray-500">{docLang === 'en' ? 'Params' : 'Paraméterek'}: {params}</p>}
        {body && (
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Body:</p>
            <CodeBlock code={body} onCopy={copyToClipboard} copiedKey={copiedKey} />
          </div>
        )}
        {response && (
          <div>
            <p className="text-[10px] text-gray-500 mb-1">{docLang === 'en' ? 'Response' : 'Válasz'}:</p>
            <CodeBlock code={response} onCopy={copyToClipboard} copiedKey={copiedKey} />
          </div>
        )}
      </div>
    </div>
  )
}
