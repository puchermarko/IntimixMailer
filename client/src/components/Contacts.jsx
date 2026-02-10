// Kapcsolatok kezelése - itt hozol létre, szerkesztesz, törölsz kontaktokat
import { useState, useEffect } from 'react'
import { getContacts, createContact, updateContact, deleteContact } from '../lib/api'
import ContactDetail from './ContactDetail'
import toast from 'react-hot-toast'
import {
  Plus, Search, User, Mail, Phone, Trash2, Edit3, X,
  Loader2, BookOpen, Paperclip, ChevronRight, MapPin, Building2
} from 'lucide-react'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '', company: '', vat_id: '', street: '', street_number: '', city: '', zip: '', country: '', region: '' })
  const [saving, setSaving] = useState(false)

  const fetchContacts = async () => {
    try {
      const data = await getContacts()
      setContacts(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchContacts() }, [])

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )

  const openCreate = () => {
    setEditingContact(null)
    setForm({ name: '', email: '', phone: '', notes: '', company: '', vat_id: '', street: '', street_number: '', city: '', zip: '', country: '', region: '' })
    setShowForm(true)
  }

  const openEdit = (contact) => {
    setEditingContact(contact)
    setForm({ name: contact.name, email: contact.email, phone: contact.phone || '', notes: contact.notes || '', company: contact.company || '', vat_id: contact.vat_id || '', street: contact.street || '', street_number: contact.street_number || '', city: contact.city || '', zip: contact.zip || '', country: contact.country || '', region: contact.region || '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('A név és email kötelező')
      return
    }
    setSaving(true)
    try {
      if (editingContact) {
        await updateContact(editingContact.id, form)
        toast.success('Kapcsolat frissítve')
      } else {
        await createContact(form)
        toast.success('Kapcsolat létrehozva')
      }
      setShowForm(false)
      setForm({ name: '', email: '', phone: '', notes: '', company: '', vat_id: '', street: '', street_number: '', city: '', zip: '', country: '', region: '' })
      setEditingContact(null)
      await fetchContacts()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Törlöd "${name}" kapcsolatot? Az email előzményei és csatolmányai is törlődnek.`)) return
    try {
      await deleteContact(id)
      toast.success('Kapcsolat törölve')
      if (selectedContactId === id) setSelectedContactId(null)
      await fetchContacts()
    } catch (err) {
      toast.error('Hiba történt a kapcsolat törlése közben')
    }
  }

  // Ha ki van választva egy kapcsolat, részletes nézet
  if (selectedContactId) {
    return (
      <ContactDetail
        contactId={selectedContactId}
        onBack={() => { setSelectedContactId(null); fetchContacts() }}
        onEdit={(contact) => { setSelectedContactId(null); openEdit(contact) }}
      />
    )
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Kapcsolatok</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Vásárlói kapcsolatok kezelése</p>
        </div>
        <button onClick={openCreate} className="btn-primary px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" />
          Új kapcsolat
        </button>
      </div>

      {/* Keresés */}
      <div className="glass rounded-xl p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keresés név, email vagy telefon alapján..."
            className="input-field w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Kapcsolat lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#1AA19C] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">
            {search ? 'Nincs találat a keresésre' : 'Még nincs kapcsolat. Hozd létre az elsőt!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(contact => (
            <div
              key={contact.id}
              className="glass rounded-xl p-4 flex items-center justify-between hover:border-[#1AA19C]/20 transition-all cursor-pointer group"
              onClick={() => setSelectedContactId(contact.id)}
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1AA19C]/15 flex items-center justify-center text-[#2EC4BE] text-xs sm:text-sm font-bold shrink-0">
                  {contact.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-200 truncate">{contact.name}</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </span>
                    {contact.phone && (
                      <span className="text-xs text-gray-500 items-center gap-1 hidden sm:flex">
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-4 shrink-0">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {contact.email_count} küldött
                  </span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {contact.received_count || 0} fogadott
                  </span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {contact.attachment_count} fájl
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 sm:ml-3 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(contact) }}
                  className="p-2 rounded-lg text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(contact.id, contact.name) }}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className="w-4 h-4 text-gray-600 ml-1 hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Létrehozás/Szerkesztés modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="glass glow rounded-2xl p-6 w-full max-w-md fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">
                {editingContact ? 'Kapcsolat szerkesztése' : 'Új kapcsolat'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Név *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Kiss Anna"
                  className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="anna@example.com"
                  className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Telefon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+36 30 123 4567"
                  className="input-field w-full px-4 py-2.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Megjegyzések</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcionális megjegyzések a kapcsolatról..."
                  className="input-field w-full px-4 py-2.5 rounded-lg text-sm min-h-[80px] resize-y"
                />
              </div>

              {/* Cím adatok */}
              <div className="pt-3 border-t border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><MapPin className="w-3 h-3" /> Cím és cégadatok (opcionális)</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                      placeholder="Cégnév" className="input-field px-3 py-2 rounded-lg text-sm" />
                    <input type="text" value={form.vat_id} onChange={(e) => setForm(f => ({ ...f, vat_id: e.target.value }))}
                      placeholder="Adószám" className="input-field px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <input type="text" value={form.street} onChange={(e) => setForm(f => ({ ...f, street: e.target.value }))}
                      placeholder="Utca" className="input-field col-span-3 px-3 py-2 rounded-lg text-sm" />
                    <input type="text" value={form.street_number} onChange={(e) => setForm(f => ({ ...f, street_number: e.target.value }))}
                      placeholder="Hsz." className="input-field px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <input type="text" value={form.zip} onChange={(e) => setForm(f => ({ ...f, zip: e.target.value }))}
                      placeholder="Ir.szám" className="input-field px-3 py-2 rounded-lg text-sm" />
                    <input type="text" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Város" className="input-field px-3 py-2 rounded-lg text-sm" />
                    <input type="text" value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))}
                      placeholder="Megye" className="input-field px-3 py-2 rounded-lg text-sm" />
                    <input type="text" value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
                      placeholder="Ország" className="input-field px-3 py-2 rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 glass-light transition-all"
              >
                Mégse
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.email}
                className="flex-1 btn-primary py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingContact ? 'Frissítés' : 'Létrehozás'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
