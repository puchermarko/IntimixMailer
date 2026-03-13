import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Send, Mail, Users, FileText, Shield, Zap,
  ArrowRight, Check, Star, ChevronDown, Globe,
  Inbox, PenLine, BookUser, CreditCard, Sparkles, Heart,
  MousePointer, Play, BarChart3, Clock, Layers, Monitor, Download,
  Lock, Code, Palette, Key, LayoutGrid, RefreshCw
} from 'lucide-react'
// useUI no longer needed — Landing uses a single consistent dark theme

const features = [
  {
    icon: Inbox,
    title: 'IMAP Szinkronizálás',
    desc: 'Bejövő és kimenő leveleid automatikus szinkronizálása IMAP protokollon keresztül. Minden egy helyen, valós időben.',
    color: '#2EC4BE',
    highlights: ['Valós idejű szinkron', 'Bejövő & kimenő', 'Automatikus frissítés'],
  },
  {
    icon: PenLine,
    title: 'Email Szerkesztő',
    desc: 'Professzionális email szerkesztő beépített sablonokkal. Egyedi és tömeges levelek küldése pár kattintással.',
    color: '#6366f1',
    highlights: ['Beépített sablonok', 'Tömeges küldés', 'HTML szerkesztő'],
  },
  {
    icon: BookUser,
    title: 'Kapcsolatkezelés (CRM)',
    desc: 'Ügyfeleid, partnered adatai egy helyen. Teljes levelezési előzmények, csatolmányok és megjegyzések kontaktonként.',
    color: '#f59e0b',
    highlights: ['Levelezési előzmények', 'Csatolmányok', 'Megjegyzések'],
  },
  {
    icon: FileText,
    title: 'Árajánlat Készítő',
    desc: 'Professzionális PDF árajánlatok generálása és azonnali küldése emailben. Automatikus sorszámozás és nyomon követés.',
    color: '#ec4899',
    highlights: ['PDF generálás', 'Automatikus sorszám', 'Email küldés'],
  },
  {
    icon: Shield,
    title: 'Biztonságos Platform',
    desc: 'JWT hitelesítés, OAuth2 támogatás (Gmail, Outlook), AES-256 titkosítás és kétlépcsős azonosítás (MFA) a maximális biztonságért.',
    color: '#10b981',
    highlights: ['OAuth2 (Gmail/Outlook)', 'AES-256 titkosítás', 'MFA hitelesítés'],
  },
  {
    icon: Zap,
    title: 'Villámgyors & Modern',
    desc: 'Modern webes technológiákra épülő, reszponzív felület. Asztali gépen és mobilon egyaránt tökéletesen működik.',
    color: '#f97316',
    highlights: ['Reszponzív design', 'Mobil kompatibilis', 'Azonnali betöltés'],
  },
]

const bentoFeatures = [
  { icon: Mail, title: 'Email küldés & fogadás', desc: 'SMTP/IMAP integráció, tömeges küldés, sablonok', size: 'large', color: '#2EC4BE' },
  { icon: BookUser, title: 'CRM', desc: 'Kapcsolatkezelés, előzmények, jegyzetek', size: 'small', color: '#f59e0b' },
  { icon: FileText, title: 'Árajánlatok', desc: 'PDF generálás, automatikus sorszám', size: 'small', color: '#ec4899' },
  { icon: Shield, title: 'OAuth2 & MFA', desc: 'Gmail/Outlook OAuth2, kétlépcsős hitelesítés', size: 'small', color: '#10b981' },
  { icon: LayoutGrid, title: 'Sablon szerkesztő', desc: 'Drag & drop email builder', size: 'small', color: '#6366f1' },
  { icon: Key, title: 'API hozzáférés', desc: 'REST API, webhook integráció', size: 'large', color: '#f97316' },
  { icon: Palette, title: 'Céges márka', desc: 'Logó, cégadatok, arculat', size: 'small', color: '#8b5cf6' },
  { icon: RefreshCw, title: 'Auto szinkron', desc: 'IMAP automatikus szinkronizálás', size: 'small', color: '#2EC4BE' },
]

const steps = [
  { num: '01', title: 'Regisztráció', desc: 'Hozd létre fiókodat pillanatok alatt és kezdd el a 30 napos ingyenes próbaidőszakot.', icon: MousePointer },
  { num: '02', title: 'Beállítás', desc: 'Add meg az SMTP/IMAP adataidat vagy csatlakoztasd Google/Outlook fiókodat OAuth2-vel.', icon: Layers },
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

function ContributionGraph() {
  const weeks = 20
  const days = 7
  const cells = useMemo(() =>
    Array.from({ length: weeks * days }, (_, i) => ({
      level: Math.random() < 0.3 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : Math.random() < 0.9 ? 3 : 4,
      delay: i * 8,
    })),
  [])
  const colors = ['rgba(255,255,255,0.03)', 'rgba(46,196,190,0.15)', 'rgba(46,196,190,0.3)', 'rgba(46,196,190,0.5)', 'rgba(46,196,190,0.7)']

  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="flex flex-col gap-[3px]">
          {Array.from({ length: days }, (_, d) => {
            const cell = cells[w * days + d]
            return (
              <div key={d} className="w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-[2px]"
                style={{
                  background: colors[cell.level],
                  animation: `cellPop 0.3s ease-out ${cell.delay}ms forwards`,
                  opacity: 0,
                  transform: 'scale(0)',
                }} />
            )
          })}
        </div>
      ))}
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
  const bentoRefs = useMultiReveal(bentoFeatures.length)
  const heroRef = useScrollReveal()
  const featuresHeaderRef = useScrollReveal()
  const howHeaderRef = useScrollReveal()
  const pricingHeaderRef = useScrollReveal()
  const statsRef = useScrollReveal()
  const ctaRef = useScrollReveal()
  const contactRef = useScrollReveal()
  const pricingCard1Ref = useScrollReveal()
  const bentoHeaderRef = useScrollReveal()

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
    <div className="min-h-screen bg-[#0a0c10] text-[#e0e2e7] overflow-x-hidden" onMouseMove={handleMouseMove}>

      {/* Top glow line */}
      <div className="fixed top-0 left-0 right-0 h-px glow-line z-[60]" />

      {/* ═══ NAVBAR ═══ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500 ${navScrolled ? 'bg-[#0a0c10]/90 backdrop-blur-xl border-white/5 shadow-lg shadow-black/20' : 'bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/pultify-logo.png" alt="Pultify" className="h-9 object-contain" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Funkciók', id: 'features' },
                { label: 'Platform', id: 'platform' },
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
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Bejelentkezés
              </button>
              <button onClick={() => navigate('/register')}
                className="px-5 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-2 bg-gradient-to-r from-[#1AA19C] to-[#1AA19C] hover:to-[#2EC4BE] transition-all shadow-lg shadow-[#1AA19C]/20">
                Indulás <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 sm:pt-44 sm:pb-32 px-4">
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg radial-mask pointer-events-none" />

        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px] bg-[#1AA19C]/6 breathe" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px] bg-[#2EC4BE]/4 breathe-slow breathe-delay" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[200px] bg-[#1AA19C]/3 breathe-slow" />
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
          <div className="hero-enter hero-enter-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-[#2EC4BE] mb-8 bg-[#2EC4BE]/5 border border-[#2EC4BE]/10 backdrop-blur-sm">
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
              className="px-8 py-3.5 rounded-xl text-white font-bold text-base flex items-center gap-2.5 w-full sm:w-auto justify-center bg-gradient-to-r from-[#1AA19C] to-[#1AA19C] hover:to-[#2EC4BE] transition-all shadow-lg shadow-[#1AA19C]/25 hover:shadow-[#1AA19C]/40 hover:-translate-y-0.5">
              Ingyenes Próba Indítása <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => scrollTo('features')}
              className="px-8 py-3.5 rounded-xl text-gray-300 font-medium text-base flex items-center gap-2.5 transition-all w-full sm:w-auto justify-center group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1]">
              Funkciók Felfedezése <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </button>
          </div>

          <div className="hero-enter hero-enter-5 mt-12 flex items-center justify-center gap-6 sm:gap-10 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> 30 nap ingyen</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> Nincs bankkártya</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#2EC4BE]" /> Azonnali hozzáférés</span>
          </div>
        </div>

        {/* Hero visual — cards + contribution graph */}
        <div ref={heroRef} className="reveal max-w-4xl mx-auto mt-16 sm:mt-20 relative">
          <div className="gradient-border rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              {[
                { icon: Mail, label: 'Email', sub: 'Küldés & fogadás', anim: 'float' },
                { icon: Users, label: 'CRM', sub: 'Kapcsolatkezelés', anim: 'float float-delay-1' },
                { icon: FileText, label: 'Árajánlat', sub: 'PDF generálás', anim: 'float float-delay-2' },
              ].map((card, i) => (
                <div key={i} className={`bg-white/[0.03] rounded-xl p-4 sm:p-5 border border-white/[0.04] text-center card-hover ${card.anim}`}>
                  <card.icon className="w-7 h-7 sm:w-8 sm:h-8 text-[#2EC4BE] mx-auto mb-2" />
                  <div className="text-xl sm:text-2xl font-bold text-white">{card.label}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{card.sub}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center">
              <ContributionGraph />
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-gray-600 font-mono">Kevesebb</span>
              <div className="flex gap-1">
                {['rgba(255,255,255,0.03)', 'rgba(46,196,190,0.15)', 'rgba(46,196,190,0.3)', 'rgba(46,196,190,0.5)', 'rgba(46,196,190,0.7)'].map((c, i) => (
                  <div key={i} className="w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-[2px]" style={{ background: c }} />
                ))}
              </div>
              <span className="text-[10px] text-gray-600 font-mono">Több</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="py-12 px-4 relative">
        <div className="section-divider max-w-4xl mx-auto mb-12" />
        <div ref={statsRef} className="reveal max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <AnimatedStat key={i} target={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </div>
        <div className="section-divider max-w-4xl mx-auto mt-12" />
      </section>

      {/* ═══ BENTO GRID PLATFORM OVERVIEW ═══ */}
      <section id="platform" className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 grid-bg radial-mask pointer-events-none opacity-50" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div ref={bentoHeaderRef} className="reveal text-center mb-14 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-[#2EC4BE] mb-5 bg-[#2EC4BE]/5 border border-[#2EC4BE]/10">
              <Code className="w-3.5 h-3.5" /> Platform
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white">
              Egy platform, végtelen lehetőség
            </h2>
            <p className="mt-5 text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Minden eszköz, ami egy modern vállalkozáshoz szükséges — integrálva egyetlen felületen.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {bentoFeatures.map((f, i) => {
              const Icon = f.icon
              const isLarge = f.size === 'large'
              return (
                <div key={i} ref={bentoRefs(i)}
                  className={`reveal delay-${(i % 4) + 1} bento-card gradient-border rounded-xl p-5 sm:p-6 card-hover group ${isLarge ? 'md:col-span-2' : ''}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ background: `${f.color}12` }}>
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 sm:py-32 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#1AA19C]/4 rounded-full blur-[150px] breathe" />
          <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-[#2EC4BE]/3 rounded-full blur-[130px] breathe-slow" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div ref={featuresHeaderRef} className="reveal text-center mb-20 sm:mb-28">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-[#2EC4BE] mb-5 bg-[#2EC4BE]/5 border border-[#2EC4BE]/10">
              <Star className="w-3.5 h-3.5" /> Funkciók
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white">
              Minden, amire szükséged van
            </h2>
            <p className="mt-5 text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Egy komplett üzleti levelezési és ügyfélkezelő platform, ami egyszerűsíti a mindennapjaidat.
            </p>
          </div>

          {/* Alternating feature showcases */}
          <div className="space-y-16 sm:space-y-24">
            {features.map((f, i) => {
              const Icon = f.icon
              const isEven = i % 2 === 0
              return (
                <div key={i} ref={featureRefs(i)}
                  className={`${isEven ? 'reveal-left' : 'reveal-right'} delay-${(i % 3) + 1} flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-14`}>

                  {/* Icon showcase */}
                  <div className="shrink-0 relative">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl flex items-center justify-center relative group cursor-default card-hover gradient-border"
                      style={{ borderColor: `${f.color}25` }}>
                      {/* Animated glow ring */}
                      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                        style={{ boxShadow: `0 0 40px ${f.color}20, inset 0 0 40px ${f.color}08` }} />
                      {/* Background gradient */}
                      <div className="absolute inset-0 rounded-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                        style={{ background: `radial-gradient(circle at 50% 50%, ${f.color}15 0%, transparent 70%)` }} />
                      <Icon className="w-12 h-12 sm:w-14 sm:h-14 relative z-10 transition-transform duration-500 group-hover:scale-110" style={{ color: f.color }} />
                    </div>
                    {/* Number badge */}
                    <div className="absolute -top-3 -right-3 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${f.color}, ${f.color}cc)`, boxShadow: `0 4px 15px ${f.color}40` }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${isEven ? 'md:text-left' : 'md:text-right'} text-center`}>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">{f.title}</h3>
                    <p className={`text-sm sm:text-base text-gray-400 leading-relaxed mb-5 max-w-lg ${isEven ? '' : 'md:ml-auto'}`}>{f.desc}</p>
                    {/* Highlight pills */}
                    <div className={`flex flex-wrap gap-2 ${isEven ? 'justify-center md:justify-start' : 'justify-center md:justify-end'}`}>
                      {f.highlights.map((h, j) => (
                        <span key={j} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105"
                          style={{ background: `${f.color}12`, color: f.color, border: `1px solid ${f.color}20` }}>
                          <Check className="w-3 h-3" /> {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 grid-bg radial-mask pointer-events-none opacity-30" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#1AA19C]/5 rounded-full blur-[120px] breathe" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div ref={howHeaderRef} className="reveal text-center mb-14 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-[#2EC4BE] mb-4 bg-[#2EC4BE]/5 border border-[#2EC4BE]/10">
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
                    className={`reveal delay-${i + 1} gradient-border rounded-2xl p-6 sm:p-8 flex items-start gap-5 sm:gap-7 card-hover relative`}>
                    <div className="relative shrink-0">
                      <div className="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] rounded-2xl bg-gradient-to-br from-[#1AA19C] to-[#2EC4BE] flex items-center justify-center shadow-lg shadow-[#1AA19C]/20">
                        <StepIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-[#0a0c10] border-2 border-[#2EC4BE]">
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
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#1AA19C]/4 rounded-full blur-[150px] breathe-slow" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div ref={pricingHeaderRef} className="reveal text-center mb-14 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-[#2EC4BE] mb-4 bg-[#2EC4BE]/5 border border-[#2EC4BE]/10">
              <CreditCard className="w-3.5 h-3.5" /> Árazás
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white">
              Egyszerű, átlátható árazás
            </h2>
            <p className="mt-4 text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
              Próbáld ki ingyen, majd válaszd a neked megfelelő csomagot.
            </p>
          </div>

          <div ref={pricingCard1Ref} className="reveal-scale max-w-lg mx-auto relative gradient-border rounded-2xl p-8 sm:p-10 card-hover">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#1AA19C] to-[#2EC4BE] text-xs font-bold text-white shadow-lg shadow-[#1AA19C]/30">
              30 napos ingyenes próba
            </div>
            <div className="flex items-baseline gap-1.5 mb-2 mt-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-white">3 090</span>
              <span className="text-lg text-gray-400 font-medium">Ft / hó</span>
            </div>
            <p className="text-gray-500 text-sm mb-8">Korlátlan hozzáférés minden funkcióhoz</p>
            <ul className="space-y-3 mb-8">
              {[
                'Korlátlan email küldés & fogadás',
                'IMAP szinkronizálás',
                'OAuth2 (Gmail & Outlook)',
                'Kapcsolatkezelés (CRM)',
                'Árajánlat készítés & PDF generálás',
                'Tömeges email küldés',
                'Email sablonok kezelése',
                'Kétlépcsős hitelesítés (MFA)',
                'Céges márkaépítés (logó, cégadatok)',
                'API hozzáférés',
                'Prioritásos támogatás',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-[#2EC4BE] shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/register')}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-[#1AA19C] to-[#1AA19C] hover:to-[#2EC4BE] transition-all shadow-lg shadow-[#1AA19C]/20 hover:shadow-[#1AA19C]/30">
              Ingyenes Próba Indítása <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">30 napig ingyenes · Nincs bankkártya szükséges · Bármikor lemondható</p>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 sm:py-28 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1AA19C]/6 rounded-full blur-[150px] breathe" />
        </div>
        <Particles />
        <div ref={ctaRef} className="reveal-scale max-w-3xl mx-auto text-center relative z-10">
          <div className="gradient-border rounded-3xl p-10 sm:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1AA19C]/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-[#1AA19C]/10 flex items-center justify-center mx-auto mb-6 float">
                <Send className="w-8 h-8 text-[#2EC4BE]" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4">
                Készen állsz az indulásra?
              </h2>
              <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-lg mx-auto">
                Próbáld ki 30 napig teljesen ingyen. Nincs rejtett költség, nincs kötelezettség.
              </p>
              <button onClick={() => navigate('/register')}
                className="px-10 py-4 rounded-xl text-white font-bold text-base flex items-center gap-2.5 mx-auto bg-gradient-to-r from-[#1AA19C] to-[#1AA19C] hover:to-[#2EC4BE] transition-all shadow-lg shadow-[#1AA19C]/25 hover:shadow-[#1AA19C]/40 hover:-translate-y-0.5">
                Ingyenes Próba Indítása <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DESKTOP APP ═══ */}
      <section className="py-16 sm:py-20 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-border rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8 card-hover relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#1AA19C]/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#1AA19C]/20 to-[#2EC4BE]/10 flex items-center justify-center shrink-0 relative">
              <Monitor className="w-10 h-10 sm:w-12 sm:h-12 text-[#2EC4BE]" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center bg-[#0a0c10]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#0078D4]" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                </svg>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Windows Asztali Alkalmazás</h3>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-5">
                Töltsd le a Pultify asztali alkalmazást Windows-ra. Gyors hozzáférés közvetlenül az asztalodról, értesítésekkel és rendszertálca támogatással.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a href="/downloads/Pultify-Setup.zip" download
                  className="px-6 py-3 rounded-xl text-white text-sm font-semibold flex items-center gap-2.5 w-full sm:w-auto justify-center bg-gradient-to-r from-[#1AA19C] to-[#1AA19C] hover:to-[#2EC4BE] transition-all shadow-lg shadow-[#1AA19C]/20">
                  <Download className="w-4 h-4" />
                  Letöltés Windows-ra (.zip)
                </a>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#2EC4BE]" /> Windows 10+</span>
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#2EC4BE]" /> ~110 MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CONTACT ═══ */}
      <section id="contact" className="py-16 sm:py-20 px-4">
        <div ref={contactRef} className="reveal max-w-4xl mx-auto">
          <div className="gradient-border rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-start gap-8 sm:gap-12 card-hover">
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
            <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-5 sm:p-6 w-full md:w-auto md:min-w-[240px]">
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
