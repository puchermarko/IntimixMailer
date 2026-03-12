// Bejelentkezés oldal - ide érkezel ha nincs token
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUI } from '../App'
import toast from 'react-hot-toast'
import { Mail, Lock, Loader2, Send, ArrowLeft } from 'lucide-react'

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
    <div className={`min-h-screen flex items-center justify-center p-4 ${isModern ? 'bg-[#0f1115]' : ''}`}>
      {/* Háttér díszítések */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${isModern ? 'bg-[#1AA19C]/5' : 'bg-teal-600/8'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl ${isModern ? 'bg-[#2EC4BE]/5' : 'bg-teal-500/6'}`} />
      </div>

      <div className={`${isModern ? 'modern-card p-8' : 'glass glow rounded-2xl p-8'} w-full max-w-md fade-in relative z-10`}>
        {/* Generic header — no company branding */}
        <div className="text-center mb-8">
          <img src="/pultify-logo.png" alt="Pultify" className="h-12 object-contain mx-auto mb-5" />
          <h1 className="text-xl font-bold text-white">
            {mfaRequired ? 'Kétlépcsős hitelesítés' : 'Bejelentkezés'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {mfaRequired ? 'Írd be az emailben kapott kódot' : 'Lépj be a fiókodba'}
          </p>
        </div>

        {mfaRequired ? (
          /* MFA Code Entry */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Hitelesítő kód</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className={`input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm text-center tracking-[0.5em] font-mono text-lg ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`}
                  autoFocus
                  required
                />
              </div>
              {mfaCountdown > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Kód érvényes: <span className={`font-mono font-medium ${mfaCountdown <= 30 ? 'text-red-400' : 'text-[#2EC4BE]'}`}>{formatCountdown(mfaCountdown)}</span>
                </p>
              )}
              {mfaCountdown === 0 && (
                <p className="text-xs text-red-400 mt-2 text-center">A kód lejárt. Kérj újat.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || mfaToken.length !== 6}
              className={`btn-primary w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Ellenőrzés...</>
              ) : (
                'Kód megerősítése'
              )}
            </button>

            <div className="flex items-center justify-between">
              <button type="button" onClick={handleBackToLogin} className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Vissza
              </button>
              <button
                type="button"
                onClick={handleResendMfa}
                disabled={loading}
                className="text-sm text-[#2EC4BE] hover:text-white transition-colors"
              >
                Új kód küldése
              </button>
            </div>
          </form>
        ) : (
          /* Normal Login */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email cím</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="address@email.com"
                  className={`input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Jelszó</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Add meg a jelszavad"
                  className={`input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`btn-primary w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Bejelentkezés...</>
              ) : (
                'Bejelentkezés'
              )}
            </button>
          </form>
        )}

        {!mfaRequired && registrationEnabled && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Nincs még fiókod?{' '}
            <button onClick={() => navigate('/register')} className="text-[#2EC4BE] hover:text-white transition-colors font-medium">
              Regisztráció
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
