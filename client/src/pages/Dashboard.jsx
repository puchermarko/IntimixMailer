// Fő dashboard nézet - az oldalsáv és a tartalom itt van összerakva
import { useState } from 'react'
import { useAuth } from '../App'
import Sidebar from '../components/Sidebar'
import MailView from '../components/MailView'
import TemplateGallery from '../components/TemplateGallery'
import Settings from '../components/Settings'
import Contacts from '../components/Contacts'

export default function Dashboard() {
  const [activeView, setActiveView] = useState('mail')

  const views = {
    mail: <MailView />,
    contacts: <Contacts />,
    templates: <TemplateGallery />,
    settings: <Settings />,
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto fade-in" key={activeView}>
          {views[activeView]}
        </div>
      </main>
    </div>
  )
}
