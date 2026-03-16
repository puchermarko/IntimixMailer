// Sablon galéria - beépített és egyéni sablonok kezelése
import { useState, useEffect, useRef } from 'react'
import { emailTemplates } from '../lib/templates'
import { getCustomTemplates, createTemplate, updateTemplate, deleteTemplate } from '../lib/api'
import { useUI } from '../App'
import { Eye, Code, Copy, Check, Plus, Edit3, Trash2, Save, X, Loader2, Search, Filter, LayoutGrid, List, FolderInput } from 'lucide-react'
import toast from 'react-hot-toast'
import TemplateBuilder from './TemplateBuilder'

export default function TemplateGallery() {
  const { uiMode } = useUI()
  const [customTemplates, setCustomTemplates] = useState([])
  const [previewId, setPreviewId] = useState(null)
  const [previewSource, setPreviewSource] = useState(null) // 'builtin' | 'custom'
  const [viewMode, setViewMode] = useState('preview')
  const [copiedId, setCopiedId] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', category: 'Custom', subject: '', html: '', blocks_json: '' })
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [galleryLayout, setGalleryLayout] = useState('list') // 'list' | 'grid'
  const searchInputRef = useRef(null)

  const isModern = uiMode === 'modern'

  useEffect(() => {
    getCustomTemplates().then(setCustomTemplates).catch(() => {})
  }, [])

  const allTemplates = [
    ...emailTemplates.map(t => ({ ...t, _source: 'builtin' })),
    ...customTemplates.map(t => ({ ...t, _source: 'custom' }))
  ]

  const cloneAsCustom = async (template) => {
    setSaving(true)
    try {
      await createTemplate({
        name: `${template.name} (egyéni)`,
        description: template.description || '',
        category: template.category || 'Custom',
        subject: template.subject || '',
        html: template.html || '',
        blocks_json: template.blocks_json || ''
      })
      toast.success(`"${template.name}" klónozva egyéni sablonként`)
      const updated = await getCustomTemplates()
      setCustomTemplates(updated)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const selectedTemplate = allTemplates.find(t => t.id === previewId && t._source === previewSource)

  const copyHtml = (template) => {
    navigator.clipboard.writeText(template.html)
    setCopiedId(template.id)
    toast.success('HTML másolva a vágólapra')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const previewHtmlFn = (html) => {
    return html
      .replace(/cid:intimix-logo-header/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/nyl/588/ikm/IntimiX2.svg')
      .replace(/cid:intimix-logo-png/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/mwf/5mo/xol/IntimiX.png')
  }

  const sampleHtml = (html) => {
    return previewHtmlFn(html)
      .replace(/\{\{name\}\}/gi, 'Kiss Anna')
      .replace(/\{\{email\}\}/gi, 'anna@example.com')
      .replace(/\{\{order_id\}\}/gi, '10042')
      .replace(/\{\{tracking_number\}\}/gi, 'HU9876543210')
      .replace(/\{\{tracking_url\}\}/gi, 'https://foxpost.hu/csomagkovetes/?code=HU9876543210')
      .replace(/\{\{delivery_time\}\}/gi, '11:00-14:00 között')
      .replace(/\{\{delivery_phone\}\}/gi, '+3630 17 05 865')
  }

  const openNew = () => {
    setEditingId(null)
    setForm({ name: '', description: '', category: 'Custom', subject: '', html: '', blocks_json: '' })
    setShowEditor(true)
  }

  const openEdit = (template) => {
    setEditingId(template.id)
    setForm({ name: template.name, description: template.description || '', category: template.category || 'Custom', subject: template.subject || '', html: template.html || '', blocks_json: template.blocks_json || '' })
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('A sablon neve kötelező')
    setSaving(true)
    try {
      if (editingId) {
        await updateTemplate(editingId, form)
        toast.success('Sablon frissítve')
      } else {
        await createTemplate(form)
        toast.success('Sablon létrehozva')
      }
      const updated = await getCustomTemplates()
      setCustomTemplates(updated)
      setShowEditor(false)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Törlöd ezt a sablont?')) return
    try {
      await deleteTemplate(id)
      toast.success('Sablon törölve')
      const updated = await getCustomTemplates()
      setCustomTemplates(updated)
      if (previewId === id) { setPreviewId(null); setPreviewSource(null) }
    } catch (err) { toast.error(err.message) }
  }

  // ─── Editor Modal ───
  if (showEditor) {
    return (
      <div className={`space-y-6 fade-in ${isModern ? 'max-w-[1600px] mx-auto' : ''}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-2xl font-bold text-white">{editingId ? 'Sablon szerkesztése' : 'Új sablon'}</h2>
          <button onClick={() => setShowEditor(false)} className="text-gray-400 hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>

        {/* Template metadata */}
        <div className={isModern ? 'modern-card p-4 space-y-3' : 'glass rounded-xl p-4 space-y-3'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Név *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Sablon neve" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Leírás</label>
              <input type="text" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Rövid leírás" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kategória</label>
              <input type="text" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Egyéni" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tárgy</label>
              <input type="text" value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Email tárgy sor" className={`input-field w-full px-3 py-2 text-sm ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`} />
            </div>
          </div>
        </div>

        {/* Template Builder */}
        <TemplateBuilder
          key={editingId || 'new'}
          initialHtml={form.html}
          initialBlocks={form.blocks_json ? (() => { try { return JSON.parse(form.blocks_json) } catch { return undefined } })() : undefined}
          onHtmlChange={(html) => setForm(f => ({ ...f, html }))}
          onBlocksChange={(blocks) => setForm(f => ({ ...f, blocks_json: JSON.stringify(blocks) }))}
        />

        {/* Save buttons */}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className={`btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Mentés...' : editingId ? 'Sablon frissítése' : 'Sablon mentése'}
          </button>
          <button onClick={() => setShowEditor(false)} className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-gray-200 text-sm transition-all">Mégse</button>
        </div>
      </div>
    )
  }

  // Collect categories for filtering
  const categories = ['all', ...new Set(allTemplates.map(t => t.category || 'Custom'))]

  // Filter templates by search and category
  const filteredTemplates = allTemplates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || (t.category || 'Custom') === filterCategory
    return matchesSearch && matchesCategory
  })

  // Keyboard navigation for template list
  const handleTemplateKeyDown = (e, template) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setPreviewId(template.id)
      setPreviewSource(template._source)
      setViewMode('preview')
    }
  }

  // ─── Gallery View ───
  return (
    <div className={isModern ? 'max-w-[1600px] mx-auto fade-in' : ''} role="main" aria-label="Email sablon galéria">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white" id="gallery-title">Email sablonok</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">{filteredTemplates.length} / {allTemplates.length} sablon</p>
        </div>
        <button onClick={openNew} aria-label="Új sablon létrehozása"
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1AA19C] hover:bg-[#2EC4BE] text-white text-sm font-medium transition-all w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/50 ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
          <Plus className="w-4 h-4" /> Új sablon
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5 ${isModern ? 'p-3 rounded-2xl bg-white/5' : 'p-3 rounded-xl glass'}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sablon keresése név, leírás vagy tárgy alapján..."
            aria-label="Sablonok keresése"
            className={`input-field w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/30 ${isModern ? 'bg-white/5 border-white/5 focus:bg-white/10' : ''}`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" aria-label="Keresés törlése">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Kategória szűrő">
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)} role="tab" aria-selected={filterCategory === cat}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/30 ${
                  filterCategory === cat
                    ? (isModern ? 'bg-[#2EC4BE] text-black' : 'bg-[#1AA19C] text-white')
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
                {cat === 'all' ? 'Mind' : cat}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5">
            <button onClick={() => setGalleryLayout('list')} aria-label="Lista nézet" aria-pressed={galleryLayout === 'list'}
              className={`p-1.5 rounded transition-all ${galleryLayout === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <List className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setGalleryLayout('grid')} aria-label="Rács nézet" aria-pressed={galleryLayout === 'grid'}
              className={`p-1.5 rounded transition-all ${galleryLayout === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template list */}
        <div className={`${galleryLayout === 'grid' ? '' : ''} max-h-[calc(100vh-280px)] overflow-y-auto pr-1`} role="listbox" aria-labelledby="gallery-title">
          {filteredTemplates.length === 0 ? (
            <div className={`${isModern ? 'modern-card' : 'glass rounded-xl'} p-8 text-center`}>
              <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nincs találat</p>
              <p className="text-xs text-gray-500 mt-1">Próbálj más keresési feltételt</p>
            </div>
          ) : galleryLayout === 'grid' ? (
            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates.map(template => (
                <div key={`${template._source}-${template.id}`} role="option" aria-selected={previewId === template.id && previewSource === template._source}
                  tabIndex={0} onKeyDown={(e) => handleTemplateKeyDown(e, template)}
                  onClick={() => { setPreviewId(template.id); setPreviewSource(template._source); setViewMode('preview') }}
                  className={`${isModern ? 'modern-card p-3' : 'glass rounded-xl p-3'} cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/50 ${
                    previewId === template.id && previewSource === template._source ? (isModern ? 'border-[#2EC4BE]/40 bg-[#2EC4BE]/10' : 'border-[#1AA19C]/40') : 'hover:border-white/10'
                  }`}>
                  <p className="text-xs font-semibold text-gray-200 truncate">{template.name}</p>
                  <span className={`inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${template._source === 'custom' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#2EC4BE]/10 text-[#2EC4BE]'}`}>
                    {template.category || 'Custom'}
                  </span>
                  <div className="flex items-center gap-1 mt-2">
                    {template._source === 'builtin' && (
                      <button onClick={(e) => { e.stopPropagation(); cloneAsCustom(template) }} aria-label={`${template.name} klónozása`}
                        className="p-1 rounded text-gray-500 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10 transition-all" title="Klónozás egyéni sablonként"><FolderInput className="w-3 h-3" /></button>
                    )}
                    {template._source === 'custom' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(template) }} aria-label={`${template.name} szerkesztése`}
                          className="p-1 rounded text-gray-500 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10 transition-all"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(template.id) }} aria-label={`${template.name} törlése`}
                          className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-3 h-3" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredTemplates.map(template => (
                <div key={`${template._source}-${template.id}`} role="option" aria-selected={previewId === template.id && previewSource === template._source}
                  tabIndex={0} onKeyDown={(e) => handleTemplateKeyDown(e, template)}
                  className={`template-card rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/50 ${isModern ? 'hover:bg-white/5 border border-transparent' : ''} ${
                    previewId === template.id && previewSource === template._source ? (isModern ? 'bg-[#2EC4BE]/10 border-[#2EC4BE]/20' : 'selected') : ''
                  }`}>
                  <button onClick={() => { setPreviewId(template.id); setPreviewSource(template._source); setViewMode('preview') }}
                    className="w-full p-3 text-left" aria-label={`${template.name} sablon kiválasztása`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-200 truncate">{template.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        template._source === 'custom'
                          ? (isModern ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20')
                          : (isModern ? 'bg-[#2EC4BE]/10 text-[#2EC4BE]' : 'bg-[#1AA19C]/10 text-[#2EC4BE] border border-[#1AA19C]/20')
                      }`}>
                        {template.category || 'Custom'}
                      </span>
                    </div>
                    {template.description && <p className="text-xs text-gray-500 mt-1 truncate">{template.description}</p>}
                    <p className="text-xs text-gray-600 mt-1 font-mono truncate">{template.subject || '(nincs tárgy)'}</p>
                  </button>
                  <div className="flex items-center gap-1 px-3 pb-2">
                    {template._source === 'builtin' && (
                      <button onClick={() => cloneAsCustom(template)} aria-label={`${template.name} klónozása`}
                        className={`p-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/30 ${isModern ? 'text-gray-400 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10' : 'text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10'}`}
                        title="Klónozás egyéni sablonként">
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {template._source === 'custom' && (
                      <>
                        <button onClick={() => openEdit(template)} aria-label={`${template.name} szerkesztése`}
                          className={`p-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/30 ${isModern ? 'text-gray-400 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10' : 'text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10'}`}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(template.id)} aria-label={`${template.name} törlése`}
                          className={`p-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-400/30 ${isModern ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview area */}
        <div className="lg:col-span-2" role="region" aria-label="Sablon előnézet">
          {selectedTemplate ? (
            <div className={`${isModern ? 'modern-card p-5' : 'glass rounded-xl p-5'} fade-in`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedTemplate.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tárgy: {selectedTemplate.subject || '(egyéni)'}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')} aria-label={viewMode === 'preview' ? 'HTML kód megjelenítése' : 'Előnézet megjelenítése'}
                    className={`flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] px-3 py-1.5 rounded-lg hover:bg-[#1AA19C]/10 transition-all focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/30 ${isModern ? 'bg-[#2EC4BE]/10' : ''}`}>
                    {viewMode === 'preview' ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {viewMode === 'preview' ? 'HTML kód' : 'Előnézet'}
                  </button>
                  <button onClick={() => copyHtml(selectedTemplate)} aria-label="HTML kód másolása vágólapra"
                    className={`flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] px-3 py-1.5 rounded-lg hover:bg-[#1AA19C]/10 transition-all focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/30 ${isModern ? 'bg-[#2EC4BE]/10' : ''}`}>
                    {copiedId === selectedTemplate.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === selectedTemplate.id ? 'Másolva!' : 'HTML másolása'}
                  </button>
                  {selectedTemplate._source === 'builtin' && (
                    <button onClick={() => cloneAsCustom(selectedTemplate)} aria-label="Sablon klónozása"
                      className={`flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] px-3 py-1.5 rounded-lg hover:bg-[#1AA19C]/10 transition-all focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/30 ${isModern ? 'bg-[#2EC4BE]/10' : ''}`}>
                      <FolderInput className="w-3.5 h-3.5" /> Klónozás & Szerkesztés
                    </button>
                  )}
                  {selectedTemplate._source === 'custom' && (
                    <button onClick={() => openEdit(selectedTemplate)} aria-label="Sablon szerkesztése"
                      className={`flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/30 ${isModern ? 'bg-amber-500/10' : ''}`}>
                      <Edit3 className="w-3.5 h-3.5" /> Szerkesztés
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4" role="list" aria-label="Használható változók">
                {['{{name}}', '{{email}}', '{{order_id}}', '{{tracking_number}}', '{{tracking_url}}', '{{delivery_time}}', '{{delivery_phone}}'].map(v => (
                  <button key={v} role="listitem" onClick={() => { navigator.clipboard.writeText(v); toast.success(`${v} másolva`) }}
                    className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 font-mono hover:bg-white/10 hover:text-[#2EC4BE] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2EC4BE]/30"
                    aria-label={`${v} változó másolása`}>
                    {v}
                  </button>
                ))}
              </div>

              {viewMode === 'preview' ? (
                <div className="rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={sampleHtml(selectedTemplate.html)}
                    className="w-full h-[600px] border-0 bg-white rounded-lg"
                    sandbox="allow-same-origin"
                    title={`${selectedTemplate.name} sablon előnézet`}
                  />
                </div>
              ) : (
                <pre className="input-field rounded-lg p-4 text-xs font-mono overflow-auto max-h-[600px] whitespace-pre-wrap" tabIndex={0} aria-label="HTML forráskód">
                  {selectedTemplate.html}
                </pre>
              )}
            </div>
          ) : (
            <div className={`${isModern ? 'modern-card' : 'glass rounded-xl'} p-12 text-center`}>
              <Eye className="w-10 h-10 text-gray-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-400 text-sm">Válassz egy sablont az előnézethez</p>
              <p className="text-gray-500 text-xs mt-1">vagy kattints az "Új sablon" gombra</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
