import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Mail, Users, FileText, Shield, Zap,
  ArrowRight, Check, Star, ChevronDown, Globe,
  Inbox, PenLine, BookUser, CreditCard, Sparkles, Heart,
  MousePointer, Play, BarChart3, Clock, Layers
} from 'lucide-react'

const features = [
  {
    icon: Inbox,
    title: 'IMAP Szinkronizálás',
    desc: 'Bejövő és kimenő leveleid automatikus szinkronizálása IMAP protokollon keresztül. Minden egy helyen, valós időben.',
    color: '#2EC4BE',
  },
  {
    icon: PenLine,
    title: 'Email Szerkesztő',
    desc: 'Professzionális email szerkesztő beépített sablonokkal. Egyedi és tömeges levelek küldése pár kattintással.',
    color: '#6366f1',
  },
  {
    icon: BookUser,
    title: 'Kapcsolatkezelés (CRM)',
    desc: 'Ügyfeleid, partnered adatai egy helyen. Teljes levelezési előzmények, csatolmányok és megjegyzések kontaktonként.',
    color: '#f59e0b',
  },
  {
    icon: FileText,
    title: 'Árajánlat Készítő',
    desc: 'Professzionális PDF árajánlatok generálása és azonnali küldése emailben. Automatikus sorszámozás és nyomon követés.',
    color: '#ec4899',
  },
  {
    icon: Shield,
    title: 'Biztonságos Platform',
    desc: 'JWT alapú hitelesítés, titkosított kapcsolat és felhasználónkénti elkülönített adattárolás a maximális biztonságért.',
    color: '#10b981',
  },
  {
    icon: Zap,
    title: 'Villámgyors & Modern',
    desc: 'Modern webes technológiákra épülő, reszponzív felület. Asztali gépen és mobilon egyaránt tökéletesen működik.',
    color: '#f97316',
  },
]

const steps = [
  { num: '01', title: 'Regisztráció', desc: 'Hozd létre fiókodat pillanatok alatt és kezdd el a 30 napos ingyenes próbaidőszakot.', icon: MousePointer },
  { num: '02', title: 'Beállítás', desc: 'Add meg az SMTP/IMAP adataidat, töltsd fel a logódat és személyre szabd a rendszert.', icon: Layers },
  { num: '03', title: 'Használat', desc: 'Küldj emaileket, kezelj kapcsolatokat és készíts árajánlatokat — mindezt egy felületen.', icon: Play },
]

const stats = [
  { value: 99.9, suffix: '%', label: 'Rendelkezésre állás' },
  { value: 500, suffix: '+', label: 'Aktív felhasználó' },
  { value: 50000, suffix: '+', label: 'Elküldött email' },
  { value: 24, suffix: '/7', label: 'Támogatás' },
]

/* ═══ HOOKS ═══ */

function useScrollReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.unobserve(el) } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function useMultiReveal(count) {
  const refs = useRef([])
  useEffect(() => {
    const observers = []
    refs.current.forEach((el) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.unobserve(el) } },
        { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [count])
  return (i) => (el) => { refs.current[i] = el }
}

function useTypingEffect(words, speed = 100, pause = 2000) {
  const [text, setText] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[wordIdx]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, charIdx + 1))
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause)
        } else {
          setCharIdx(c => c + 1)
        }
      } else {
        setText(word.slice(0, charIdx))
        if (charIdx === 0) {
          setDeleting(false)
          setWordIdx((wordIdx + 1) % words.length)
        } else {
          setCharIdx(c => c - 1)
        }
      }
    }, deleting ? speed / 2 : speed)
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, wordIdx, words, speed, pause])

  return text
}

function useAnimatedCounter(target, duration = 2000) {
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); obs.unobserve(el) }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const start = performance.now()
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [started, target, duration])

  return { value, ref }
}

/* ═══ COMPONENTS ═══ */

function Particles() {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 10 + Math.random() * 20,
      size: 2 + Math.random() * 4,
      opacity: 0.1 + Math.random() * 0.3,
    }))
  ).current

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#2EC4BE]"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `particleFloat ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function AnimatedStat({ target, suffix, label }) {
  const { value, ref } = useAnimatedCounter(target)
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-extrabold text-white">
        {value.toLocaleString('hu-HU')}<span className="text-[#2EC4BE]">{suffix}</span>
      </div>
      <div className="text-xs sm:text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

/* ═══ MAIN ═══ */

export default function Landing() {
  const navigate = useNavigate()
  const [navScrolled, setNavScrolled] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const typedText = useTypingEffect(
    ['egy helyen.', 'egyszerűen.', 'biztonságosan.', 'hatékonyan.'],
    80, 2500
  )

  const featureRefs = useMultiReveal(features.length)
  const stepRefs = useMultiReveal(steps.length)
  const heroRef = useScrollReveal()
  const featuresHeaderRef = useScrollReveal()
  const howHeaderRef = useScrollReveal()
  const pricingHeaderRef = useScrollReveal()
  const statsRef = useScrollReveal()
  const ctaRef = useScrollReveal()
  const contactRef = useScrollReveal()
  const pricingCard1Ref = useScrollReveal()
  const pricingCard2Ref = useScrollReveal()

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#1a1d23] text-[#e0e2e7] overflow-x-hidden" onMouseMove={handleMouseMove}>

      {/* ═══ NAVBAR ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b border-white/5 transition-all duration-500 ${navScrolled ? 'nav-scrolled glass' : 'glass'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/pultify-logo.png" alt="Pultify" className="h-9 object-contain" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Funkciók', id: 'features' },
                { label: 'Hogyan működik', id: 'how' },
                { label: 'Árazás', id: 'pricing' },
                { label: 'Kapcsolat', id: 'contact' },
              ].map(item => (
                <button key={item.id} onClick={() => scrollTo(item.id)}
                  className="text-sm text-gray-400 hover:text-white transition-colors relative group">
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2EC4BE] transition-all duration-300 group-hover:w-full" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Bejelentkezés
              </button>
              <button onClick={() => navigate('/register')}
                className="magnetic-btn btn-primary px-5 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2">
                Indulás <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 sm:pt-44 sm:pb-32 px-4">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-[#1AA19C]/8 rounded-full blur-[120px] orb-animate" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#2EC4BE]/5 rounded-full blur-[100px] orb-animate-2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#1AA19C]/3 rounded-full blur-[200px] orb-animate-3" />
        </div>

        <Particles />

        {/* Subtle mouse-follow glow */}
        <div
          className="absolute w-[300px] h-[300px] rounded-full pointer-events-none transition-all duration-1000 ease-out"
          style={{
            left: mousePos.x - 150,
            top: mousePos.y - 150,
            background: 'radial-gradient(circle, rgba(26,161,156,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="hero-enter hero-enter-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-xs font-medium text-[#2EC4BE] mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Professzionális üzleti management platform
          </div>

          <h1 className="hero-enter hero-enter-2 text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight">
            Minden levelezésed
            <br />
            <span className="bg-gradient-to-r from-[#1AA19C] via-[#2EC4BE] to-[#1AA19C] bg-clip-text text-transparent text-shimmer">
              {typedText}<span className="typing-cursor" />
            </span>
          </h1>

          <p className="hero-enter hero-enter-3 mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Email, CRM, árajánlatok és teljes irodai menedzsment — egyetlen modern, biztonságos platformon.
            Tervezve kisvállalkozásoknak és szabadúszóknak.
          </p>

          <div className="hero-enter hero-enter-4 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')}
              className="magnetic-btn btn-primary px-8 py-3.5 rounded-xl text-white font-bold text-base flex items-center gap-2.5 w-full sm:w-auto justify-center">
              Ingyenes Próba Indítása <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => scrollTo('features')}
              className="px-8 py-3.5 rounded-xl text-gray-300 font-medium text-base flex items-center gap-2.5 glass hover:border-[#1AA19C]/30 transition-all w-full sm:w-auto justify-center group">
              Funkciók Felfedezése <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </button>
          </div>

          <div className="hero-enter hero-enter-5 mt-12 flex items-center justify-center gap-6 sm:gap-10 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> 30 nap ingyen</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> Nincs bankkártya</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> Azonnali hozzáférés</span>
          </div>
        </div>

        {/* Hero visual — floating glass cards */}
        <div ref={heroRef} className="reveal max-w-4xl mx-auto mt-16 sm:mt-20 relative">
          <div className="glass glow rounded-2xl p-6 sm:p-8 pulse-glow">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { icon: Mail, label: 'Email', sub: 'Küldés & fogadás', anim: 'float' },
                { icon: Users, label: 'CRM', sub: 'Kapcsolatkezelés', anim: 'float float-delay-1' },
                { icon: FileText, label: 'Árajánlat', sub: 'PDF generálás', anim: 'float float-delay-2' },
              ].map((card, i) => (
                <div key={i} className={`glass-light rounded-xl p-4 sm:p-5 text-center card-hover ${card.anim}`}>
                  <card.icon className="w-7 h-7 sm:w-8 sm:h-8 text-[#2EC4BE] mx-auto mb-2" />
                  <div className="text-xl sm:text-2xl font-bold text-white">{card.label}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{card.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="py-12 px-4 relative">
        <div className="gradient-line h-px max-w-4xl mx-auto mb-12" />
        <div ref={statsRef} className="reveal max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <AnimatedStat key={i} target={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </div>
        <div className="gradient-line h-px max-w-4xl mx-auto mt-12" />
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#1AA19C]/4 rounded-full blur-[120px] orb-animate-2" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div ref={featuresHeaderRef} className="reveal text-center mb-14 sm:mb-20">
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
                <div key={i} ref={featureRefs(i)}
                  className={`reveal delay-${(i % 3) + 1} glass rounded-2xl p-6 sm:p-7 card-hover group relative overflow-hidden`}>
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 30% 30%, ${f.color}08 0%, transparent 70%)` }} />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                      style={{ background: `${f.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#1AA19C]/5 rounded-full blur-[120px] orb-animate" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div ref={howHeaderRef} className="reveal text-center mb-14 sm:mb-20">
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

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[39px] top-0 bottom-0 w-px bg-gradient-to-b from-[#1AA19C]/0 via-[#1AA19C]/30 to-[#1AA19C]/0 hidden sm:block" />

            <div className="space-y-6 sm:space-y-8">
              {steps.map((s, i) => {
                const StepIcon = s.icon
                return (
                  <div key={i} ref={stepRefs(i)}
                    className={`reveal delay-${i + 1} glass rounded-2xl p-6 sm:p-8 flex items-start gap-5 sm:gap-7 card-hover relative`}>
                    <div className="relative shrink-0">
                      <div className="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] rounded-2xl bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] flex items-center justify-center shadow-lg shadow-[#1AA19C]/20">
                        <StepIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1a1d23] border-2 border-[#2EC4BE] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#2EC4BE]">{s.num}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">{s.title}</h3>
                      <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#1AA19C]/4 rounded-full blur-[150px] orb-animate-3" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div ref={pricingHeaderRef} className="reveal text-center mb-14 sm:mb-20">
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
            <div ref={pricingCard1Ref} className="reveal-left glass rounded-2xl p-7 sm:p-9 card-hover">
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
                className="magnetic-btn w-full py-3 rounded-xl text-sm font-semibold glass hover:border-[#1AA19C]/40 text-white transition-all flex items-center justify-center gap-2">
                Próba Indítása <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Paid */}
            <div ref={pricingCard2Ref} className="reveal-right relative glass rounded-2xl p-7 sm:p-9 border-[#1AA19C]/30 card-hover">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#1AA19C] text-xs font-bold text-white shadow-lg shadow-[#1AA19C]/30">
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
                className="magnetic-btn btn-primary w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2">
                Előfizetés <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1AA19C]/6 rounded-full blur-[150px] orb-animate" />
        </div>
        <Particles />
        <div ref={ctaRef} className="reveal-scale max-w-3xl mx-auto text-center relative z-10">
          <div className="glass glow rounded-3xl p-10 sm:p-14 pulse-glow relative overflow-hidden">
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-3xl opacity-30"
              style={{ background: 'conic-gradient(from var(--angle, 0deg), transparent, #1AA19C, transparent, #2EC4BE, transparent)', padding: '1px' }} />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-[#1AA19C]/15 flex items-center justify-center mx-auto mb-6 float">
                <Send className="w-8 h-8 text-[#2EC4BE]" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4">
                Készen állsz az indulásra?
              </h2>
              <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-lg mx-auto">
                Próbáld ki 30 napig teljesen ingyen. Nincs rejtett költség, nincs kötelezettség.
              </p>
              <button onClick={() => navigate('/register')}
                className="magnetic-btn btn-primary px-10 py-4 rounded-xl text-white font-bold text-base flex items-center gap-2.5 mx-auto">
                Ingyenes Próba Indítása <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CONTACT ═══ */}
      <section id="contact" className="py-16 sm:py-20 px-4">
        <div ref={contactRef} className="reveal max-w-4xl mx-auto">
          <div className="glass rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-start gap-8 sm:gap-12 card-hover">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Kérdésed van?</h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-5">
                Szívesen segítünk! Írj nekünk emailt és hamarosan válaszolunk.
              </p>
              <a href="mailto:info@tm-it.hu"
                className="inline-flex items-center gap-2.5 text-[#2EC4BE] hover:text-white transition-colors font-medium text-sm sm:text-base group">
                <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
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
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 cursor-default">
              <img src="/pultify-logo.png" alt="Pultify" className="h-7 object-contain" />
            </div>
            <div className="flex items-center gap-5 text-xs">
              <button onClick={() => navigate('/impressum')} className="text-gray-500 hover:text-[#2EC4BE] transition-colors">Impresszum</button>
              <button onClick={() => navigate('/adatvedelem')} className="text-gray-500 hover:text-[#2EC4BE] transition-colors">Adatvédelem</button>
              <button onClick={() => navigate('/aszf')} className="text-gray-500 hover:text-[#2EC4BE] transition-colors">ÁSZF</button>
              <button onClick={() => navigate('/login')} className="text-gray-500 hover:text-[#2EC4BE] transition-colors">Bejelentkezés</button>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-1 text-xs text-gray-600">
            Készítette a <Heart className="w-3 h-3 text-[#1AA19C] mx-0.5" /> <span className="text-gray-500 font-medium">TM Infotech Kft.</span> — Magyarország, {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  )
}
