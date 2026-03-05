import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Mail, BookUser, FileText, LayoutGrid, Settings, ChevronRight, ChevronLeft,
  X, Inbox, SendHorizontal, PenLine, RefreshCw, Sparkles, Check,
  Zap, Shield, CreditCard, Image
} from 'lucide-react'
import { useUI } from '../App'

const TOUR_STEPS = [
  {
    target: null,
    view: null,
    icon: Sparkles,
    title: 'Üdvözlünk a Pultifyban!',
    description: 'Interaktív bemutató a legfontosabb funkciókról. Végigvezetünk a rendszeren — kattints a „Tovább" gombra!',
    tips: ['A bemutató bármikor kihagyható', 'A Beállításokban újra elindíthatod'],
    position: 'center',
  },
  {
    target: '[data-tour="mail"]',
    view: 'mail',
    icon: Mail,
    title: 'Levelezés',
    description: 'Itt kezelheted az összes email tevékenységedet.',
    tips: [
      'Bejövő levelek — IMAP szinkronizálással',
      'Kimenő levelek — elküldött leveleid',
      'Levél írás — egyedi vagy tömeges küldés',
      'Szinkronizálás gombbal frissítheted a postaládádat',
    ],
    position: 'right',
  },
  {
    target: '[data-tour="contacts"]',
    view: 'contacts',
    icon: BookUser,
    title: 'Kapcsolatok (CRM)',
    description: 'Ügyfeleid és partnereid adatai egy helyen.',
    tips: [
      'Kapcsolatok listája — név, email, telefon',
      'Levelezési előzmények kontaktonként',
      'Új kontakt hozzáadása, szerkesztés, törlés',
    ],
    position: 'right',
  },
  {
    target: '[data-tour="quotes"]',
    view: 'quotes',
    icon: FileText,
    title: 'Árajánlatok',
    description: 'Professzionális árajánlatok készítése és küldése.',
    tips: [
      'PDF generálás automatikus sorszámozással',
      'Azonnali küldés emailben',
      'Tételek, árak és mennyiségek kezelése',
    ],
    position: 'right',
  },
  {
    target: '[data-tour="templates"]',
    view: 'templates',
    icon: LayoutGrid,
    title: 'Sablonok',
    description: 'Email sablonok galériája a gyorsabb munkához.',
    tips: [
      'Előre elkészített email sablonok',
      'Változók használata személyre szabáshoz',
      'Sablon kiválasztása és azonnali használat',
    ],
    position: 'right',
  },
  {
    target: '[data-tour="settings"]',
    view: 'settings',
    icon: Settings,
    title: 'Beállítások',
    description: 'A rendszer teljes konfigurációja egy helyen.',
    tips: [
      'SMTP/IMAP szerver beállítások',
      'Céges logó és márka testreszabás',
      'Előfizetés kezelése',
      'Bemutató újraindítása bármikor',
    ],
    position: 'right',
  },
]

export default function QuickTour({ onComplete, setActiveView, setSidebarOpen }) {
  const { uiMode } = useUI()
  const isModern = uiMode === 'modern'
  const [step, setStep] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState(null)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const rafRef = useRef(null)

  const current = TOUR_STEPS[step]
  const Icon = current.icon
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0

  const finish = useCallback(() => {
    localStorage.setItem('intimix_tour_completed', 'true')
    onComplete()
  }, [onComplete])

  const updateSpotlight = useCallback(() => {
    if (!current.target) {
      setSpotlightRect(null)
      setTooltipStyle({ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      return
    }

    const el = document.querySelector(current.target)
    if (!el) {
      setSpotlightRect(null)
      setTooltipStyle({ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      return
    }

    const rect = el.getBoundingClientRect()
    const pad = 6
    setSpotlightRect({
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    })

    // Position tooltip to the right of the highlighted element
    const tooltipWidth = 380
    const tooltipX = rect.right + 20
    const tooltipY = rect.top - 10

    // Ensure tooltip stays in viewport
    const maxX = window.innerWidth - tooltipWidth - 20
    const maxY = window.innerHeight - 350

    setTooltipStyle({
      position: 'fixed',
      top: `${Math.max(20, Math.min(tooltipY, maxY))}px`,
      left: `${Math.min(tooltipX, maxX)}px`,
      transform: 'none',
    })
  }, [current.target])

  // Navigate to the correct view when step changes
  useEffect(() => {
    if (current.view && setActiveView) {
      setActiveView(current.view)
    }
    // On mobile, ensure sidebar is visible for sidebar-targeted steps
    if (current.target && setSidebarOpen) {
      setSidebarOpen(true)
    }

    // Small delay to let the view render, then position spotlight
    const timer = setTimeout(() => {
      updateSpotlight()
    }, 150)

    return () => clearTimeout(timer)
  }, [step, current.view, current.target, setActiveView, setSidebarOpen, updateSpotlight])

  // Update spotlight position on resize/scroll
  useEffect(() => {
    const handleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateSpotlight)
    }
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)
    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [updateSpotlight])

  const goNext = () => {
    if (isLast) return finish()
    setStep(s => s + 1)
  }

  const goPrev = () => {
    if (!isFirst) setStep(s => s - 1)
  }

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
      {/* Dark overlay with spotlight cutout using CSS clip-path */}
      <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'auto' }} onClick={finish}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#tour-mask)" />
      </svg>

      {/* Spotlight ring glow */}
      {spotlightRect && (
        <div
          className={`fixed rounded-xl border-2 transition-all duration-300 ease-out ${isModern ? 'border-[#2EC4BE]/60 shadow-[0_0_20px_rgba(46,196,190,0.3)]' : 'border-[#1AA19C]/60 shadow-[0_0_20px_rgba(26,161,156,0.3)]'}`}
          style={{
            pointerEvents: 'none',
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="w-[340px] sm:w-[380px] transition-all duration-300 ease-out"
        style={{ ...tooltipStyle, pointerEvents: 'auto', zIndex: 101 }}
        key={step}
      >
        <div className={`rounded-2xl overflow-hidden fade-in ${isModern ? 'modern-card' : 'glass glow'}`}>
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-[#1AA19C] via-[#2EC4BE] to-[#1AA19C]" />

          {/* Close */}
          <button onClick={finish}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all z-10">
            <X className="w-4 h-4" />
          </button>

          <div className="p-6">
            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mb-5">
              {TOUR_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-[#2EC4BE]' : i < step ? 'w-1.5 bg-[#1AA19C]' : 'w-1.5 bg-white/10'
                }`} />
              ))}
            </div>

            {/* Icon + title */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isModern ? 'bg-[#1AA19C]/10' : 'bg-[#1AA19C]/15'}`}>
                <Icon className="w-5 h-5 text-[#2EC4BE]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{current.title}</h3>
                <p className="text-xs text-gray-500">{step + 1} / {TOUR_STEPS.length} lépés</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4 leading-relaxed">{current.description}</p>

            {/* Tips */}
            {current.tips.length > 0 && (
              <div className="space-y-1.5 mb-5">
                {current.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-[#2EC4BE] mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-xs">{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                {!isFirst ? (
                  <button onClick={goPrev}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" /> Vissza
                  </button>
                ) : (
                  <button onClick={finish}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                    Kihagyás
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!isLast && (
                  <button onClick={finish}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                    Kihagyás
                  </button>
                )}

                <button onClick={goNext}
                  className={`btn-primary px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
                  {isLast ? (
                    <><Check className="w-3.5 h-3.5" /> Kezdjünk!</>
                  ) : (
                    <>Tovább <ChevronRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
