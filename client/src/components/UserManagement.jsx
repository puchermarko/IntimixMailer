import { useState, useEffect } from 'react'
import { useAuth, useUI } from '../App'
import { getUsers, createUser, updateUser, deleteUser, impersonateUser, updateUserSubscription } from '../lib/api'
import toast from 'react-hot-toast'
import { Users, Plus, Pencil, Trash2, Eye, X, UserCheck, UserX, Loader2, Play, Square, CreditCard, Clock, Ban } from 'lucide-react'

const subStatusLabel = {
  none: { text: 'Nincs', color: 'bg-gray-500/20 text-gray-400' },
  trial: { text: 'Próba', color: 'bg-blue-500/20 text-blue-400' },
  active: { text: 'Aktív', color: 'bg-green-500/20 text-green-400' },
  inactive: { text: 'Inaktív', color: 'bg-yellow-500/20 text-yellow-400' },
  expired: { text: 'Lejárt', color: 'bg-red-500/20 text-red-400' },
}

function trialDaysLeft(trialEnd) {
  if (!trialEnd) return null
  const end = new Date(trialEnd + 'Z')
  const now = new Date()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

export default function UserManagement() {
  const { startImpersonation } = useAuth()
  const { uiMode } = useUI()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [saving, setSaving] = useState(false)

  const isModern = uiMode === 'modern'

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setUsers(await getUsers())
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingUser) {
        const updates = { email: form.email, name: form.name }
        if (form.password) updates.password = form.password
        await updateUser(editingUser.id, updates)
        toast.success('Felhasználó frissítve')
      } else {
        await createUser(form)
        toast.success('Felhasználó létrehozva')
      }
      setShowForm(false)
      setEditingUser(null)
      setForm({ email: '', password: '', name: '' })
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setForm({ email: user.email, password: '', name: user.name })
    setShowForm(true)
  }

  const handleDelete = async (user) => {
    if (!confirm(`Biztosan törlöd "${user.name || user.email}" felhasználót és MINDEN adatát?`)) return
    try {
      await deleteUser(user.id)
      toast.success('Felhasználó törölve')
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleImpersonate = async (user) => {
    try {
      const data = await impersonateUser(user.id)
      startImpersonation(data.token, data.user)
      toast.success(`Belépés: ${user.name || user.email}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user.id, { active: user.active ? 0 : 1 })
      toast.success(user.active ? 'Felhasználó deaktiválva' : 'Felhasználó aktiválva')
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSubscription = async (user, action) => {
    try {
      await updateUserSubscription(user.id, action)
      const msgs = { activate: 'Előfizetés aktiválva', deactivate: 'Előfizetés deaktiválva', start_trial: 'Próbaidőszak elindítva (30 nap)', stop_trial: 'Próbaidőszak leállítva' }
      toast.success(msgs[action] || 'Frissítve')
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className={isModern ? 'max-w-[1600px] mx-auto fade-in' : ''}>
      <div className="flex items-center justify-between mb-6 mt-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1AA19C]" />
            Felhasználók
          </h1>
          <p className="text-sm text-gray-400 mt-1">{users.length} felhasználó</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setForm({ email: '', password: '', name: '' }); setShowForm(true) }}
          className={`btn-primary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Új felhasználó</span>
        </button>
      </div>

      {showForm && (
        <div className={`${isModern ? 'modern-card p-5 border-white/5' : 'glass rounded-xl p-5 border-white/10'} mb-6 border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              {editingUser ? 'Felhasználó szerkesztése' : 'Új felhasználó'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingUser(null) }} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Név</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`}
                placeholder="Felhasználó neve"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`}
                placeholder="email@domain.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Jelszó {editingUser ? '(hagyd üresen ha nem változik)' : '*'}</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className={`input-field w-full px-3 py-2 rounded-lg text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`}
                placeholder="••••••••"
                required={!editingUser}
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button type="submit" disabled={saving} className={`btn-primary px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingUser ? 'Mentés' : 'Létrehozás'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#1AA19C]" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Még nincsenek felhasználók</p>
        </div>
      ) : (
        <div className={isModern ? 'grid grid-cols-1 xl:grid-cols-2 gap-4' : 'space-y-3'}>
          {users.map(user => {
            const sub = subStatusLabel[user.subscription_status] || subStatusLabel.none
            const days = user.subscription_status === 'trial' ? trialDaysLeft(user.trial_end) : null

            return (
              <div key={user.id} className={`${isModern ? 'modern-card p-5 hover:border-[#2EC4BE]/30' : 'glass rounded-xl p-4 border-white/5 hover:border-white/10'} transition-all`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${user.active ? (isModern ? 'bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] shadow-lg' : 'bg-[#1AA19C]') : 'bg-gray-600'}`}>
                    {(user.name || user.email)?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white truncate">{user.name || 'Névtelen'}</p>
                      {!user.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Inaktív</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isModern && sub.text === 'Aktív' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : sub.color}`}>{sub.text}</span>
                      {days !== null && <span className="text-[10px] text-gray-500">{days} nap</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                    <span>{user.contact_count || 0} kapcsolat</span>
                    <span>{user.email_count || 0} email</span>
                    <span>{user.quote_count || 0} árajánlat</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Subscription actions */}
                    {(!user.subscription_status || user.subscription_status === 'none' || user.subscription_status === 'inactive' || user.subscription_status === 'expired') && (
                      <>
                        <button
                          onClick={() => handleSubscription(user, 'start_trial')}
                          className={`p-2 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'}`}
                          title="Próbaidőszak indítása (30 nap)"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSubscription(user, 'activate')}
                          className={`p-2 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-green-400 hover:bg-green-500/10' : 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'}`}
                          title="Előfizetés aktiválása"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {user.subscription_status === 'trial' && (
                      <button
                        onClick={() => handleSubscription(user, 'stop_trial')}
                        className={`p-2 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'}`}
                        title="Próbaidőszak leállítása"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    )}
                    {user.subscription_status === 'active' && (
                      <button
                        onClick={() => handleSubscription(user, 'deactivate')}
                        className={`p-2 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'}`}
                        title="Előfizetés deaktiválása"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleImpersonate(user)}
                      className={`p-2 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10' : 'text-gray-400 hover:text-[#1AA19C] hover:bg-[#1AA19C]/10'}`}
                      title="Belépés felhasználóként"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className={`p-2 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'}`}
                      title="Szerkesztés"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`p-2 rounded-lg transition-all ${user.active ? (isModern ? 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10') : (isModern ? 'text-gray-400 hover:text-green-400 hover:bg-green-500/10' : 'text-gray-400 hover:text-green-400 hover:bg-green-500/10')}`}
                      title={user.active ? 'Deaktiválás' : 'Aktiválás'}
                    >
                      {user.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className={`p-2 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'}`}
                      title="Törlés"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
