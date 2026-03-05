import { useState, useRef } from 'react'
import { useAuth, useUI } from '../App'
import {
  Server, Building2, Upload, RefreshCw, Check, ChevronRight, ChevronLeft,
  Loader2, Send, X, Mail, Lock, Globe, Phone, Hash, MapPin, Image,
  Inbox, SendHorizontal, SkipForward, Sparkles, ShieldCheck
} from 'lucide-react'
import { updateEnvConfig, updateBranding, uploadLogo, syncInbox, syncSent, testSmtp } from '../lib/api'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 'smtp', title: 'Email Beállítások', subtitle: 'SMTP és IMAP konfiguráció', icon: Server },
  { id: 'company', title: 'Cég Adatok', subtitle: 'Céges információk megadása', icon: Building2 },
  { id: 'logo', title: 'Logó Feltöltés', subtitle: 'Céges logó feltöltése', icon: Image },
  { id: 'sync', title: 'Email Szinkronizálás', subtitle: 'Levelek letöltése', icon: RefreshCw },
]

export default function SetupWizard({ onComplete }) {
  const { setSetupCompleted } = useAuth()
  const { uiMode } = useUI()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const isModern = uiMode === 'modern'

  // Step 1: SMTP/IMAP
  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from_name: '', imap_host: '', imap_port: '993', imap_user: '', imap_pass: '' })
  const [smtpTested, setSmtpTested] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)

  // Step 2: Company
  const [company, setCompany] = useState({ company_name: '', company_vat: '', company_email: '', company_phone: '', company_street: '', company_city: '', company_zip: '', company_country: 'Magyarország' })

  // Step 3: Logo
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUploaded, setLogoUploaded] = useState(false)
  const logoInputRef = useRef(null)

  // Step 4: Sync
  const [inboxSyncing, setInboxSyncing] = useState(false)
  const [sentSyncing, setSentSyncing] = useState(false)
  const [inboxResult, setInboxResult] = useState(null)
  const [sentResult, setSentResult] = useState(null)

  const handleSmtpChange = (key, val) => setSmtp(prev => ({ ...prev, [key]: val }))
  const handleCompanyChange = (key, val) => setCompany(prev => ({ ...prev, [key]: val }))

  const handleTestSmtp = async () => {
    setSmtpTesting(true)
    try {
      await updateEnvConfig(smtp)
      await testSmtp()
      setSmtpTested(true)
      toast.success('SMTP kapcsolat sikeres!')
    } catch (err) {
      toast.error('SMTP hiba: ' + err.message)
      setSmtpTested(false)
    } finally {
      setSmtpTesting(false)
    }
  }

  const saveSmtp = async () => {
    setSaving(true)
    try {
      await updateEnvConfig(smtp)
      toast.success('Email beállítások mentve!')
      setStep(1)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const saveCompany = async () => {
    setSaving(true)
    try {
      await updateBranding(company)
      toast.success('Cég adatok mentve!')
      setStep(2)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setLogoUploaded(false)
  }

  const handleLogoUpload = async () => {
    if (!logoFile) return
    setSaving(true)
    try {
      await uploadLogo(logoFile)
      setLogoUploaded(true)
      toast.success('Logó feltöltve!')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleSyncInbox = async () => {
    setInboxSyncing(true)
    try {
      const result = await syncInbox()
      setInboxResult(result)
      toast.success(`${result.newEmails || 0} bejövő levél szinkronizálva!`)
    } catch (err) { toast.error('Bejövő szinkronizálás hiba: ' + err.message) }
    finally { setInboxSyncing(false) }
  }

  const handleSyncSent = async () => {
    setSentSyncing(true)
    try {
      const result = await syncSent()
      setSentResult(result)
      toast.success(`${result.newEmails || 0} kimenő levél szinkronizálva!`)
    } catch (err) { toast.error('Kimenő szinkronizálás hiba: ' + err.message) }
    finally { setSentSyncing(false) }
  }

  const finishSetup = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('intimix_token')
      await fetch('/api/setup-complete', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      setSetupCompleted(true)
      localStorage.setItem('intimix_setup_completed', 'true')
      toast.success('Beállítás kész! Üdvözlünk a Pultifyban!')
      onComplete()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const skipSetup = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('intimix_token')
      await fetch('/api/setup-complete', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      setSetupCompleted(true)
      localStorage.setItem('intimix_setup_completed', 'true')
      onComplete()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const currentStep = STEPS[step]

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isModern ? 'bg-[#0f1115]' : ''}`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${isModern ? 'bg-[#1AA19C]/5' : 'bg-teal-600/8'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl ${isModern ? 'bg-[#2EC4BE]/5' : 'bg-teal-500/6'}`} />
      </div>

      <div className="w-full max-w-2xl relative z-10 fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/pultify-logo.png" alt="Pultify" className="h-12 object-contain mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-white">Üdvözlünk! Állítsd be a fiókodat</h1>
          <p className="text-sm text-gray-400 mt-1">Néhány lépés és máris használhatod a rendszert</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = i < step
            const active = i === step
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  done 
                    ? (isModern ? 'bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] text-white shadow-lg' : 'bg-[#1AA19C] text-white')
                    : active 
                      ? (isModern ? 'bg-[#2EC4BE]/20 text-[#2EC4BE] ring-2 ring-[#2EC4BE]/40' : 'bg-[#1AA19C]/20 text-[#2EC4BE] ring-2 ring-[#1AA19C]/40')
                      : (isModern ? 'bg-white/5 text-gray-600' : 'bg-white/5 text-gray-600')
                }`}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-12 h-0.5 rounded-full transition-all ${i < step ? (isModern ? 'bg-[#2EC4BE]' : 'bg-[#1AA19C]') : 'bg-white/10'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className={isModern ? 'modern-card p-6 sm:p-8' : 'glass glow rounded-2xl p-6 sm:p-8'}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
              <currentStep.icon className="w-5 h-5 text-[#2EC4BE]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{currentStep.title}</h2>
              <p className="text-xs text-gray-500">{currentStep.subtitle}</p>
            </div>
          </div>

          {/* ═══ STEP 1: SMTP/IMAP ═══ */}
          {step === 0 && (
            <div className="space-y-4">
              <div className={isModern ? 'modern-card p-4 bg-white/5 border-none' : 'glass-light rounded-xl p-4'}>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <SendHorizontal className="w-4 h-4 text-[#2EC4BE]" /> SMTP (Kimenő levelek)
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Szerver</label>
                    <input value={smtp.smtp_host} onChange={e => handleSmtpChange('smtp_host', e.target.value)}
                      placeholder="smtp.example.com" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Port</label>
                    <input value={smtp.smtp_port} onChange={e => handleSmtpChange('smtp_port', e.target.value)}
                      placeholder="587" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Felhasználónév</label>
                    <input value={smtp.smtp_user} onChange={e => handleSmtpChange('smtp_user', e.target.value)}
                      placeholder="user@example.com" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Jelszó</label>
                    <input type="password" value={smtp.smtp_pass} onChange={e => handleSmtpChange('smtp_pass', e.target.value)}
                      placeholder="••••••••" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Feladó neve</label>
                    <input value={smtp.smtp_from_name} onChange={e => handleSmtpChange('smtp_from_name', e.target.value)}
                      placeholder="Cégnév vagy neved" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>
              </div>

              <div className={isModern ? 'modern-card p-4 bg-white/5 border-none' : 'glass-light rounded-xl p-4'}>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-[#2EC4BE]" /> IMAP (Bejövő levelek)
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Szerver</label>
                    <input value={smtp.imap_host} onChange={e => handleSmtpChange('imap_host', e.target.value)}
                      placeholder="imap.example.com" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Port</label>
                    <input value={smtp.imap_port} onChange={e => handleSmtpChange('imap_port', e.target.value)}
                      placeholder="993" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Felhasználónév</label>
                    <input value={smtp.imap_user} onChange={e => handleSmtpChange('imap_user', e.target.value)}
                      placeholder="user@example.com" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Jelszó</label>
                    <input type="password" value={smtp.imap_pass} onChange={e => handleSmtpChange('imap_pass', e.target.value)}
                      placeholder="••••••••" className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>
              </div>

              {smtp.smtp_host && smtp.smtp_user && smtp.smtp_pass && (
                <button onClick={handleTestSmtp} disabled={smtpTesting}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium text-gray-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isModern ? 'bg-white/5 hover:bg-white/10 border border-white/5' : 'glass hover:border-[#1AA19C]/30'}`}>
                  {smtpTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : smtpTested ? <ShieldCheck className="w-4 h-4 text-green-400" /> : <Server className="w-4 h-4" />}
                  {smtpTesting ? 'Tesztelés...' : smtpTested ? 'SMTP Kapcsolat OK' : 'SMTP Kapcsolat Tesztelése'}
                </button>
              )}
            </div>
          )}

          {/* ═══ STEP 2: COMPANY ═══ */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Cégnév</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={company.company_name} onChange={e => handleCompanyChange('company_name', e.target.value)}
                      placeholder="Céged neve" className={`input-field w-full pl-10 pr-3 py-2.5 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Adószám</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={company.company_vat} onChange={e => handleCompanyChange('company_vat', e.target.value)}
                      placeholder="12345678-1-23" className={`input-field w-full pl-10 pr-3 py-2.5 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={company.company_email} onChange={e => handleCompanyChange('company_email', e.target.value)}
                      placeholder="info@ceged.hu" className={`input-field w-full pl-10 pr-3 py-2.5 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={company.company_phone} onChange={e => handleCompanyChange('company_phone', e.target.value)}
                      placeholder="+36 1 234 5678" className={`input-field w-full pl-10 pr-3 py-2.5 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Utca, házszám</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={company.company_street} onChange={e => handleCompanyChange('company_street', e.target.value)}
                      placeholder="Fő utca 1." className={`input-field w-full pl-10 pr-3 py-2.5 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Város</label>
                  <input value={company.company_city} onChange={e => handleCompanyChange('company_city', e.target.value)}
                    placeholder="Budapest" className={`input-field w-full px-3 py-2.5 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Irányítószám</label>
                  <input value={company.company_zip} onChange={e => handleCompanyChange('company_zip', e.target.value)}
                    placeholder="1000" className={`input-field w-full px-3 py-2.5 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ország</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={company.company_country} onChange={e => handleCompanyChange('company_country', e.target.value)}
                      placeholder="Magyarország" className={`input-field w-full pl-10 pr-3 py-2.5 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: LOGO ═══ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className={isModern ? 'modern-card p-8 bg-white/5 border-none text-center' : 'glass-light rounded-xl p-8 text-center'}>
                {logoPreview ? (
                  <div className="space-y-4">
                    <img src={logoPreview} alt="Logo preview" className="max-h-32 mx-auto rounded-lg" />
                    <p className="text-sm text-gray-400">{logoFile?.name}</p>
                    {!logoUploaded ? (
                      <button onClick={handleLogoUpload} disabled={saving}
                        className={`btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 mx-auto disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {saving ? 'Feltöltés...' : 'Logó Feltöltése'}
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-medium">
                        <Check className="w-4 h-4" /> Logó sikeresen feltöltve!
                      </div>
                    )}
                    <button onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoUploaded(false) }}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      Másik kép választása
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                      <Image className="w-8 h-8 text-[#2EC4BE]" />
                    </div>
                    <p className="text-gray-300 font-medium mb-1">Töltsd fel a céges logódat</p>
                    <p className="text-xs text-gray-500 mb-4">PNG, JPG, SVG vagy WebP formátum</p>
                    <button onClick={() => logoInputRef.current?.click()}
                      className={`btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 mx-auto ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                      <Upload className="w-4 h-4" /> Kép Kiválasztása
                    </button>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ STEP 4: SYNC ═══ */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-2">
                Szinkronizáld a meglévő leveleidet, hogy azonnal lásd az előzményeket.
                Ez az SMTP/IMAP beállításoktól függ — ha még nem adtad meg, kihagyhatod ezt a lépést.
              </p>

              <div className={isModern ? 'modern-card p-5 bg-white/5 border-none flex items-center justify-between' : 'glass-light rounded-xl p-5 flex items-center justify-between'}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                    <Inbox className="w-5 h-5 text-[#2EC4BE]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Bejövő levelek</div>
                    <div className="text-xs text-gray-500">
                      {inboxResult ? `${inboxResult.newEmails || 0} levél szinkronizálva` : 'IMAP bejövő mappa'}
                    </div>
                  </div>
                </div>
                <button onClick={handleSyncInbox} disabled={inboxSyncing}
                  className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 ${
                    inboxResult 
                      ? 'bg-green-500/10 text-green-400' 
                      : (isModern ? 'btn-primary text-white shadow-lg shadow-[#2EC4BE]/20' : 'btn-primary text-white')
                  }`}>
                  {inboxSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : inboxResult ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  {inboxSyncing ? 'Szinkronizálás...' : inboxResult ? 'Kész' : 'Szinkronizálás'}
                </button>
              </div>

              <div className={isModern ? 'modern-card p-5 bg-white/5 border-none flex items-center justify-between' : 'glass-light rounded-xl p-5 flex items-center justify-between'}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/10'}`}>
                    <SendHorizontal className="w-5 h-5 text-[#2EC4BE]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Kimenő levelek</div>
                    <div className="text-xs text-gray-500">
                      {sentResult ? `${sentResult.newEmails || 0} levél szinkronizálva` : 'IMAP kimenő mappa'}
                    </div>
                  </div>
                </div>
                <button onClick={handleSyncSent} disabled={sentSyncing}
                  className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 ${
                    sentResult 
                      ? 'bg-green-500/10 text-green-400' 
                      : (isModern ? 'btn-primary text-white shadow-lg shadow-[#2EC4BE]/20' : 'btn-primary text-white')
                  }`}>
                  {sentSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : sentResult ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  {sentSyncing ? 'Szinkronizálás...' : sentResult ? 'Kész' : 'Szinkronizálás'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <div>
              {step > 0 ? (
                <button onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Vissza
                </button>
              ) : (
                <button onClick={skipSetup} disabled={saving}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50">
                  <SkipForward className="w-4 h-4" /> Kihagyás
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < STEPS.length - 1 && (
                <button onClick={skipSetup} disabled={saving}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-50">
                  Összes kihagyása
                </button>
              )}

              {step === 0 && (
                <button onClick={saveSmtp} disabled={saving}
                  className={`btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  {smtp.smtp_host ? 'Mentés & Tovább' : 'Kihagyás'}
                </button>
              )}

              {step === 1 && (
                <button onClick={saveCompany} disabled={saving}
                  className={`btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  {company.company_name ? 'Mentés & Tovább' : 'Kihagyás'}
                </button>
              )}

              {step === 2 && (
                <button onClick={() => setStep(3)} disabled={saving}
                  className={`btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                  <ChevronRight className="w-4 h-4" />
                  {logoUploaded ? 'Tovább' : 'Kihagyás'}
                </button>
              )}

              {step === 3 && (
                <button onClick={finishSetup} disabled={saving}
                  className={`btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Beállítás Befejezése
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-gray-600 mt-6">
          {step + 1} / {STEPS.length} lépés
        </p>
      </div>
    </div>
  )
}
