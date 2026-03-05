// Fő app komponens - autentikáció kontextus és routing itt van
import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getBranding, getSiteConfig } from './lib/api'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Impressum from './pages/Impressum'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import './App.css'

const AuthContext = createContext(null)
const BrandingContext = createContext(null)
const UIContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function useBranding() {
  return useContext(BrandingContext)
}

export function useUI() {
  return useContext(UIContext)
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('intimix_token'))
  const [email, setEmail] = useState(() => localStorage.getItem('intimix_email'))
  const [role, setRole] = useState(() => localStorage.getItem('intimix_role'))
  const [name, setName] = useState(() => localStorage.getItem('intimix_name'))
  const [subscriptionStatus, setSubscriptionStatus] = useState(() => localStorage.getItem('intimix_sub_status') || 'none')
  const [setupCompleted, setSetupCompleted] = useState(() => localStorage.getItem('intimix_setup_completed') === 'true')
  const [impersonating, setImpersonating] = useState(() => {
    const t = localStorage.getItem('intimix_token')
    if (!t) return null
    try { const p = JSON.parse(atob(t.split('.')[1])); return p.impersonating ? { id: p.impersonating, name: p.impersonatingName, email: p.impersonatingEmail } : null } catch { return null }
  })
  
  // UI Mode State
  const [uiMode, setUiMode] = useState(() => localStorage.getItem('intimix_ui_mode') || 'legacy')

  const toggleUiMode = (mode) => {
    const newMode = mode || (uiMode === 'legacy' ? 'modern' : 'legacy')
    setUiMode(newMode)
    localStorage.setItem('intimix_ui_mode', newMode)
    // Add/remove class from body for global styling if needed
    if (newMode === 'modern') {
      document.body.classList.add('ui-modern')
    } else {
      document.body.classList.remove('ui-modern')
    }
  }

  useEffect(() => {
    // Initialize body class
    if (uiMode === 'modern') {
      document.body.classList.add('ui-modern')
    }
  }, [])

  const login = (newToken, userEmail, userRole, userName, subStatus, setupDone) => {
    localStorage.setItem('intimix_token', newToken)
    localStorage.setItem('intimix_email', userEmail)
    localStorage.setItem('intimix_role', userRole || 'user')
    localStorage.setItem('intimix_name', userName || '')
    localStorage.setItem('intimix_sub_status', subStatus || (userRole === 'admin' ? 'active' : 'none'))
    localStorage.setItem('intimix_setup_completed', setupDone === true || setupDone === 'true' || userRole === 'admin' ? 'true' : 'false')
    setToken(newToken)
    setEmail(userEmail)
    setRole(userRole || 'user')
    setName(userName || '')
    setSubscriptionStatus(subStatus || (userRole === 'admin' ? 'active' : 'none'))
    setSetupCompleted(setupDone === true || setupDone === 'true' || userRole === 'admin')
    setImpersonating(null)
  }

  const startImpersonation = (newToken, user) => {
    localStorage.setItem('intimix_impersonate_backup', token)
    localStorage.setItem('intimix_token', newToken)
    setToken(newToken)
    setImpersonating(user)
  }

  const stopImpersonation = () => {
    const backup = localStorage.getItem('intimix_impersonate_backup')
    if (backup) {
      localStorage.setItem('intimix_token', backup)
      localStorage.removeItem('intimix_impersonate_backup')
      setToken(backup)
    }
    setImpersonating(null)
  }

  const logout = () => {
    localStorage.removeItem('intimix_token')
    localStorage.removeItem('intimix_email')
    localStorage.removeItem('intimix_role')
    localStorage.removeItem('intimix_name')
    localStorage.removeItem('intimix_impersonate_backup')
    localStorage.removeItem('intimix_sub_status')
    localStorage.removeItem('intimix_setup_completed')
    setToken(null)
    setEmail(null)
    setRole(null)
    setName(null)
    setSubscriptionStatus('none')
    setSetupCompleted(false)
    setImpersonating(null)
  }

  const isAuthenticated = !!token
  const isAdmin = role === 'admin'
  const hasSubscription = isAdmin || subscriptionStatus === 'active' || subscriptionStatus === 'trial'

  const [branding, setBranding] = useState({ app_name: 'Mailer', app_subtitle: '', app_logo: '/logo-header.png' })
  const [siteConfig, setSiteConfig] = useState({ landing_page_enabled: true, registration_enabled: true })
  const [siteConfigLoaded, setSiteConfigLoaded] = useState(false)

  const refreshBranding = async () => {
    try { setBranding(await getBranding()) } catch {}
  }

  useEffect(() => {
    getSiteConfig().then(cfg => { setSiteConfig(cfg); setSiteConfigLoaded(true) }).catch(() => setSiteConfigLoaded(true))
  }, [])

  useEffect(() => { if (isAuthenticated) refreshBranding() }, [token])

  return (
    <UIContext.Provider value={{ uiMode, toggleUiMode }}>
      <BrandingContext.Provider value={{ ...branding, refreshBranding }}>
        <AuthContext.Provider value={{ token, email, role, name, isAdmin, impersonating, login, logout, isAuthenticated, startImpersonation, stopImpersonation, hasSubscription, subscriptionStatus, setSubscriptionStatus, setupCompleted, setSetupCompleted }}>
          <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login registrationEnabled={siteConfig.registration_enabled} />} />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/dashboard" /> :
            !siteConfig.registration_enabled ? <Navigate to="/login" /> :
            <Register />
          } />
          <Route path="/dashboard/*" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/impressum" element={siteConfig.landing_page_enabled ? <Impressum /> : <Navigate to="/login" />} />
          <Route path="/adatvedelem" element={siteConfig.landing_page_enabled ? <Privacy /> : <Navigate to="/login" />} />
          <Route path="/aszf" element={siteConfig.landing_page_enabled ? <Terms /> : <Navigate to="/login" />} />
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/dashboard" /> :
            !siteConfig.landing_page_enabled ? <Navigate to="/login" /> :
            <Landing />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthContext.Provider>
    </BrandingContext.Provider>
    </UIContext.Provider>
  )
}

export default App
