import { useState } from 'react'
import {
  Mail, BookUser, FileText, LayoutGrid, Settings, ChevronRight, ChevronLeft,
  X, Inbox, SendHorizontal, PenLine, Users, RefreshCw, Sparkles, Check,
  Zap, Shield, CreditCard, Image
} from 'lucide-react'

const TOUR_STEPS = [
  {
    icon: Sparkles,
    title: 'Üdvözlünk az IntimixMailerben!',
    description: 'Rövid bemutató a legfontosabb funkciókról. Bármikor átugorhatod, és a Beállításokban újra elindíthatod.',
    color: '#2EC4BE',
    features: [],
  },
  {
    icon: Mail,
    title: 'Levelezés',
    description: 'A Levelezés fülön kezelheted az összes email tevékenységedet.',
    color: '#2EC4BE',
    features: [
      { icon: Inbox, text: 'Bejövő levelek — IMAP szinkronizálással valós időben' },
      { icon: SendHorizontal, text: 'Kimenő levelek — elküldött leveleid nyomon követése' },
      { icon: PenLine, text: 'Levél írás — egyedi vagy tömeges email küldés sablonokkal' },
      { icon: RefreshCw, text: 'Szinkronizálás — egy kattintással frissítheted a postaládádat' },
    ],
  },
  {
    icon: BookUser,
    title: 'Kapcsolatok (CRM)',
    description: 'Ügyfeleid és partnereid adatait egy helyen kezelheted.',
    color: '#2EC4BE',
    features: [
      { icon: Users, text: 'Kapcsolatok listája — név, email, telefon, megjegyzések' },
      { icon: Mail, text: 'Levelezési előzmények — minden kontakthoz tartozó levelek' },
      { icon: PenLine, text: 'Szerkesztés — kontaktok hozzáadása, módosítása, törlése' },
    ],
  },
  {
    icon: FileText,
    title: 'Árajánlatok',
    description: 'Professzionális árajánlatokat készíthetsz és küldhetsz emailben.',
    color: '#2EC4BE',
    features: [
      { icon: FileText, text: 'PDF generálás — automatikus sorszámozással' },
      { icon: Mail, text: 'Azonnali küldés — árajánlat emailben, egy kattintással' },
      { icon: CreditCard, text: 'Tételek kezelése — termékek, árak, mennyiségek' },
    ],
  },
  {
    icon: LayoutGrid,
    title: 'Sablonok',
    description: 'Email sablonok galériája a gyorsabb munkához.',
    color: '#2EC4BE',
    features: [
      { icon: LayoutGrid, text: 'Sablon galéria — előre elkészített email sablonok' },
      { icon: PenLine, text: 'Testreszabás — változók használata a személyre szabáshoz' },
      { icon: Zap, text: 'Gyors küldés — sablon kiválasztása és azonnali használat' },
    ],
  },
  {
    icon: Settings,
    title: 'Beállítások',
    description: 'A rendszer teljes konfigurációja egy helyen.',
    color: '#2EC4BE',
    features: [
      { icon: Shield, text: 'SMTP/IMAP — levelezőszerver beállítások és tesztelés' },
      { icon: Image, text: 'Márka — céges logó, alkalmazás neve, megjelenés' },
      { icon: CreditCard, text: 'Előfizetés — próbaidőszak és fizetős csomag kezelése' },
      { icon: Sparkles, text: 'Bemutató — a gyors bemutató bármikor újraindítható innen' },
    ],
  },
]

export default function QuickTour({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = TOUR_STEPS[step]
  const Icon = current.icon
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0

  const finish = () => {
    localStorage.setItem('intimix_tour_completed', 'true')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={finish} />

      <div className="relative w-full max-w-lg fade-in" key={step}>
        <div className="glass glow rounded-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-[#1AA19C] via-[#2EC4BE] to-[#1AA19C]" />

          {/* Close / Skip */}
          <button onClick={finish}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all z-10">
            <X className="w-4 h-4" />
          </button>

          <div className="p-7 sm:p-9">
            {/* Step indicator dots */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {TOUR_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-[#2EC4BE]' : i < step ? 'w-1.5 bg-[#1AA19C]' : 'w-1.5 bg-white/10'
                }`} />
              ))}
            </div>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#1AA19C]/15 flex items-center justify-center mx-auto mb-5">
              <Icon className="w-7 h-7 text-[#2EC4BE]" />
            </div>

            {/* Title & description */}
            <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">{current.title}</h2>
            <p className="text-sm text-gray-400 text-center mb-6 max-w-sm mx-auto leading-relaxed">{current.description}</p>

            {/* Feature list */}
            {current.features.length > 0 && (
              <div className="space-y-2.5 mb-6">
                {current.features.map((f, i) => {
                  const FIcon = f.icon
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl glass-light">
                      <FIcon className="w-4 h-4 text-[#2EC4BE] shrink-0" />
                      <span className="text-sm text-gray-300">{f.text}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                {!isFirst ? (
                  <button onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Vissza
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

                {isLast ? (
                  <button onClick={finish}
                    className="btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" /> Kezdjünk!
                  </button>
                ) : (
                  <button onClick={() => setStep(step + 1)}
                    className="btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2">
                    Tovább <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-gray-600 mt-4">
          {step + 1} / {TOUR_STEPS.length}
        </p>
      </div>
    </div>
  )
}
