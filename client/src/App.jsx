// Fő app komponens - autentikáció kontextus és routing itt van
import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getBranding } from './lib/api'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import './App.css'

const AuthContext = createContext(null)
const BrandingContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function useBranding() {
  return useContext(BrandingContext)
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('intimix_token'))
  const [email, setEmail] = useState(() => localStorage.getItem('intimix_email'))
  const [role, setRole] = useState(() => localStorage.getItem('intimix_role'))
  const [name, setName] = useState(() => localStorage.getItem('intimix_name'))
  const [subscriptionStatus, setSubscriptionStatus] = useState(() => localStorage.getItem('intimix_sub_status') || 'none')
  const [impersonating, setImpersonating] = useState(() => {
    const t = localStorage.getItem('intimix_token')
    if (!t) return null
    try { const p = JSON.parse(atob(t.split('.')[1])); return p.impersonating ? { id: p.impersonating, name: p.impersonatingName, email: p.impersonatingEmail } : null } catch { return null }
  })

  const login = (newToken, userEmail, userRole, userName, subStatus) => {
    localStorage.setItem('intimix_token', newToken)
    localStorage.setItem('intimix_email', userEmail)
    localStorage.setItem('intimix_role', userRole || 'user')
    localStorage.setItem('intimix_name', userName || '')
    localStorage.setItem('intimix_sub_status', subStatus || (userRole === 'admin' ? 'active' : 'none'))
    setToken(newToken)
    setEmail(userEmail)
    setRole(userRole || 'user')
    setName(userName || '')
    setSubscriptionStatus(subStatus || (userRole === 'admin' ? 'active' : 'none'))
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
    setToken(null)
    setEmail(null)
    setRole(null)
    setName(null)
    setSubscriptionStatus('none')
    setImpersonating(null)
  }

  const isAuthenticated = !!token
  const isAdmin = role === 'admin'
  const hasSubscription = isAdmin || subscriptionStatus === 'active' || subscriptionStatus === 'trial'

  const [branding, setBranding] = useState({ app_name: 'Mailer', app_subtitle: '', app_logo: '/logo-header.png' })

  const refreshBranding = async () => {
    try { setBranding(await getBranding()) } catch {}
  }

  useEffect(() => { if (isAuthenticated) refreshBranding() }, [token])

  return (
    <BrandingContext.Provider value={{ ...branding, refreshBranding }}>
      <AuthContext.Provider value={{ token, email, role, name, isAdmin, impersonating, login, logout, isAuthenticated, startImpersonation, stopImpersonation, hasSubscription, subscriptionStatus, setSubscriptionStatus }}>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/dashboard/*" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthContext.Provider>
    </BrandingContext.Provider>
  )
}

export default App
