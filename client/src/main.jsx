import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#272b33',
            color: '#e0e2e7',
            border: '1px solid rgba(26, 161, 156, 0.2)',
          },
          success: { iconTheme: { primary: '#1AA19C', secondary: '#e0e2e7' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#e0e2e7' } },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
