import { useState, useEffect } from 'react'
import { getGlobalSettings, updateGlobalSettings } from '../lib/api'
import toast from 'react-hot-toast'
import { Globe, Loader2, Shield, UserPlus, Layout } from 'lucide-react'

export default function GlobalSettings() {
  const [settings, setSettings] = useState({
    landing_page_enabled: 'true',
    registration_enabled: 'true',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getGlobalSettings()
      setSettings(prev => ({
        ...prev,
        landing_page_enabled: data.landing_page_enabled || 'true',
        registration_enabled: data.registration_enabled || 'true',
      }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key) => {
    const newValue = settings[key] === 'true' ? 'false' : 'true'
    const updated = { ...settings, [key]: newValue }
    setSettings(updated)
    setSaving(true)
    try {
      await updateGlobalSettings({ [key]: newValue })
      toast.success('Beállítás mentve!')
    } catch (err) {
      toast.error(err.message)
      setSettings(prev => ({ ...prev, [key]: settings[key] }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#2EC4BE]" />
      </div>
    )
  }

  const toggleItems = [
    {
      key: 'landing_page_enabled',
      icon: Layout,
      title: 'Landing Oldal',
      desc: 'Ha kikapcsolod, a főoldal helyett közvetlenül a bejelentkezési oldal jelenik meg. Exkluzív domainekhez ajánlott.',
      warning: 'A landing oldal, az impresszum, az adatvédelmi tájékoztató és az ÁSZF oldal sem lesz elérhető.',
    },
    {
      key: 'registration_enabled',
      icon: UserPlus,
      title: 'Regisztráció',
      desc: 'Ha kikapcsolod, új felhasználók nem tudnak regisztrálni. Csak az admin tud új fiókokat létrehozni.',
      warning: 'A regisztrációs oldal és a regisztrációs API végpont is le lesz tiltva.',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mt-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-[#2EC4BE]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Globális Beállítások</h2>
          <p className="text-xs text-gray-500">Az egész alkalmazásra vonatkozó beállítások</p>
        </div>
      </div>

      <div className="space-y-4">
        {toggleItems.map(item => {
          const Icon = item.icon
          const isEnabled = settings[item.key] === 'true'
          return (
            <div key={item.key} className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isEnabled ? 'bg-[#1AA19C]/15' : 'bg-red-500/10'}`}>
                    <Icon className={`w-5 h-5 ${isEnabled ? 'text-[#2EC4BE]' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{item.desc}</p>
                    {!isEnabled && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400/80">
                        <Shield className="w-3 h-3" />
                        {item.warning}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  disabled={saving}
                  className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-300 ${isEnabled ? 'bg-[#1AA19C]' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${isEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="glass rounded-2xl p-5 mt-6">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500 leading-relaxed">
            Ezek a beállítások azonnal érvénybe lépnek. A landing oldal kikapcsolása esetén a látogatók közvetlenül a bejelentkezési oldalra kerülnek. A regisztráció kikapcsolása esetén csak az admin felületen lehet új felhasználókat létrehozni.
          </p>
        </div>
      </div>
    </div>
  )
}
