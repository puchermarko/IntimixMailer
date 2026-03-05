import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUI } from '../App'
import toast from 'react-hot-toast'
import { Mail, Lock, Loader2, Send, ArrowLeft, User, ShieldCheck, Clock } from 'lucide-react'

const ANTI_BOT_SECONDS = 5

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { uiMode, globalModernUI } = useUI()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(ANTI_BOT_SECONDS)
  const formLoadedAt = useRef(Date.now())

  const isModern = uiMode === 'modern' || globalModernUI

  useEffect(() => {
    formLoadedAt.current = Date.now()
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (countdown > 0) return toast.error('Kérjük, várj még néhány másodpercet.')
    if (password !== passwordConfirm) return toast.error('A jelszavak nem egyeznek.')
    if (password.length < 6) return toast.error('A jelszónak legalább 6 karakter hosszúnak kell lennie.')

    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, formLoadedAt: formLoadedAt.current })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Regisztráció sikertelen')
      login(data.token, data.email, data.role, data.name, data.subscription_status, data.setup_completed)
      toast.success('Sikeres regisztráció! Üdvözlünk!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = countdown === 0

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Háttér díszítések */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/6 rounded-full blur-3xl" />
      </div>

      <div className="glass glow rounded-2xl p-8 w-full max-w-md fade-in relative z-10">
        <div className="text-center mb-8">
          <img src="/pultify-logo.png" alt="Pultify" className="h-12 object-contain mx-auto mb-5" />
          <h1 className="text-xl font-bold text-white">Regisztráció</h1>
          <p className="text-sm text-gray-400 mt-1">Hozd létre a fiókodat</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Név</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Teljes neved"
                className="input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email cím</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="address@email.com"
                className="input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm"
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
                placeholder="Legalább 6 karakter"
                className="input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Jelszó megerősítése</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Jelszó újra"
                className="input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Anti-bot timer indicator */}
          {!canSubmit && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#1AA19C]/5 border border-[#1AA19C]/10">
              <Clock className="w-4 h-4 text-[#2EC4BE] animate-pulse" />
              <span className="text-xs text-gray-400">
                Biztonsági ellenőrzés... <span className="text-[#2EC4BE] font-semibold">{countdown} mp</span>
              </span>
            </div>
          )}

          {canSubmit && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#1AA19C]/8 border border-[#1AA19C]/15">
              <ShieldCheck className="w-4 h-4 text-[#2EC4BE]" />
              <span className="text-xs text-[#2EC4BE] font-medium">Ellenőrzés sikeres</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="btn-primary w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regisztráció...
              </>
            ) : !canSubmit ? (
              <>
                <Clock className="w-4 h-4" />
                Várakozás...
              </>
            ) : (
              'Fiók Létrehozása'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Már van fiókod?{' '}
          <button onClick={() => navigate('/login')} className="text-[#2EC4BE] hover:text-white transition-colors font-medium">
            Bejelentkezés
          </button>
        </p>

        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2EC4BE] transition-colors mx-auto mt-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Vissza a főoldalra
        </button>
      </div>
    </div>
  )
}
