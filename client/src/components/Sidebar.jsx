import { useAuth } from '../App'
import {
  Mail, Send, LayoutGrid, Settings, LogOut, Users, BookUser
} from 'lucide-react'

const navItems = [
  { id: 'compose', label: 'Compose Email', icon: Mail },
  { id: 'bulk', label: 'Bulk Send', icon: Users },
  { id: 'contacts', label: 'Contacts', icon: BookUser },
  { id: 'templates', label: 'Templates', icon: LayoutGrid },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ activeView, setActiveView }) {
  const { logout, email } = useAuth()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 glass flex flex-col z-20">
      {/* Brand */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img
            src="/logo-header.png"
            alt="Intimix"
            className="h-8"
          />
          <div className="h-5 w-px bg-white/10" />
          <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Mailer</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
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

      {/* User section */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#1AA19C] flex items-center justify-center text-white text-xs font-bold">
            {email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">{email}</p>
            <p className="text-[10px] text-gray-500">Administrator</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
