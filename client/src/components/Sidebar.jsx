// Na ez itt az oldalsáv, innen navigálsz mindenhova
import { useState } from 'react'
import { useAuth, useBranding } from '../App'
import {
  Mail, LayoutGrid, Settings, LogOut, BookUser, FileText, Menu, X, Users, Globe, BarChart3,
  ChevronsLeft, ChevronsRight
} from 'lucide-react'

const baseNavItems = [
  { id: 'mail', label: 'Levelezés', icon: Mail },
   { id: 'templates', label: 'Sablonok', icon: LayoutGrid },
  { id: 'contacts', label: 'Kapcsolatok', icon: BookUser },
  { id: 'quotes', label: 'Árajánlatok', icon: FileText },
  { id: 'analytics', label: 'Analitika', icon: BarChart3 },
  { id: 'settings', label: 'Beállítások', icon: Settings },
]

const adminNavItems = [
  { id: 'users', label: 'Felhasználók', icon: Users },
  { id: 'global-settings', label: 'Globális Beállítások', icon: Globe },
]

export default function Sidebar({ activeView, setActiveView, isOpen, setIsOpen, collapsed, setCollapsed }) {
  const { logout, email, isAdmin, impersonating } = useAuth()
  const { app_name, app_subtitle, app_logo } = useBranding()

  const handleNav = (id) => {
    setActiveView(id)
    setIsOpen(false)
  }

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('intimix_sidebar_collapsed', next ? 'true' : 'false')
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
      <aside className={`fixed left-0 top-0 bottom-0 glass flex flex-col z-40 transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-64'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logó meg a brand */}
        <div className={`border-b border-white/5 ${collapsed ? 'p-3 flex justify-center' : 'p-5'}`}>
          {collapsed ? (
            <img src={app_logo} alt={app_name} className="h-8" />
          ) : (
            <div className="flex items-center gap-3">
              <img src={app_logo} alt={app_name} className="h-8" />
              <div className="h-5 w-px bg-white/10" />
              <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">{app_subtitle}</p>
            </div>
          )}
        </div>

        {/* Navigáció */}
        <nav className={`flex-1 space-y-1 ${collapsed ? 'p-2' : 'p-4'}`}>
          {(isAdmin && !impersonating ? [...adminNavItems, ...baseNavItems] : baseNavItems).map(item => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                data-tour={item.id}
                onClick={() => handleNav(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl font-medium transition-all duration-200 ${
                  collapsed ? 'justify-center px-2 py-2.5 text-xs' : 'gap-3 px-4 py-2.5 text-sm'
                } ${
                  isActive
                    ? 'bg-[#1AA19C]/15 text-[#2EC4BE] border border-[#1AA19C]/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {!collapsed && item.label}
              </button>
            )
          })}
        </nav>

        {/* Felhasználó rész alul */}
        <div className={`border-t border-white/5 ${collapsed ? 'p-2' : 'p-4'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1AA19C] flex items-center justify-center text-white text-xs font-bold" title={email}>
                {email?.[0]?.toUpperCase() || 'U'}
              </div>
              <button onClick={logout} title="Kijelentkezés"
                className="w-full flex justify-center py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Collapse toggle - desktop only */}
        <button onClick={toggleCollapse}
          className="hidden lg:flex items-center justify-center py-2 border-t border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
          title={collapsed ? 'Kinyitás' : 'Összecsukás'}>
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  )
}
