import { useState, useEffect } from 'react'
import { getAnalytics } from '../lib/api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Loader2, Send, Inbox, BookUser, FileText, TrendingUp, TrendingDown, Minus,
  BarChart3, Users, ArrowUpRight, Download, FileSpreadsheet, ThumbsUp, ThumbsDown
} from 'lucide-react'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)

  useEffect(() => {
    setLoading(true)
    getAnalytics(range)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-[#1AA19C] animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        Nem sikerült betölteni az analitikát.
      </div>
    )
  }

  const { timeline, topContacts, summary } = data

  const weekTrend = (current, previous) => {
    if (previous === 0 && current === 0) return { icon: Minus, color: 'text-gray-500', text: 'Nincs változás' }
    if (previous === 0) return { icon: TrendingUp, color: 'text-green-400', text: `+${current} ebben az időszakban` }
    const pct = Math.round(((current - previous) / previous) * 100)
    if (pct > 0) return { icon: TrendingUp, color: 'text-green-400', text: `+${pct}% az előző időszakhoz képest` }
    if (pct < 0) return { icon: TrendingDown, color: 'text-red-400', text: `${pct}% az előző időszakhoz képest` }
    return { icon: Minus, color: 'text-gray-500', text: 'Nincs változás' }
  }

  const sentTrend = weekTrend(summary.sentThisHalf, summary.sentLastHalf)
  const receivedTrend = weekTrend(summary.receivedThisHalf, summary.receivedLastHalf)

  const formatDay = (day) => {
    const d = new Date(day + 'T00:00:00')
    return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass rounded-lg px-3 py-2 text-xs border border-white/10 shadow-xl">
        <p className="text-gray-400 mb-1">{formatDay(label)}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }

  const statCards = [
    { label: 'Küldött', value: summary.totalSent, icon: Send, color: 'bg-[#1AA19C]/10', iconColor: 'text-[#2EC4BE]', trend: sentTrend },
    { label: 'Fogadott', value: summary.totalReceived, icon: Inbox, color: 'bg-blue-500/10', iconColor: 'text-blue-400', trend: receivedTrend },
    { label: 'Kapcsolatok', value: summary.totalContacts, icon: BookUser, color: 'bg-purple-500/10', iconColor: 'text-purple-400' },
    { label: 'Árajánlatok', value: summary.totalQuotes, icon: FileText, color: 'bg-amber-500/10', iconColor: 'text-amber-400' },
    { label: 'Elfogadva', value: summary.acceptedQuotes, icon: ThumbsUp, color: 'bg-green-500/10', iconColor: 'text-green-400' },
    { label: 'Elutasítva', value: summary.rejectedQuotes, icon: ThumbsDown, color: 'bg-red-500/10', iconColor: 'text-red-400' },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Analitika</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Levelezési statisztikák és trendek</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const token = localStorage.getItem('intimix_token')
            fetch(`/api/analytics/export/csv?days=${range}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.blob()).then(blob => {
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                a.download = `analitika-${range}nap.csv`; a.click(); URL.revokeObjectURL(a.href)
              })
          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-light text-xs text-gray-300 hover:text-white transition-all" title="CSV exportálás">
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => {
            const token = localStorage.getItem('intimix_token')
            fetch(`/api/analytics/export/pdf?days=${range}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.blob()).then(blob => {
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                a.download = `analitika-${range}nap.pdf`; a.click(); URL.revokeObjectURL(a.href)
              })
          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-light text-xs text-gray-300 hover:text-white transition-all" title="PDF exportálás">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setRange(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  range === d ? 'bg-[#1AA19C] text-white' : 'text-gray-400 hover:text-gray-200'
                }`}>
                {d}n
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statCards.map(card => {
          const Icon = card.icon
          const TrendIcon = card.trend?.icon
          return (
            <div key={card.label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${card.iconColor}`} />
                </div>
                <span className="text-xs text-gray-400">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{card.value.toLocaleString('hu-HU')}</p>
              {card.trend && (
                <div className={`flex items-center gap-1 mt-2 ${card.trend.color}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="text-[10px]">{card.trend.text}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Response rate */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
            <ArrowUpRight className="w-4.5 h-4.5 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Válaszadási arány</p>
            <p className="text-[10px] text-gray-500">Azon kapcsolatok aránya, akiknek írtál és válaszoltak is</p>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-white">{summary.responseRate}%</span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-[#1AA19C] to-[#2EC4BE] rounded-full transition-all duration-700"
              style={{ width: `${summary.responseRate}%` }} />
          </div>
        </div>
      </div>

      {/* Email timeline chart */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[#1AA19C]/10 flex items-center justify-center">
            <BarChart3 className="w-4.5 h-4.5 text-[#2EC4BE]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Email forgalom</p>
            <p className="text-[10px] text-gray-500">Küldött és fogadott levelek az elmúlt {range} napban</p>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1AA19C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1AA19C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              <Area type="monotone" dataKey="sent" name="Küldött" stroke="#1AA19C" fill="url(#sentGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="received" name="Fogadott" stroke="#3B82F6" fill="url(#recvGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top contacts */}
      {topContacts.length > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Legaktívabb kapcsolatok</p>
              <p className="text-[10px] text-gray-500">Legtöbb email forgalommal rendelkező kapcsolatok</p>
            </div>
          </div>
          <div className="space-y-2">
            {topContacts.map((c, i) => {
              const total = c.sent_count + c.received_count
              const maxTotal = topContacts[0].sent_count + topContacts[0].received_count
              const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0
              return (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg glass-light">
                  <span className="text-xs text-gray-500 w-5 text-right font-mono">{i + 1}.</span>
                  <div className="w-7 h-7 rounded-full bg-[#1AA19C]/20 flex items-center justify-center text-[10px] font-bold text-[#2EC4BE] shrink-0">
                    {(c.name || c.email)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{c.name || c.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#1AA19C] to-purple-500 transition-all duration-500"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] shrink-0">
                        <span className="text-[#2EC4BE]">{c.sent_count} <Send className="w-2.5 h-2.5 inline" /></span>
                        <span className="text-blue-400">{c.received_count} <Inbox className="w-2.5 h-2.5 inline" /></span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
