import { useNavigate } from 'react-router-dom'
import {
  Send, Mail, Users, FileText, Shield, Zap, BarChart3,
  ArrowRight, Check, Star, ChevronDown, Globe, Lock,
  Inbox, PenLine, BookUser, CreditCard, Sparkles, Heart
} from 'lucide-react'

const features = [
  {
    icon: Inbox,
    title: 'IMAP Szinkronizálás',
    desc: 'Bejövő és kimenő leveleid automatikus szinkronizálása IMAP protokollon keresztül. Minden egy helyen, valós időben.',
  },
  {
    icon: PenLine,
    title: 'Email Szerkesztő',
    desc: 'Professzionális email szerkesztő beépített sablonokkal. Egyedi és tömeges levelek küldése pár kattintással.',
  },
  {
    icon: BookUser,
    title: 'Kapcsolatkezelés (CRM)',
    desc: 'Ügyfeleid, partnered adatai egy helyen. Teljes levelezési előzmények, csatolmányok és megjegyzések kontaktonként.',
  },
  {
    icon: FileText,
    title: 'Árajánlat Készítő',
    desc: 'Professzionális PDF árajánlatok generálása és azonnali küldése emailben. Automatikus sorszámozás és nyomon követés.',
  },
  {
    icon: Shield,
    title: 'Biztonságos Platform',
    desc: 'JWT alapú hitelesítés, titkosított kapcsolat és felhasználónkénti elkülönített adattárolás a maximális biztonságért.',
  },
  {
    icon: Zap,
    title: 'Villámgyors & Modern',
    desc: 'Modern webes technológiákra épülő, reszponzív felület. Asztali gépen és mobilon egyaránt tökéletesen működik.',
  },
]

const steps = [
  { num: '01', title: 'Regisztráció', desc: 'Hozd létre fiókodat pillanatok alatt és kezdd el a 30 napos ingyenes próbaidőszakot.' },
  { num: '02', title: 'Beállítás', desc: 'Add meg az SMTP/IMAP adataidat, töltsd fel a logódat és személyre szabd a rendszert.' },
  { num: '03', title: 'Használat', desc: 'Küldj emaileket, kezelj kapcsolatokat és készíts árajánlatokat — mindezt egy felületen.' },
]

export default function Landing() {
  const navigate = useNavigate()

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#1a1d23] text-[#e0e2e7] overflow-x-hidden">

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1AA19C]/15 flex items-center justify-center">
                <Send className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Pult<span className="text-[#2EC4BE]">ify</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo('features')} className="text-sm text-gray-400 hover:text-white transition-colors">Funkciók</button>
              <button onClick={() => scrollTo('how')} className="text-sm text-gray-400 hover:text-white transition-colors">Hogyan működik</button>
              <button onClick={() => scrollTo('pricing')} className="text-sm text-gray-400 hover:text-white transition-colors">Árazás</button>
              <button onClick={() => scrollTo('contact')} className="text-sm text-gray-400 hover:text-white transition-colors">Kapcsolat</button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Bejelentkezés
              </button>
              <button onClick={() => navigate('/login')}
                className="btn-primary px-5 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2">
                Indulás <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 px-4">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#1AA19C]/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#2EC4BE]/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#1AA19C]/3 rounded-full blur-[200px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-xs font-medium text-[#2EC4BE] mb-8 fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            Professzionális üzleti management platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight fade-in">
            Minden levelezésed
            <br />
            <span className="bg-gradient-to-r from-[#1AA19C] via-[#2EC4BE] to-[#1AA19C] bg-clip-text text-transparent">
              egy helyen.
            </span>
          </h1>

          <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed fade-in">
            Email, CRM, árajánlatok és teljes irodai menedzsment — egyetlen modern, biztonságos platformon.
            Tervezve kisvállalkozásoknak és szabadúszóknak.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 fade-in">
            <button onClick={() => navigate('/register')}
              className="btn-primary px-8 py-3.5 rounded-xl text-white font-bold text-base flex items-center gap-2.5 w-full sm:w-auto justify-center">
              Ingyenes Próba Indítása <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => scrollTo('features')}
              className="px-8 py-3.5 rounded-xl text-gray-300 font-medium text-base flex items-center gap-2.5 glass hover:border-[#1AA19C]/30 transition-all w-full sm:w-auto justify-center">
              Funkciók Felfedezése <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-6 sm:gap-10 text-sm text-gray-500 fade-in">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> 30 nap ingyen</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> Nincs bankkártya</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> Azonnali hozzáférés</span>
          </div>
        </div>

        {/* Hero visual — floating glass cards */}
        <div className="max-w-4xl mx-auto mt-16 sm:mt-20 relative fade-in">
          <div className="glass glow rounded-2xl p-6 sm:p-8">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="glass-light rounded-xl p-4 sm:p-5 text-center">
                <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-[#2EC4BE] mx-auto mb-2" />
                <div className="text-xl sm:text-2xl font-bold text-white">Email</div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Küldés & fogadás</div>
              </div>
              <div className="glass-light rounded-xl p-4 sm:p-5 text-center">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-[#2EC4BE] mx-auto mb-2" />
                <div className="text-xl sm:text-2xl font-bold text-white">CRM</div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Kapcsolatkezelés</div>
              </div>
              <div className="glass-light rounded-xl p-4 sm:p-5 text-center">
                <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-[#2EC4BE] mx-auto mb-2" />
                <div className="text-xl sm:text-2xl font-bold text-white">Árajánlat</div>
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">PDF generálás</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-xs font-medium text-[#2EC4BE] mb-4">
              <Star className="w-3.5 h-3.5" /> Funkciók
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white">
              Minden, amire szükséged van
            </h2>
            <p className="mt-4 text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
              Egy komplett üzleti levelezési és ügyfélkezelő platform, ami egyszerűsíti a mindennapjaidat.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="glass rounded-2xl p-6 sm:p-7 hover:border-[#1AA19C]/30 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center mb-5 group-hover:bg-[#1AA19C]/20 transition-colors">
                    <Icon className="w-6 h-6 text-[#2EC4BE]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#1AA19C]/5 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-14 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-xs font-medium text-[#2EC4BE] mb-4">
              <Zap className="w-3.5 h-3.5" /> Egyszerű
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white">
              Hogyan működik?
            </h2>
            <p className="mt-4 text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
              Három egyszerű lépésben elkezdheted használni a platformot.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {steps.map((s, i) => (
              <div key={i} className="glass rounded-2xl p-6 sm:p-8 flex items-start gap-5 sm:gap-7 hover:border-[#1AA19C]/25 transition-all">
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] bg-clip-text text-transparent shrink-0 w-14 text-right">
                  {s.num}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">{s.title}</h3>
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-xs font-medium text-[#2EC4BE] mb-4">
              <CreditCard className="w-3.5 h-3.5" /> Árazás
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white">
              Egyszerű, átlátható árazás
            </h2>
            <p className="mt-4 text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
              Próbáld ki ingyen, majd válaszd a neked megfelelő csomagot.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto">
            {/* Trial */}
            <div className="glass rounded-2xl p-7 sm:p-9 hover:border-[#1AA19C]/25 transition-all">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1AA19C]/10 text-xs font-semibold text-[#2EC4BE] mb-5">
                <Sparkles className="w-3.5 h-3.5" /> Próba
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white">Ingyenes</span>
              </div>
              <p className="text-gray-500 text-sm mb-7">30 napig, kötelezettség nélkül</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Teljes funkciókészlet',
                  'Email küldés & fogadás',
                  'Kapcsolatkezelés (CRM)',
                  'Árajánlat készítés & PDF',
                  '30 napos próbaidőszak',
                  'Nincs bankkártya szükséges',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-[#2EC4BE] shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/register')}
                className="w-full py-3 rounded-xl text-sm font-semibold glass hover:border-[#1AA19C]/40 text-white transition-all flex items-center justify-center gap-2">
                Próba Indítása <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Paid */}
            <div className="relative glass rounded-2xl p-7 sm:p-9 border-[#1AA19C]/30 hover:border-[#1AA19C]/50 transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#1AA19C] text-xs font-bold text-white">
                Ajánlott
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1AA19C]/10 text-xs font-semibold text-[#2EC4BE] mb-5">
                <Star className="w-3.5 h-3.5" /> Teljes
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white">3 090</span>
                <span className="text-lg text-gray-400 font-medium">Ft / hó</span>
              </div>
              <p className="text-gray-500 text-sm mb-7">Korlátlan hozzáférés minden funkcióhoz</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Minden próba funkció',
                  'Korlátlan email küldés',
                  'Korlátlan kapcsolatok',
                  'Korlátlan árajánlatok',
                  'Tömeges email küldés',
                  'Prioritásos támogatás',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-[#2EC4BE] shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/register')}
                className="btn-primary w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2">
                Előfizetés <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1AA19C]/6 rounded-full blur-[150px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="glass glow rounded-3xl p-10 sm:p-14">
            <div className="w-16 h-16 rounded-2xl bg-[#1AA19C]/15 flex items-center justify-center mx-auto mb-6">
              <Send className="w-8 h-8 text-[#2EC4BE]" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4">
              Készen állsz az indulásra?
            </h2>
            <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-lg mx-auto">
              Próbáld ki 30 napig teljesen ingyen. Nincs rejtett költség, nincs kötelezettség.
            </p>
            <button onClick={() => navigate('/register')}
              className="btn-primary px-10 py-4 rounded-xl text-white font-bold text-base flex items-center gap-2.5 mx-auto">
              Ingyenes Próba Indítása <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ CONTACT ═══ */}
      <section id="contact" className="py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-start gap-8 sm:gap-12">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Kérdésed van?</h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-5">
                Szívesen segítünk! Írj nekünk emailt és hamarosan válaszolunk.
              </p>
              <a href="mailto:info@tm-it.hu"
                className="inline-flex items-center gap-2.5 text-[#2EC4BE] hover:text-white transition-colors font-medium text-sm sm:text-base">
                <Mail className="w-5 h-5" />
                info@tm-it.hu
              </a>
            </div>
            <div className="glass-light rounded-xl p-5 sm:p-6 w-full md:w-auto md:min-w-[240px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-[#2EC4BE]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">TM Infotech Kft.</div>
                  <div className="text-xs text-gray-500">Magyarország</div>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  info@tm-it.hu
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#1AA19C]/15 flex items-center justify-center">
              <Send className="w-4 h-4 text-[#2EC4BE]" />
            </div>
            <span className="text-sm font-semibold text-gray-400">Pult<span className="text-[#2EC4BE]">ify</span></span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            Készítette a <Heart className="w-3 h-3 text-[#1AA19C] mx-0.5" /> <span className="text-gray-500 font-medium">TM Infotech Kft.</span> — Magyarország, {new Date().getFullYear()}
          </div>
          <button onClick={() => navigate('/login')} className="text-xs text-gray-500 hover:text-[#2EC4BE] transition-colors">
            Bejelentkezés &rarr;
          </button>
        </div>
      </footer>
    </div>
  )
}
