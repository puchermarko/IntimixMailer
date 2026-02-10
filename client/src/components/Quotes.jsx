// Árajánlat kezelő - lista, szerkesztő, PDF letöltés, email küldés
import { useState, useEffect } from 'react'
import { getQuotes, getQuote, createQuote, updateQuote, deleteQuote, getQuotePdfUrl, sendQuoteEmail, getContacts } from '../lib/api'
import { useAuth } from '../App'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, FileText, Send, Download, Loader2, ChevronLeft, Search,
  User, Building2, MapPin, Phone, Mail, Hash, Calendar, StickyNote, X, Check
} from 'lucide-react'

const statusLabels = { draft: 'Piszkozat', sent: 'Elküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' }
const statusColors = { draft: 'text-gray-400 bg-gray-500/10', sent: 'text-blue-400 bg-blue-500/10', accepted: 'text-green-400 bg-green-500/10', rejected: 'text-red-400 bg-red-500/10' }

function formatMoney(amount, currency = 'HUF') {
  if (currency === 'HUF') return Math.round(amount).toLocaleString('hu-HU') + ' Ft'
  return amount.toLocaleString('hu-HU', { minimumFractionDigits: 2 }) + ' €'
}

export default function Quotes() {
  const { token } = useAuth()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // list | editor
  const [editingQuote, setEditingQuote] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { loadQuotes() }, [])

  const loadQuotes = async () => {
    setLoading(true)
    try { const data = await getQuotes(); setQuotes(data.quotes || []) }
    catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const handleNew = () => {
    setEditingQuote(null)
    setView('editor')
  }

  const handleEdit = async (id) => {
    try {
      const data = await getQuote(id)
      setEditingQuote(data)
      setView('editor')
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Biztosan törlöd ezt az árajánlatot?')) return
    try { await deleteQuote(id); toast.success('Árajánlat törölve'); loadQuotes() }
    catch (err) { toast.error(err.message) }
  }

  const handleSaved = () => {
    setView('list')
    setEditingQuote(null)
    loadQuotes()
  }

  const filtered = quotes.filter(q =>
    (q.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (q.quote_number || '').toLowerCase().includes(search.toLowerCase())
  )

  if (view === 'editor') {
    return <QuoteEditor quote={editingQuote} onBack={() => { setView('list'); loadQuotes() }} onSaved={handleSaved} token={token} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Árajánlatok</h2>
          <p className="text-sm text-gray-400 mt-1">Árajánlatok kezelése, PDF generálás és küldés</p>
        </div>
        <button onClick={handleNew} className="btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Új árajánlat
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Keresés név vagy szám alapján..." className="input-field w-full pl-10 pr-4 py-2.5 rounded-xl text-sm" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#1AA19C] animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Még nincs árajánlat</p>
          <button onClick={handleNew} className="mt-3 text-sm text-[#1AA19C] hover:text-[#2EC4BE]">Készíts egyet →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(q => (
            <div key={q.id} className="glass rounded-xl p-4 flex items-center gap-4 hover:border-[#1AA19C]/20 transition-all cursor-pointer" onClick={() => handleEdit(q.id)}>
              <div className="w-10 h-10 rounded-xl bg-[#1AA19C]/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#1AA19C]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{q.quote_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[q.status] || statusColors.draft}`}>
                    {statusLabels[q.status] || q.status}
                  </span>
                </div>
                {q.title && <p className="text-xs text-gray-300 truncate">{q.title}</p>}
                <p className="text-xs text-gray-400 truncate">{q.contact_name || 'Nincs megadva'} — {formatMoney(q.total, q.currency)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-[#2EC4BE]">{formatMoney(q.total, q.currency)}</p>
                <p className="text-[10px] text-gray-500">{new Date(q.created_at).toLocaleDateString('hu-HU')}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id) }}
                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Árajánlat szerkesztő ────

function QuoteEditor({ quote, onBack, onSaved, token }) {
  const [contacts, setContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)

  // Form mezők
  const [title, setTitle] = useState(quote?.title || '')
  const [contactId, setContactId] = useState(quote?.contact_id || '')
  const [contactName, setContactName] = useState(quote?.contact_name || '')
  const [contactEmail, setContactEmail] = useState(quote?.contact_email || '')
  const [contactPhone, setContactPhone] = useState(quote?.contact_phone || '')
  const [contactStreet, setContactStreet] = useState('')
  const [contactStreetNumber, setContactStreetNumber] = useState('')
  const [contactZip, setContactZip] = useState('')
  const [contactCity, setContactCity] = useState('')
  const [contactCountry, setContactCountry] = useState('')
  const [contactRegion, setContactRegion] = useState('')
  const [contactVat, setContactVat] = useState(quote?.contact_vat || '')
  const [currency, setCurrency] = useState(quote?.currency || 'HUF')
  const [vatRate, setVatRate] = useState(quote?.vat_rate ?? 27)
  const [notes, setNotes] = useState(quote?.notes || '')
  const [validUntil, setValidUntil] = useState(quote?.valid_until || '')
  const [items, setItems] = useState(quote?.items?.length ? quote.items.map(i => ({ ...i })) : [{ description: '', quantity: 1, unit: 'db', unit_price: 0 }])

  // Parse existing address back into fields on edit
  useEffect(() => {
    if (quote?.contact_address) {
      const parts = quote.contact_address.split(', ')
      if (parts.length >= 1) {
        const streetParts = parts[0].split(' ')
        if (streetParts.length > 1) {
          setContactStreetNumber(streetParts.pop())
          setContactStreet(streetParts.join(' '))
        } else {
          setContactStreet(parts[0])
        }
      }
      if (parts.length >= 2) {
        const zipCity = parts[1].split(' ')
        if (zipCity.length > 1) { setContactZip(zipCity[0]); setContactCity(zipCity.slice(1).join(' ')) }
        else setContactCity(parts[1])
      }
      if (parts.length >= 4) { setContactRegion(parts[2]); setContactCountry(parts[3]) }
      else if (parts.length >= 3) { setContactCountry(parts[2]) }
    }
  }, [])

  useEffect(() => {
    getContacts().then(data => setContacts(Array.isArray(data) ? data : data.contacts || [])).catch(() => {})
  }, [])

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit: 'db', unit_price: 0 }])
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, value) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: value }
    setItems(updated)
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)
  const vatAmount = Math.round(subtotal * vatRate / 100)
  const total = subtotal + vatAmount

  const buildAddress = (street, num, zip, city, region, country) => {
    const streetFull = [street, num].filter(Boolean).join(' ')
    return [streetFull, [zip, city].filter(Boolean).join(' '), region, country].filter(Boolean).join(', ')
  }

  const selectContact = (c) => {
    setContactId(c.id)
    setContactName(c.name)
    setContactEmail(c.email)
    setContactPhone(c.phone || '')
    setContactVat(c.vat_id || '')
    setContactStreet(c.street || '')
    setContactStreetNumber(c.street_number || '')
    setContactZip(c.zip || '')
    setContactCity(c.city || '')
    setContactRegion(c.region || '')
    setContactCountry(c.country || '')
    setShowContactPicker(false)
  }

  const handleSave = async () => {
    if (!items.some(i => i.description)) { toast.error('Legalább egy tétel szükséges'); return }
    setSaving(true)
    try {
      const contact_address = buildAddress(contactStreet, contactStreetNumber, contactZip, contactCity, contactRegion, contactCountry)
      const payload = { title, contact_id: contactId || null, contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone, contact_address, contact_vat: contactVat, currency, vat_rate: vatRate, notes, valid_until: validUntil, items }
      if (quote?.id) {
        await updateQuote(quote.id, payload)
        toast.success('Árajánlat mentve!')
      } else {
        await createQuote(payload)
        toast.success('Árajánlat létrehozva!')
      }
      onSaved()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDownload = async () => {
    if (!quote?.id) { toast.error('Először mentsd el az árajánlatot'); return }
    setDownloading(true)
    try {
      const url = getQuotePdfUrl(quote.id)
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('PDF letöltés sikertelen')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${quote.quote_number}.pdf`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('PDF letöltve!')
    } catch (err) { toast.error(err.message) }
    finally { setDownloading(false) }
  }

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg glass-light hover:bg-white/10 transition-all">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{quote ? `${quote.quote_number} szerkesztése` : 'Új árajánlat'}</h2>
          <p className="text-xs text-gray-500">{quote ? 'Módosítsd a tételeket és mentsd el' : 'Töltsd ki az adatokat és add hozzá a tételeket'}</p>
        </div>
        <div className="flex-1 max-w-xs">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Árajánlat neve (pl. Weboldal fejlesztés)" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          {quote?.id && (
            <>
              <button onClick={handleDownload} disabled={downloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-light text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50">
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
              </button>
              <button onClick={() => setShowSendModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-light text-sm text-[#1AA19C] hover:text-[#2EC4BE] transition-all">
                <Send className="w-4 h-4" /> Küldés
              </button>
            </>
          )}
          <button onClick={handleSave} disabled={saving}
            className="btn-primary px-5 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mentés
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Bal oldal: Vevő adatok */}
        <div className="col-span-1 space-y-4">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><User className="w-4 h-4 text-[#1AA19C]" /> Vevő adatok</h3>
              <button onClick={() => setShowContactPicker(!showContactPicker)}
                className="text-[10px] text-[#1AA19C] hover:text-[#2EC4BE] transition-all">
                {showContactPicker ? 'Bezárás' : 'Kapcsolatból'}
              </button>
            </div>

            {showContactPicker && (
              <div className="mb-4 space-y-2">
                <input type="text" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Keresés..." className="input-field w-full px-3 py-1.5 text-xs rounded-lg" />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredContacts.map(c => (
                    <button key={c.id} onClick={() => selectContact(c)}
                      className="w-full text-left px-3 py-2 rounded-lg glass-light hover:border-[#1AA19C]/20 transition-all">
                      <p className="text-xs text-white font-medium">{c.name}</p>
                      <p className="text-[10px] text-gray-500">{c.email}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div><label className="block text-[10px] text-gray-500 mb-0.5">Név *</label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                  placeholder="Vevő neve" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
              <div><label className="block text-[10px] text-gray-500 mb-0.5">Email</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@example.com" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
              <div><label className="block text-[10px] text-gray-500 mb-0.5">Telefon</label>
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+3630..." className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
              <div><label className="block text-[10px] text-gray-500 mb-0.5">Adószám</label>
                <input type="text" value={contactVat} onChange={(e) => setContactVat(e.target.value)}
                  placeholder="12345678-1-23" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] text-gray-500 mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Cím</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3"><input type="text" value={contactStreet} onChange={(e) => setContactStreet(e.target.value)}
                      placeholder="Utca" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
                    <div><input type="text" value={contactStreetNumber} onChange={(e) => setContactStreetNumber(e.target.value)}
                      placeholder="Hsz." className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><input type="text" value={contactZip} onChange={(e) => setContactZip(e.target.value)}
                      placeholder="Ir.szám" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
                    <div className="col-span-2"><input type="text" value={contactCity} onChange={(e) => setContactCity(e.target.value)}
                      placeholder="Város" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><input type="text" value={contactRegion} onChange={(e) => setContactRegion(e.target.value)}
                      placeholder="Megye" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
                    <div><input type="text" value={contactCountry} onChange={(e) => setContactCountry(e.target.value)}
                      placeholder="Ország" className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Beállítások */}
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Hash className="w-4 h-4 text-[#1AA19C]" /> Beállítások</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[10px] text-gray-500 mb-0.5">Pénznem</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="input-field w-full px-3 py-1.5 text-sm rounded-lg">
                  <option value="HUF">HUF (Ft)</option>
                  <option value="EUR">EUR (€)</option>
                </select></div>
              <div><label className="block text-[10px] text-gray-500 mb-0.5">ÁFA %</label>
                <input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}
                  className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
            </div>
            <div><label className="block text-[10px] text-gray-500 mb-0.5">Érvényesség</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
                className="input-field w-full px-3 py-1.5 text-sm rounded-lg" /></div>
            <div><label className="block text-[10px] text-gray-500 mb-0.5">Megjegyzés</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Fizetési feltételek, egyéb megjegyzések..." rows={3}
                className="input-field w-full px-3 py-1.5 text-sm rounded-lg resize-y" /></div>
          </div>
        </div>

        {/* Jobb oldal: Tételek */}
        <div className="col-span-2">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Tételek</h3>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-[#1AA19C] hover:text-[#2EC4BE] px-2 py-1 rounded-lg hover:bg-[#1AA19C]/10">
                <Plus className="w-3.5 h-3.5" /> Tétel hozzáadása
              </button>
            </div>

            {/* Fejléc */}
            <div className="grid grid-cols-12 gap-2 mb-2 px-1">
              <span className="col-span-5 text-[10px] text-gray-500 uppercase">Megnevezés</span>
              <span className="col-span-1 text-[10px] text-gray-500 uppercase text-right">Menny.</span>
              <span className="col-span-1 text-[10px] text-gray-500 uppercase text-right">Egység</span>
              <span className="col-span-2 text-[10px] text-gray-500 uppercase text-right">Egységár</span>
              <span className="col-span-2 text-[10px] text-gray-500 uppercase text-right">Összeg</span>
              <span className="col-span-1" />
            </div>

            <div className="space-y-2">
              {items.map((item, i) => {
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0)
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                      placeholder="Tétel megnevezése" className="col-span-5 input-field px-2 py-1.5 rounded-lg text-xs" />
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                      min="0" step="0.01" className="col-span-1 input-field px-2 py-1.5 rounded-lg text-xs text-right" />
                    <input type="text" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)}
                      placeholder="db" className="col-span-1 input-field px-2 py-1.5 rounded-lg text-xs text-right" />
                    <input type="number" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                      min="0" step="1" className="col-span-2 input-field px-2 py-1.5 rounded-lg text-xs text-right" />
                    <div className="col-span-2 text-xs text-gray-300 text-right font-mono pr-1">
                      {formatMoney(lineTotal, currency)}
                    </div>
                    <button onClick={() => removeItem(i)} disabled={items.length === 1}
                      className="col-span-1 flex items-center justify-center text-gray-500 hover:text-red-400 disabled:opacity-30">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Összesítés */}
            <div className="mt-6 pt-4 border-t border-white/5">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Nettó összeg</span>
                    <span className="text-gray-200 font-mono">{formatMoney(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">ÁFA ({vatRate}%)</span>
                    <span className="text-gray-200 font-mono">{formatMoney(vatAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-[#1AA19C]/30">
                    <span className="text-[#2EC4BE]">Összesen</span>
                    <span className="text-[#2EC4BE] font-mono">{formatMoney(total, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Küldés modal */}
      {showSendModal && quote?.id && (
        <SendQuoteModal quoteId={quote.id} contactName={contactName} contactEmail={contactEmail}
          quoteNumber={quote.quote_number} total={total} currency={currency}
          onClose={() => setShowSendModal(false)} onSent={() => { setShowSendModal(false); onSaved() }} token={token} />
      )}
    </div>
  )
}

// ─── Email küldés modal ────

function SendQuoteModal({ quoteId, contactName, contactEmail, quoteNumber, total, currency, onClose, onSent, token }) {
  const [sending, setSending] = useState(false)
  const [subject, setSubject] = useState('')
  const [customHtml, setCustomHtml] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const handleSend = async () => {
    if (!contactEmail) { toast.error('Nincs email cím megadva a vevőnél'); return }
    setSending(true)
    try {
      const options = {}
      if (subject) options.subject = subject
      if (useCustom && customHtml) options.html = customHtml
      await sendQuoteEmail(quoteId, options)
      toast.success(`Árajánlat elküldve: ${contactEmail}`)
      onSent()
    } catch (err) { toast.error(err.message) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass glow rounded-2xl p-6 w-full max-w-lg fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Send className="w-5 h-5 text-[#1AA19C]" /> Árajánlat küldése</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <div className="glass-light rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-400">Címzett: <span className="text-white font-medium">{contactName || 'N/A'}</span></p>
            <p className="text-xs text-gray-400">Email: <span className="text-[#2EC4BE]">{contactEmail || 'Nincs megadva!'}</span></p>
            <p className="text-xs text-gray-400">Árajánlat: <span className="text-white">{quoteNumber}</span> — <span className="text-[#2EC4BE] font-semibold">{formatMoney(total, currency)}</span></p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Tárgy (opcionális, alapértelmezett ha üres)</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder={`Árajánlat - ${quoteNumber}`} className="input-field w-full px-3 py-2 text-sm rounded-lg" />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-gray-400 mb-1 cursor-pointer">
              <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)}
                className="rounded border-gray-600" />
              Egyéni email sablon használata
            </label>
            {useCustom && (
              <textarea value={customHtml} onChange={(e) => setCustomHtml(e.target.value)}
                placeholder="<p>Tisztelt Ügyfelünk...</p>" rows={6}
                className="input-field w-full px-3 py-2 text-sm rounded-lg font-mono resize-y mt-1" />
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSend} disabled={sending || !contactEmail}
              className="btn-primary flex-1 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Küldés emailben
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl glass-light text-sm text-gray-400 hover:text-white transition-all">Mégse</button>
          </div>
        </div>
      </div>
    </div>
  )
}
