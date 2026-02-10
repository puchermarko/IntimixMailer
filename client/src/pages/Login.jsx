// Bejelentkezés oldal - ide érkezel ha nincs token
import { useState } from 'react'
import { useAuth, useBranding } from '../App'
import toast from 'react-hot-toast'
import { Mail, Lock, Loader2 } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const { app_name, app_subtitle, app_logo } = useBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      login(data.token, data.email)
      toast.success('Üdv, visszatértél!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Háttér díszítések */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/6 rounded-full blur-3xl" />
      </div>

      <div className="glass glow rounded-2xl p-8 w-full max-w-md fade-in relative z-10">
        {/* Logó */}
        <div className="text-center mb-8">
          <img
            src={app_logo}
            alt={app_name}
            className="h-12 mx-auto mb-4"
          />
          <p className="text-sm text-gray-400 mt-2">{app_name} — {app_subtitle}</p>
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
                placeholder="Add meg a jelszavad"
                className="input-field w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
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

        <p className="text-center text-xs text-gray-500 mt-6">
          Biztonságos email platform — {app_name}
        </p>
      </div>
    </div>
  )
}
