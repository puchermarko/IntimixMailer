// Fő app komponens - autentikáció kontextus és routing itt van
import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getBranding, getSiteConfig, getGlobalSettings, getUserFeatures } from './lib/api'
import toast from 'react-hot-toast'
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
  const [enhancedMailEnabled, setEnhancedMailEnabled] = useState(() => localStorage.getItem('intimix_enhanced_mail') === 'true')
  const [impersonating, setImpersonating] = useState(() => {
    const t = localStorage.getItem('intimix_token')
    if (!t) return null
    try { const p = JSON.parse(atob(t.split('.')[1])); return p.impersonating ? { id: p.impersonating, name: p.impersonatingName, email: p.impersonatingEmail } : null } catch { return null }
  })
  
  // UI Mode State
  const [uiMode, setUiMode] = useState(() => {
    const savedMode = localStorage.getItem('intimix_ui_mode')
    if (savedMode) return savedMode
    // Default to modern UI
    return 'modern'
  })
  const [globalModernUI, setGlobalModernUI] = useState(false)
  const [forceLegacyMailView, setForceLegacyMailView] = useState(false)

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
    // Initialize body class - default to modern
    if (uiMode === 'modern') {
      document.body.classList.add('ui-modern')
    }
  }, [])

  const refreshGlobalSettings = async () => {
    try {
      const settings = await getGlobalSettings()
      const globalEnabled = settings.modern_ui_enabled === 'true'
      setGlobalModernUI(globalEnabled)
      setForceLegacyMailView(settings.force_legacy_mail_view === 'true')
      
      // If user hasn't set a preference, default to modern (not legacy)
      const savedMode = localStorage.getItem('intimix_ui_mode')
      if (!savedMode) {
        const newMode = 'modern' // Always default to modern
        setUiMode(newMode)
        localStorage.setItem('intimix_ui_mode', newMode)
        if (newMode === 'modern') {
          document.body.classList.add('ui-modern')
        } else {
          document.body.classList.remove('ui-modern')
        }
      }
    } catch (error) {
      console.error('Failed to refresh global settings:', error)
    }
  }

  // Handle OAuth2 redirect callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthSuccess = params.get('oauth_success')
    const oauthError = params.get('oauth_error')
    if (oauthSuccess) {
      const providerName = oauthSuccess === 'google' ? 'Google' : oauthSuccess === 'microsoft' ? 'Microsoft' : oauthSuccess
      toast.success(`${providerName} fiók sikeresen csatlakoztatva! Az SMTP beállítások automatikusan frissültek.`)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (oauthError) {
      toast.error(`OAuth2 hiba: ${oauthError}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Fetch global settings and update UI mode if needed
  useEffect(() => {
    const loadGlobalSettings = async () => {
      try {
        const settings = await getGlobalSettings()
        const globalEnabled = settings.modern_ui_enabled === 'true'
        setGlobalModernUI(globalEnabled)
        setForceLegacyMailView(settings.force_legacy_mail_view === 'true')
        
        // If user hasn't set a preference, default to modern
        const savedMode = localStorage.getItem('intimix_ui_mode')
        if (!savedMode) {
          const newMode = 'modern' // Default to modern UI
          setUiMode(newMode)
          localStorage.setItem('intimix_ui_mode', newMode)
          if (newMode === 'modern') {
            document.body.classList.add('ui-modern')
          } else {
            document.body.classList.remove('ui-modern')
          }
        }
      } catch (error) {
        console.error('Failed to load global settings:', error)
      }
    }
    
    loadGlobalSettings()
  }, [])

  // Update UI when global setting changes and user has no preference
  useEffect(() => {
    const savedMode = localStorage.getItem('intimix_ui_mode')
    if (!savedMode) {
      const newMode = 'modern' // Always default to modern
      setUiMode(newMode)
      localStorage.setItem('intimix_ui_mode', newMode)
      if (newMode === 'modern') {
        document.body.classList.add('ui-modern')
      } else {
        document.body.classList.remove('ui-modern')
      }
    }
  }, [globalModernUI])

  const login = (newToken, userEmail, userRole, userName, subStatus, setupDone, enhancedMail) => {
    localStorage.setItem('intimix_token', newToken)
    localStorage.setItem('intimix_email', userEmail)
    localStorage.setItem('intimix_role', userRole || 'user')
    localStorage.setItem('intimix_name', userName || '')
    localStorage.setItem('intimix_sub_status', subStatus || (userRole === 'admin' ? 'active' : 'none'))
    localStorage.setItem('intimix_setup_completed', setupDone === true || setupDone === 'true' || userRole === 'admin' ? 'true' : 'false')
    const isEnhanced = userRole === 'admin' ? true : !!enhancedMail
    localStorage.setItem('intimix_enhanced_mail', isEnhanced ? 'true' : 'false')
    setToken(newToken)
    setEmail(userEmail)
    setRole(userRole || 'user')
    setName(userName || '')
    setSubscriptionStatus(subStatus || (userRole === 'admin' ? 'active' : 'none'))
    setSetupCompleted(setupDone === true || setupDone === 'true' || userRole === 'admin')
    setEnhancedMailEnabled(isEnhanced)
    setImpersonating(null)
  }

  // Fetch user feature flags when token changes (login, impersonation)
  useEffect(() => {
    if (!token) return
    getUserFeatures().then(features => {
      const enabled = features.enhanced_mail_enabled
      setEnhancedMailEnabled(enabled)
      localStorage.setItem('intimix_enhanced_mail', enabled ? 'true' : 'false')
    }).catch(() => {})
  }, [token])

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
    localStorage.removeItem('intimix_enhanced_mail')
    setToken(null)
    setEmail(null)
    setRole(null)
    setName(null)
    setSubscriptionStatus('none')
    setSetupCompleted(false)
    setEnhancedMailEnabled(false)
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
    <UIContext.Provider value={{ uiMode, toggleUiMode, globalModernUI, forceLegacyMailView, refreshGlobalSettings }}>
      <BrandingContext.Provider value={{ ...branding, refreshBranding }}>
        <AuthContext.Provider value={{ token, email, role, name, isAdmin, impersonating, login, logout, isAuthenticated, startImpersonation, stopImpersonation, hasSubscription, subscriptionStatus, setSubscriptionStatus, setupCompleted, setSetupCompleted, enhancedMailEnabled, setEnhancedMailEnabled }}>
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
