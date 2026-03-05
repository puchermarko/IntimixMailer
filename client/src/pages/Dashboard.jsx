// Fő dashboard nézet - az oldalsáv és a tartalom itt van összerakva
import { useState, useEffect } from 'react'
import { useAuth, useUI } from '../App'
import Sidebar from '../components/Sidebar'
import MailView from '../components/MailView'
import EnhancedMailView from '../components/EnhancedMailView'
import TemplateGallery from '../components/TemplateGallery'
import Settings from '../components/Settings'
import Contacts from '../components/Contacts'
import Quotes from '../components/Quotes'
import UserManagement from '../components/UserManagement'
import GlobalSettings from '../components/GlobalSettings'
import Analytics from '../components/Analytics'
import SetupWizard from '../components/SetupWizard'
import QuickTour from '../components/QuickTour'
import { Eye, X } from 'lucide-react'

export default function Dashboard() {
  const { isAdmin, impersonating, stopImpersonation, setupCompleted, setSetupCompleted } = useAuth()
  const { uiMode } = useUI()
  const [activeView, setActiveView] = useState(isAdmin && !impersonating ? 'users' : 'mail')
  const [useEnhancedMail, setUseEnhancedMail] = useState(() => localStorage.getItem('intimix_enhanced_mail') === 'true')
  const [showWizard, setShowWizard] = useState(!isAdmin && !setupCompleted)
  const [showTour, setShowTour] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('intimix_sidebar_collapsed') === 'true')

  const startTour = () => setShowTour(true)

  useEffect(() => {
    localStorage.setItem('intimix_enhanced_mail', useEnhancedMail.toString())
  }, [useEnhancedMail])

  const views = {
    mail: useEnhancedMail ? <EnhancedMailView /> : <MailView />,
    contacts: <Contacts onNavigate={setActiveView} />,
    quotes: <Quotes />,
    templates: <TemplateGallery />,
    analytics: <Analytics />,
    settings: <Settings onStartTour={startTour} enhancedMail={useEnhancedMail} setEnhancedMail={setUseEnhancedMail} />,
    users: <UserManagement />,
    'global-settings': <GlobalSettings />,
  }

  const isModern = uiMode === 'modern'

  if (showWizard) {
    return <SetupWizard onComplete={() => {
      setShowWizard(false)
      if (localStorage.getItem('intimix_tour_completed') !== 'true') {
        setShowTour(true)
      }
    }} />
  }

  return (
    <div className={`min-h-screen ${isModern ? 'bg-[#0f1115]' : ''}`}>
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 backdrop-blur-sm text-black px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
          <Eye className="w-4 h-4" />
          <span>Belépve mint: <strong>{impersonating.name || impersonating.email}</strong></span>
          <button
            onClick={() => { stopImpersonation(); setActiveView('users') }}
            className="ml-2 px-3 py-1 bg-black/20 hover:bg-black/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <X className="w-3 h-3" />
            Kilépés
          </button>
        </div>
      )}
      {showTour && <QuickTour onComplete={() => setShowTour(false)} setActiveView={setActiveView} setSidebarOpen={setSidebarOpen} />}
      <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main className={`pt-16 lg:pt-0 min-h-screen transition-all duration-300 
        ${sidebarCollapsed 
          ? (isModern ? 'lg:ml-[92px]' : 'lg:ml-[68px]') 
          : (isModern ? 'lg:ml-[280px]' : 'lg:ml-64')
        } 
        ${impersonating ? 'mt-10' : ''}
        ${isModern ? 'p-6 lg:p-6' : 'p-4 sm:p-6 lg:p-8'}
      `}>
        <div className={`mx-auto fade-in ${isModern ? 'max-w-[1600px]' : 'max-w-5xl'}`} key={activeView}>
          {views[activeView]}
        </div>
      </main>
    </div>
  )
}
