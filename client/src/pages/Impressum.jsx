import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Phone, Mail, Globe, Hash, Scale, Server } from 'lucide-react'

export default function Impressum() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#1a1d23] text-[#e0e2e7]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Vissza
            </button>
            <img src="/pultify-logo.png" alt="Pultify" className="h-7 object-contain" />
            <div className="w-16" />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Impresszum</h1>
        <p className="text-gray-500 text-sm mb-10">Utolsó frissítés: 2026. február 15.</p>

        <div className="space-y-8">
          {/* Cégadatok */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">Cégadatok</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cégnév</p>
                <p className="text-sm text-gray-200 font-medium">TM Infotech Kft.</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Székhely</p>
                <p className="text-sm text-gray-200">9325 Sopronnémeti, Hunyadi utca 3/a</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Telefon</p>
                <a href="tel:+36304429707" className="text-sm text-[#2EC4BE] hover:text-white transition-colors flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> +36 30 442 9707
                </a>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                <a href="mailto:info@tm-it.hu" className="text-sm text-[#2EC4BE] hover:text-white transition-colors flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> info@tm-it.hu
                </a>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Weboldal</p>
                <a href="https://tm-it.hu" target="_blank" rel="noopener noreferrer" className="text-sm text-[#2EC4BE] hover:text-white transition-colors flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> https://tm-it.hu
                </a>
              </div>
            </div>
          </section>

          {/* Nyilvántartási adatok */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">Nyilvántartási adatok</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bejegyző hatóság</p>
                <p className="text-sm text-gray-200">Győr Cégbíróság</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cégjegyzékszám</p>
                <p className="text-sm text-gray-200 font-mono">08-09-034842</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Adószám</p>
                <p className="text-sm text-gray-200 font-mono">32053461-2-08</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Kamara</p>
                <p className="text-sm text-gray-200">Győri Iparkamara</p>
              </div>
            </div>
          </section>

          {/* Tárhelyszolgáltató */}
          <section className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <h2 className="text-lg font-bold text-white">Tárhelyszolgáltató</h2>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Szolgáltató neve</p>
              <p className="text-sm text-gray-200">IONOS Germany</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
