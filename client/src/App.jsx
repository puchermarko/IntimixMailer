// Fő app komponens - autentikáció kontextus és routing itt van
import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './App.css'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('intimix_token'))
  const [email, setEmail] = useState(() => localStorage.getItem('intimix_email'))

  const login = (newToken, userEmail) => {
    localStorage.setItem('intimix_token', newToken)
    localStorage.setItem('intimix_email', userEmail)
    setToken(newToken)
    setEmail(userEmail)
  }

  const logout = () => {
    localStorage.removeItem('intimix_token')
    localStorage.removeItem('intimix_email')
    setToken(null)
    setEmail(null)
  }

  const isAuthenticated = !!token

  return (
    <AuthContext.Provider value={{ token, email, login, logout, isAuthenticated }}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="/*" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default App
