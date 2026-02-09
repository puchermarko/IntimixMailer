import { useState } from 'react'
import { emailTemplates } from '../lib/templates'
import { Eye, Code, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TemplateGallery() {
  const [previewId, setPreviewId] = useState(null)
  const [viewMode, setViewMode] = useState('preview')
  const [copiedId, setCopiedId] = useState(null)

  const selectedTemplate = emailTemplates.find(t => t.id === previewId)

  const copyHtml = (template) => {
    navigator.clipboard.writeText(template.html)
    setCopiedId(template.id)
    toast.success('HTML copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const previewHtml = (html) => {
    return html
      .replace(/cid:intimix-logo-header/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/nyl/588/ikm/IntimiX2.svg')
      .replace(/cid:intimix-logo-png/gi, 'https://64072b6cfa.imgdist.com/pub/bfra/vl0ytcv0/mwf/5mo/xol/IntimiX.png')
  }

  const sampleHtml = (html) => {
    return previewHtml(html)
      .replace(/\{\{name\}\}/gi, 'Kiss Anna')
      .replace(/\{\{email\}\}/gi, 'anna@example.com')
      .replace(/\{\{order_id\}\}/gi, '10042')
      .replace(/\{\{tracking_number\}\}/gi, 'HU9876543210')
      .replace(/\{\{tracking_url\}\}/gi, 'https://foxpost.hu/csomagkovetes/?code=HU9876543210')
      .replace(/\{\{delivery_time\}\}/gi, '11:00-14:00 között')
      .replace(/\{\{delivery_phone\}\}/gi, '+3630 17 05 865')
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Email Templates</h2>
        <p className="text-sm text-gray-400 mt-1">Browse and preview all available email templates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template list */}
        <div className="space-y-3">
          {emailTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => { setPreviewId(template.id); setViewMode('preview'); }}
              className={`template-card w-full p-4 rounded-xl text-left ${previewId === template.id ? 'selected' : ''}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-200">{template.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1AA19C]/10 text-[#2EC4BE] border border-[#1AA19C]/20">
                  {template.category}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{template.description}</p>
              <p className="text-xs text-gray-600 mt-2 font-mono truncate">{template.subject || '(no subject)'}</p>
            </button>
          ))}
        </div>

        {/* Preview area */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="glass rounded-xl p-5 fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedTemplate.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Subject: {selectedTemplate.subject || '(custom)'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')}
                    className="flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] px-3 py-1.5 rounded-lg hover:bg-[#1AA19C]/10 transition-all"
                  >
                    {viewMode === 'preview' ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {viewMode === 'preview' ? 'View HTML' : 'Preview'}
                  </button>
                  <button
                    onClick={() => copyHtml(selectedTemplate)}
                    className="flex items-center gap-1.5 text-xs text-[#2EC4BE] hover:text-[#1AA19C] px-3 py-1.5 rounded-lg hover:bg-[#1AA19C]/10 transition-all"
                  >
                    {copiedId === selectedTemplate.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === selectedTemplate.id ? 'Copied!' : 'Copy HTML'}
                  </button>
                </div>
              </div>

              {/* Variables info */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['{{name}}', '{{email}}', '{{order_id}}', '{{tracking_number}}', '{{tracking_url}}', '{{delivery_time}}', '{{delivery_phone}}'].map(v => (
                  <span key={v} className="text-[10px] px-2 py-1 rounded-md bg-surface-light text-gray-400 font-mono border border-white/5">
                    {v}
                  </span>
                ))}
              </div>

              {viewMode === 'preview' ? (
                <div className="bg-white rounded-lg overflow-hidden">
                  <div
                    dangerouslySetInnerHTML={{ __html: sampleHtml(selectedTemplate.html) }}
                  />
                </div>
              ) : (
                <pre className="input-field rounded-lg p-4 text-xs font-mono overflow-auto max-h-[600px] whitespace-pre-wrap">
                  {selectedTemplate.html}
                </pre>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center">
              <Eye className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Select a template to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
