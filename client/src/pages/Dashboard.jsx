// Fő dashboard nézet - az oldalsáv és a tartalom itt van összerakva
import { useState } from 'react'
import { useAuth } from '../App'
import Sidebar from '../components/Sidebar'
import MailView from '../components/MailView'
import TemplateGallery from '../components/TemplateGallery'
import Settings from '../components/Settings'
import Contacts from '../components/Contacts'
import Quotes from '../components/Quotes'
import UserManagement from '../components/UserManagement'
import SetupWizard from '../components/SetupWizard'
import QuickTour from '../components/QuickTour'
import { Eye, X } from 'lucide-react'

export default function Dashboard() {
  const { isAdmin, impersonating, stopImpersonation, setupCompleted, setSetupCompleted } = useAuth()
  const [activeView, setActiveView] = useState(isAdmin && !impersonating ? 'users' : 'mail')
  const [showWizard, setShowWizard] = useState(!isAdmin && !setupCompleted)
  const [showTour, setShowTour] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const startTour = () => setShowTour(true)

  const views = {
    mail: <MailView />,
    contacts: <Contacts />,
    quotes: <Quotes />,
    templates: <TemplateGallery />,
    settings: <Settings onStartTour={startTour} />,
    users: <UserManagement />,
  }

  if (showWizard) {
    return <SetupWizard onComplete={() => {
      setShowWizard(false)
      if (localStorage.getItem('intimix_tour_completed') !== 'true') {
        setShowTour(true)
      }
    }} />
  }

  return (
    <div className="min-h-screen">
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
      {showTour && <QuickTour onComplete={() => setShowTour(false)} />}
      <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className={`lg:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 min-h-screen ${impersonating ? 'mt-10' : ''}`}>
        <div className="max-w-5xl mx-auto fade-in" key={activeView}>
          {views[activeView]}
        </div>
      </main>
    </div>
  )
}
