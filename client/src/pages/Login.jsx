// Bejelentkezés oldal - ide érkezel ha nincs token
import { useState } from 'react'
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

  const isModern = uiMode === 'modern' || globalModernUI

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      login(data.token, data.email, data.role, data.name, data.subscription_status, data.setup_completed)
      toast.success('Üdv, visszatértél!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-xl font-bold text-white">Bejelentkezés</h1>
          <p className="text-sm text-gray-400 mt-1">Lépj be a fiókodba</p>
        </div>

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
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Bejelentkezés...
              </>
            ) : (
              'Bejelentkezés'
            )}
          </button>
        </form>

        {registrationEnabled && (
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
