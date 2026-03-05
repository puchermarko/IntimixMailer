// Sablon galéria - beépített és egyéni sablonok kezelése
import { useState, useEffect } from 'react'
import { emailTemplates } from '../lib/templates'
import { getCustomTemplates, createTemplate, updateTemplate, deleteTemplate } from '../lib/api'
import { useBranding, useUI } from '../App'
import { Eye, Code, Copy, Check, Plus, Edit3, Trash2, Save, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import TemplateBuilder from './TemplateBuilder'

export default function TemplateGallery() {
  const { login_domain } = useBranding()
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

  const isModern = uiMode === 'modern'

  useEffect(() => {
    getCustomTemplates().then(setCustomTemplates).catch(() => {})
  }, [])

  const showBuiltin = login_domain === 'intimix.hu'
  const allTemplates = [
    ...(showBuiltin ? emailTemplates.map(t => ({ ...t, _source: 'builtin' })) : []),
    ...customTemplates.map(t => ({ ...t, _source: 'custom' }))
  ]

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

  // ─── Gallery View ───
  return (
    <div className={isModern ? 'max-w-[1600px] mx-auto fade-in' : ''}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Email sablonok</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">{allTemplates.length} sablon elérhető</p>
        </div>
        <button onClick={openNew}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1AA19C] hover:bg-[#2EC4BE] text-white text-sm font-medium transition-all w-full sm:w-auto ${isModern ? 'shadow-lg shadow-[#2EC4BE]/20' : ''}`}>
          <Plus className="w-4 h-4" /> Új sablon
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template list */}
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {customTemplates.length > 0 && (
            <>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium px-1 mb-1">Egyéni sablonok</p>
              {customTemplates.map(template => (
                <div key={template.id}
                  className={`template-card rounded-xl text-left ${isModern ? 'hover:bg-white/5 border border-transparent' : ''} ${previewId === template.id && previewSource === 'custom' ? (isModern ? 'bg-[#2EC4BE]/10 border-[#2EC4BE]/20' : 'selected') : ''}`}>
                  <button onClick={() => { setPreviewId(template.id); setPreviewSource('custom'); setViewMode('preview') }}
                    className="w-full p-3 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-200 truncate">{template.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${isModern ? 'bg-[#2EC4BE]/10 text-[#2EC4BE]' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {template.category || 'Custom'}
                      </span>
                    </div>
                    {template.description && <p className="text-xs text-gray-500 mt-1 truncate">{template.description}</p>}
                    <p className="text-xs text-gray-600 mt-1 font-mono truncate">{template.subject || '(nincs tárgy)'}</p>
                  </button>
                  <div className="flex items-center gap-1 px-3 pb-2">
                    <button onClick={() => openEdit(template)}
                      className={`p-1.5 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-[#2EC4BE] hover:bg-[#2EC4BE]/10' : 'text-gray-500 hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10'}`}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(template.id)}
                      className={`p-1.5 rounded-lg transition-all ${isModern ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="h-px bg-white/5 my-2" />
            </>
          )}

          {showBuiltin && (
            <>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium px-1 mb-1">Beépített sablonok</p>
              {emailTemplates.map(template => (
                <button key={template.id}
                  onClick={() => { setPreviewId(template.id); setPreviewSource('builtin'); setViewMode('preview') }}
                  className={`template-card w-full p-3 rounded-xl text-left ${isModern ? 'hover:bg-white/5 border border-transparent' : ''} ${previewId === template.id && previewSource === 'builtin' ? (isModern ? 'bg-[#2EC4BE]/10 border-[#2EC4BE]/20' : 'selected') : ''}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-200 truncate">{template.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${isModern ? 'bg-[#2EC4BE]/10 text-[#2EC4BE]' : 'bg-[#1AA19C]/10 text-[#2EC4BE] border border-[#1AA19C]/20'}`}>
                      {template.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{template.description}</p>
                  <p className="text-xs text-gray-600 mt-1 font-mono truncate">{template.subject || '(nincs tárgy)'}</p>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Preview area */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className={`${isModern ? 'modern-card p-5' : 'glass rounded-xl p-5'} fade-in`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedTemplate.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tárgy: {selectedTemplate.subject || '(egyéni)'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')}
                    className={`flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] px-3 py-1.5 rounded-lg hover:bg-[#1AA19C]/10 transition-all ${isModern ? 'bg-[#2EC4BE]/10' : ''}`}>
                    {viewMode === 'preview' ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {viewMode === 'preview' ? 'HTML kód' : 'Előnézet'}
                  </button>
                  <button onClick={() => copyHtml(selectedTemplate)}
                    className={`flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] px-3 py-1.5 rounded-lg hover:bg-[#1AA19C]/10 transition-all ${isModern ? 'bg-[#2EC4BE]/10' : ''}`}>
                    {copiedId === selectedTemplate.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === selectedTemplate.id ? 'Másolva!' : 'HTML másolása'}
                  </button>
                  {selectedTemplate._source === 'custom' && (
                    <button onClick={() => openEdit(selectedTemplate)}
                      className={`flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all ${isModern ? 'bg-amber-500/10' : ''}`}>
                      <Edit3 className="w-3.5 h-3.5" /> Szerkesztés
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {['{{name}}', '{{email}}', '{{order_id}}', '{{tracking_number}}', '{{tracking_url}}', '{{delivery_time}}', '{{delivery_phone}}'].map(v => (
                  <span key={v} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 font-mono">{v}</span>
                ))}
              </div>

              {viewMode === 'preview' ? (
                <div className="rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={sampleHtml(selectedTemplate.html)}
                    className="w-full h-[600px] border-0 bg-white rounded-lg"
                    sandbox="allow-same-origin"
                    title="Template preview"
                  />
                </div>
              ) : (
                <pre className="input-field rounded-lg p-4 text-xs font-mono overflow-auto max-h-[600px] whitespace-pre-wrap">
                  {selectedTemplate.html}
                </pre>
              )}
            </div>
          ) : (
            <div className={`${isModern ? 'modern-card' : 'glass rounded-xl'} p-12 text-center`}>
              <Eye className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Válassz egy sablont az előnézethez</p>
              <p className="text-gray-500 text-xs mt-1">vagy kattints az "Új sablon" gombra</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
