// Bejelentkezés oldal - ide érkezel ha nincs token
import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUI } from '../App'
import toast from 'react-hot-toast'
import { Mail, Lock, Loader2, ArrowLeft, Shield, ArrowRight } from 'lucide-react'

function FloatingCodeLines() {
  const lines = useMemo(() => [
    'const mailer = new Pultify()',
    'await mailer.send({ to, subject })',
    'import { CRM } from "pultify"',
    'mailer.contacts.sync()',
    'const pdf = quote.generate()',
    'smtp.verify() // ✓ connected',
    'imap.fetch({ folder: "INBOX" })',
    'template.render(variables)',
  ], [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {lines.map((line, i) => (
        <div
          key={i}
          className="absolute text-[10px] sm:text-xs font-mono whitespace-nowrap"
          style={{
            left: `${5 + (i % 4) * 25}%`,
            top: `${10 + i * 11}%`,
            color: 'rgba(46, 196, 190, 0.07)',
            animation: `codeRain ${18 + i * 3}s linear ${i * 2}s infinite`,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  )
}

export default function Login({ registrationEnabled = true }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { uiMode, globalModernUI } = useUI()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaToken, setMfaToken] = useState('')
  const [mfaCountdown, setMfaCountdown] = useState(0)
  const cardRef = useRef(null)

  const isModern = uiMode === 'modern' || globalModernUI

  // MFA countdown timer
  useEffect(() => {
    if (mfaCountdown <= 0) return
    const timer = setInterval(() => {
      setMfaCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [mfaCountdown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const body = { email, password }
      if (mfaRequired && mfaToken) body.mfa_token = mfaToken

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.mfa_invalid) {
          setMfaToken('')
          throw new Error(data.error || 'Érvénytelen MFA kód')
        }
        throw new Error(data.error || 'Login failed')
      }

      // MFA step 1: server says MFA required, code sent
      if (data.mfa_required) {
        setMfaRequired(true)
        setMfaToken('')
        setMfaCountdown(180) // 3 minutes
        toast.success(data.message || 'MFA kód elküldve!')
        return
      }

      // Success
      login(data.token, data.email, data.role, data.name, data.subscription_status, data.setup_completed, data.enhanced_mail_enabled)
      toast.success('Üdv, visszatértél!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendMfa = async () => {
    setMfaToken('')
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Hiba történt')
      if (data.mfa_required) {
        setMfaCountdown(180)
        toast.success('Új kód elküldve!')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setMfaRequired(false)
    setMfaToken('')
    setMfaCountdown(0)
  }

  const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0c10] relative overflow-hidden">
      {/* Grid background with radial fade */}
      <div className="fixed inset-0 grid-bg radial-mask pointer-events-none" />

      {/* Animated glow orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px] bg-[#1AA19C]/8 breathe" />
        <div className="absolute bottom-1/4 right-1/5 w-[400px] h-[400px] rounded-full blur-[140px] bg-[#2EC4BE]/6 breathe-slow breathe-delay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px] bg-[#1AA19C]/4 breathe-slow" />
      </div>

      {/* Floating code lines decoration */}
      <FloatingCodeLines />

      {/* Top gradient line */}
      <div className="fixed top-0 left-0 right-0 h-px glow-line z-20" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo above card */}
        <div className="text-center mb-8 stagger-enter">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/pultify-logo.png" alt="Pultify" className="h-10 object-contain" />
          </div>
          <p className="text-xs text-gray-500 font-mono tracking-wider uppercase">
            {mfaRequired ? 'Verification Required' : 'Secure Authentication'}
          </p>
        </div>

        {/* Main card */}
        <div ref={cardRef} className="gradient-border rounded-2xl p-8 backdrop-blur-xl stagger-enter">
          {/* Card header */}
          <div className="mb-7">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              {mfaRequired ? 'Kétlépcsős hitelesítés' : 'Bejelentkezés'}
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              {mfaRequired ? 'Írd be az emailben kapott 6 jegyű kódot' : 'Lépj be a Pultify fiókodba'}
            </p>
            {/* Gradient divider */}
            <div className="h-px bg-gradient-to-r from-[#1AA19C]/30 via-[#2EC4BE]/10 to-transparent mt-5" />
          </div>

          {mfaRequired ? (
            /* MFA Code Entry */
            <form onSubmit={handleSubmit} className="space-y-5 stagger-enter">
              {/* MFA info badge */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#1AA19C]/5 border border-[#1AA19C]/10">
                <Shield className="w-4 h-4 text-[#2EC4BE] shrink-0" />
                <p className="text-xs text-gray-400">Kód elküldve: <span className="text-gray-300 font-medium">{email}</span></p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Hitelesítő kód</label>
                <div className="relative group">
                  <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-[#1AA19C]/20 to-[#2EC4BE]/20 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="input-field w-full px-4 py-3.5 rounded-xl text-sm text-center tracking-[0.5em] font-mono text-lg bg-white/[0.03] border-white/[0.06] focus:bg-white/[0.05] relative"
                    autoFocus
                    required
                  />
                </div>
                {mfaCountdown > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="h-1 flex-1 max-w-[120px] rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#1AA19C] to-[#2EC4BE] transition-all duration-1000"
                        style={{ width: `${(mfaCountdown / 180) * 100}%` }} />
                    </div>
                    <span className={`text-xs font-mono font-medium ${mfaCountdown <= 30 ? 'text-red-400' : 'text-[#2EC4BE]'}`}>
                      {formatCountdown(mfaCountdown)}
                    </span>
                  </div>
                )}
                {mfaCountdown === 0 && (
                  <p className="text-xs text-red-400 mt-3 text-center flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    A kód lejárt. Kérj újat.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || mfaToken.length !== 6}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 bg-gradient-to-r from-[#1AA19C] to-[#1AA19C] hover:from-[#1AA19C] hover:to-[#2EC4BE] transition-all duration-300 shadow-lg shadow-[#1AA19C]/20 hover:shadow-[#1AA19C]/30"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Ellenőrzés...</>
                ) : (
                  <>Kód megerősítése <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={handleBackToLogin} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Vissza
                </button>
                <button
                  type="button"
                  onClick={handleResendMfa}
                  disabled={loading}
                  className="text-xs text-[#2EC4BE]/70 hover:text-[#2EC4BE] transition-colors disabled:opacity-50"
                >
                  Új kód küldése
                </button>
              </div>
            </form>
          ) : (
            /* Normal Login */
            <form onSubmit={handleSubmit} className="space-y-5 stagger-enter">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Email cím</label>
                <div className="relative group">
                  <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-[#1AA19C]/20 to-[#2EC4BE]/20 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-[#2EC4BE] transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="address@email.com"
                    className="input-field w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-white/[0.03] border-white/[0.06] focus:bg-white/[0.05] relative"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Jelszó</label>
                <div className="relative group">
                  <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-[#1AA19C]/20 to-[#2EC4BE]/20 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-[#2EC4BE] transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Add meg a jelszavad"
                    className="input-field w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-white/[0.03] border-white/[0.06] focus:bg-white/[0.05] relative"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 bg-gradient-to-r from-[#1AA19C] to-[#1AA19C] hover:from-[#1AA19C] hover:to-[#2EC4BE] transition-all duration-300 shadow-lg shadow-[#1AA19C]/20 hover:shadow-[#1AA19C]/30"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Bejelentkezés...</>
                ) : (
                  <>Bejelentkezés <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}

          {!mfaRequired && registrationEnabled && (
            <div className="mt-6 pt-5 border-t border-white/[0.04]">
              <p className="text-center text-sm text-gray-500">
                Nincs még fiókod?{' '}
                <button onClick={() => navigate('/register')} className="text-[#2EC4BE] hover:text-[#2EC4BE]/80 transition-colors font-medium">
                  Regisztráció
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer text */}
        <p className="text-center text-[10px] text-gray-600 mt-6 font-mono">
          Titkosított kapcsolat · TLS/SSL · pultify.hu
        </p>
      </div>
    </div>
  )
}
