import { useState } from 'react'
import { testSmtp } from '../lib/api'
import toast from 'react-hot-toast'
import { Server, CheckCircle, XCircle, Loader2, Shield, Info } from 'lucide-react'

export default function Settings() {
  const [testing, setTesting] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState(null)

  const handleTestSmtp = async () => {
    setTesting(true)
    setSmtpStatus(null)
    try {
      await testSmtp()
      setSmtpStatus('success')
      toast.success('SMTP connection is working!')
    } catch (err) {
      setSmtpStatus('error')
      toast.error(`SMTP test failed: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Manage your email server configuration</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* SMTP Configuration */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-[#1AA19C]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">SMTP Server</h3>
              <p className="text-xs text-gray-500">Mail server connection details</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
              <span className="text-xs text-gray-400">Host</span>
              <span className="text-sm text-gray-200 font-mono">mail.intimix.hu</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
              <span className="text-xs text-gray-400">Port</span>
              <span className="text-sm text-gray-200 font-mono">465 (SSL)</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
              <span className="text-xs text-gray-400">Username</span>
              <span className="text-sm text-gray-200 font-mono">info@intimix.hu</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
              <span className="text-xs text-gray-400">Encryption</span>
              <span className="text-sm text-gray-200">TLS/SSL</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg glass-light">
              <span className="text-xs text-gray-400">From Name</span>
              <span className="text-sm text-gray-200">Intimix Shop</span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleTestSmtp}
              disabled={testing}
              className="btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
            {smtpStatus === 'success' && (
              <div className="flex items-center gap-1.5 text-green-400 text-sm fade-in">
                <CheckCircle className="w-4 h-4" />
                Connected
              </div>
            )}
            {smtpStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-red-400 text-sm fade-in">
                <XCircle className="w-4 h-4" />
                Connection failed
              </div>
            )}
          </div>
        </div>

        {/* Security info */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Security</h3>
              <p className="text-xs text-gray-500">Your credentials are stored securely</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <p>SMTP credentials are stored in server-side environment variables only</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <p>Authentication uses JWT tokens with 24-hour expiry</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <p>All SMTP connections use TLS/SSL encryption</p>
            </div>
          </div>
        </div>

        {/* Template variables reference */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Template Variables</h3>
              <p className="text-xs text-gray-500">Available placeholders for email personalization</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { var: '{{name}}', desc: 'Recipient\'s full name' },
              { var: '{{email}}', desc: 'Recipient\'s email address' },
              { var: '{{order_id}}', desc: 'Order identification number' },
              { var: '{{tracking_number}}', desc: 'Shipping tracking number' },
              { var: '{{tracking_url}}', desc: 'Tracking page URL (e.g. FoxPost link)' },
              { var: '{{delivery_time}}', desc: 'Delivery time window (e.g. 11:00-14:00)' },
              { var: '{{delivery_phone}}', desc: 'Courier phone number' },
            ].map(item => (
              <div key={item.var} className="flex items-center justify-between px-4 py-2.5 rounded-lg glass-light">
                <code className="text-xs text-[#2EC4BE] font-mono">{item.var}</code>
                <span className="text-xs text-gray-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
