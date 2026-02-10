// Fő dashboard nézet - az oldalsáv és a tartalom itt van összerakva
import { useState } from 'react'
import { useAuth } from '../App'
import Sidebar from '../components/Sidebar'
import MailView from '../components/MailView'
import TemplateGallery from '../components/TemplateGallery'
import Settings from '../components/Settings'
import Contacts from '../components/Contacts'
import Quotes from '../components/Quotes'

export default function Dashboard() {
  const [activeView, setActiveView] = useState('mail')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const views = {
    mail: <MailView />,
    contacts: <Contacts />,
    quotes: <Quotes />,
    templates: <TemplateGallery />,
    settings: <Settings />,
  }

  return (
    <div className="min-h-screen">
      <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="lg:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="max-w-5xl mx-auto fade-in" key={activeView}>
          {views[activeView]}
        </div>
      </main>
    </div>
  )
}
