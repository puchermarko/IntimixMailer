// Na ez itt az oldalsáv, innen navigálsz mindenhova
import { useAuth, useBranding } from '../App'
import {
  Mail, LayoutGrid, Settings, LogOut, BookUser, FileText, Menu, X, Users, Globe
} from 'lucide-react'

const baseNavItems = [
  { id: 'mail', label: 'Levelezés', icon: Mail },
  { id: 'contacts', label: 'Kapcsolatok', icon: BookUser },
  { id: 'quotes', label: 'Árajánlatok', icon: FileText },
  { id: 'templates', label: 'Sablonok', icon: LayoutGrid },
  { id: 'settings', label: 'Beállítások', icon: Settings },
]

const adminNavItems = [
  { id: 'users', label: 'Felhasználók', icon: Users },
  { id: 'global-settings', label: 'Globális Beállítások', icon: Globe },
]

export default function Sidebar({ activeView, setActiveView, isOpen, setIsOpen }) {
  const { logout, email, isAdmin, impersonating } = useAuth()
  const { app_name, app_subtitle, app_logo } = useBranding()

  const handleNav = (id) => {
    setActiveView(id)
    setIsOpen(false)
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 glass z-30 flex items-center px-4 gap-3">
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-all">
          {isOpen ? <X className="w-5 h-5 text-gray-300" /> : <Menu className="w-5 h-5 text-gray-300" />}
        </button>
        <img src={app_logo} alt={app_name} className="h-6" />
        <div className="h-4 w-px bg-white/10" />
        <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">{app_subtitle}</p>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 glass flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logó meg a brand */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <img
              src={app_logo}
              alt={app_name}
              className="h-8"
            />
            <div className="h-5 w-px bg-white/10" />
            <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">{app_subtitle}</p>
          </div>
        </div>

        {/* Navigáció */}
        <nav className="flex-1 p-4 space-y-1">
          {(isAdmin && !impersonating ? [...adminNavItems, ...baseNavItems] : baseNavItems).map(item => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                data-tour={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Felhasználó rész alul */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#1AA19C] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-300 truncate">{email}</p>
              <p className="text-[10px] text-gray-500">{isAdmin ? 'Admin' : 'Felhasználó'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Kijelentkezés
          </button>
        </div>
      </aside>
    </>
  )
}
