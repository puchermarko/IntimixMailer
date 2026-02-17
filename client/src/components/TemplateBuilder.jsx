import { useState, useRef } from 'react'
import {
  Type, Image, MousePointerClick, Minus, MoveVertical, Columns, GripVertical,
  Trash2, ChevronUp, ChevronDown, Copy, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Link, Palette, Plus, Code, Eye, FileText, X
} from 'lucide-react'

// ─── Block Types ─────────────────────────────────────────────
const BLOCK_TYPES = [
  { type: 'text', label: 'Szöveg', icon: Type, desc: 'Szövegblokk' },
  { type: 'image', label: 'Kép', icon: Image, desc: 'Kép URL-ből' },
  { type: 'button', label: 'Gomb', icon: MousePointerClick, desc: 'CTA gomb' },
  { type: 'divider', label: 'Elválasztó', icon: Minus, desc: 'Vonal' },
  { type: 'spacer', label: 'Térköz', icon: MoveVertical, desc: 'Üres hely' },
  { type: 'columns', label: 'Oszlopok', icon: Columns, desc: '2 oszlop' },
]

let _blockId = 0
const uid = () => `block-${Date.now()}-${++_blockId}`

const createBlock = (type) => {
  const id = uid()
  switch (type) {
    case 'text':
      return { id, type, content: '<p>Szerkeszd ezt a szöveget...</p>', align: 'left', fontSize: 15, color: '#333333', bgColor: '', padding: 20 }
    case 'image':
      return { id, type, src: '', alt: 'Kép', width: '100%', align: 'center', padding: 10, link: '' }
    case 'button':
      return { id, type, text: 'Kattints ide', url: 'https://', bgColor: '#1AA19C', textColor: '#ffffff', align: 'center', borderRadius: 8, padding: 20, fontSize: 16 }
    case 'divider':
      return { id, type, color: '#e0e0e0', thickness: 1, padding: 15, width: '100%' }
    case 'spacer':
      return { id, type, height: 30 }
    case 'columns':
      return { id, type, left: '<p>Bal oszlop</p>', right: '<p>Jobb oszlop</p>', padding: 20, gap: 20 }
    default:
      return { id, type: 'text', content: '' }
  }
}

// ─── Generate HTML from blocks ──────────────────────────────
function blocksToHtml(blocks, bodyBg = '#f4f4f5', contentBg = '#ffffff', contentWidth = 600) {
  const renderBlock = (block) => {
    switch (block.type) {
      case 'text':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0"${block.bgColor ? ` style="background-color:${block.bgColor};"` : ''}>
  <tr><td style="padding:${block.padding}px ${block.padding + 10}px;color:${block.color};font-size:${block.fontSize}px;line-height:1.6;text-align:${block.align};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    ${block.content}
  </td></tr>
</table>`

      case 'image': {
        const img = `<img src="${block.src}" alt="${block.alt}" style="display:block;max-width:100%;width:${block.width};height:auto;border:0;" />`
        const linked = block.link ? `<a href="${block.link}" target="_blank">${img}</a>` : img
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:${block.padding}px;text-align:${block.align};">
    ${linked}
  </td></tr>
</table>`
      }

      case 'button':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:${block.padding}px;text-align:${block.align};">
    <a href="${block.url}" target="_blank" style="display:inline-block;background-color:${block.bgColor};color:${block.textColor};font-size:${block.fontSize}px;font-weight:600;text-decoration:none;padding:12px 30px;border-radius:${block.borderRadius}px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">${block.text}</a>
  </td></tr>
</table>`

      case 'divider':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:${block.padding}px 20px;">
    <div style="border-top:${block.thickness}px solid ${block.color};width:${block.width};margin:0 auto;"></div>
  </td></tr>
</table>`

      case 'spacer':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="height:${block.height}px;font-size:1px;line-height:1px;">&nbsp;</td></tr>
</table>`

      case 'columns':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:${block.padding}px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="50%" valign="top" style="padding-right:${block.gap / 2}px;font-size:14px;line-height:1.6;color:#333;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        ${block.left}
      </td>
      <td width="50%" valign="top" style="padding-left:${block.gap / 2}px;font-size:14px;line-height:1.6;color:#333;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        ${block.right}
      </td>
    </tr></table>
  </td></tr>
</table>`

      default:
        return ''
    }
  }

  const inner = blocks.map(renderBlock).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style type="text/css">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  p { margin: 0 0 10px 0; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: inherit !important; }
  @media (max-width: ${contentWidth + 60}px) {
    .email-container { width: 100% !important; }
    td[class="col"] { display: block !important; width: 100% !important; padding-right: 0 !important; padding-left: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${bodyBg};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bodyBg};">
<tr><td align="center" style="padding:20px 10px;">
  <table class="email-container" width="${contentWidth}" cellpadding="0" cellspacing="0" border="0" style="background-color:${contentBg};border-radius:8px;overflow:hidden;max-width:${contentWidth}px;">
  <tr><td>
${inner}
  </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Block Editor Panel ─────────────────────────────────────
function BlockSettings({ block, onChange }) {
  const update = (key, value) => onChange({ ...block, [key]: value })

  const ColorInput = ({ label, value, field }) => (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#333333'} onChange={(e) => update(field, e.target.value)}
          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent" />
        <input type="text" value={value || ''} onChange={(e) => update(field, e.target.value)}
          placeholder="#333333" className="input-field flex-1 px-2 py-1 text-xs font-mono" />
      </div>
    </div>
  )

  const AlignButtons = ({ value, field }) => (
    <div className="flex gap-1">
      {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
        <button key={a} type="button" onClick={() => update(field, a)}
          className={`p-1.5 rounded transition-all ${value === a ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-500 hover:text-gray-300'}`}>
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  )

  const RangeInput = ({ label, value, field, min = 0, max = 100, unit = 'px' }) => (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}: {value}{unit}</label>
      <input type="range" min={min} max={max} value={value} onChange={(e) => update(field, parseInt(e.target.value))}
        className="w-full accent-[#1AA19C]" />
    </div>
  )

  switch (block.type) {
    case 'text':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Tartalom (HTML)</label>
            <textarea value={block.content} onChange={(e) => update('content', e.target.value)}
              className="input-field w-full px-2 py-1.5 text-xs font-mono min-h-[120px] resize-y" spellCheck={false} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-gray-500">Igazítás</label>
            <AlignButtons value={block.align} field="align" />
          </div>
          <RangeInput label="Betűméret" value={block.fontSize} field="fontSize" min={10} max={40} />
          <RangeInput label="Belső margó" value={block.padding} field="padding" min={0} max={60} />
          <ColorInput label="Szövegszín" value={block.color} field="color" />
          <ColorInput label="Háttérszín" value={block.bgColor} field="bgColor" />
        </div>
      )

    case 'image':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Kép URL</label>
            <input type="text" value={block.src} onChange={(e) => update('src', e.target.value)}
              placeholder="https://example.com/image.jpg" className="input-field w-full px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Alt szöveg</label>
            <input type="text" value={block.alt} onChange={(e) => update('alt', e.target.value)}
              className="input-field w-full px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Link (opcionális)</label>
            <input type="text" value={block.link} onChange={(e) => update('link', e.target.value)}
              placeholder="https://" className="input-field w-full px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Szélesség</label>
            <input type="text" value={block.width} onChange={(e) => update('width', e.target.value)}
              placeholder="100% vagy 300px" className="input-field w-full px-2 py-1.5 text-xs" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-gray-500">Igazítás</label>
            <AlignButtons value={block.align} field="align" />
          </div>
          <RangeInput label="Belső margó" value={block.padding} field="padding" min={0} max={40} />
        </div>
      )

    case 'button':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Gomb szöveg</label>
            <input type="text" value={block.text} onChange={(e) => update('text', e.target.value)}
              className="input-field w-full px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Link URL</label>
            <input type="text" value={block.url} onChange={(e) => update('url', e.target.value)}
              placeholder="https://" className="input-field w-full px-2 py-1.5 text-xs" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-gray-500">Igazítás</label>
            <AlignButtons value={block.align} field="align" />
          </div>
          <RangeInput label="Betűméret" value={block.fontSize} field="fontSize" min={12} max={24} />
          <RangeInput label="Lekerekítés" value={block.borderRadius} field="borderRadius" min={0} max={30} />
          <RangeInput label="Belső margó" value={block.padding} field="padding" min={0} max={40} />
          <ColorInput label="Gomb háttér" value={block.bgColor} field="bgColor" />
          <ColorInput label="Gomb szöveg" value={block.textColor} field="textColor" />
        </div>
      )

    case 'divider':
      return (
        <div className="space-y-3">
          <RangeInput label="Vastagság" value={block.thickness} field="thickness" min={1} max={5} />
          <RangeInput label="Belső margó" value={block.padding} field="padding" min={0} max={40} />
          <ColorInput label="Szín" value={block.color} field="color" />
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Szélesség</label>
            <input type="text" value={block.width} onChange={(e) => update('width', e.target.value)}
              placeholder="100% vagy 80%" className="input-field w-full px-2 py-1.5 text-xs" />
          </div>
        </div>
      )

    case 'spacer':
      return (
        <div className="space-y-3">
          <RangeInput label="Magasság" value={block.height} field="height" min={5} max={100} />
        </div>
      )

    case 'columns':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Bal oszlop (HTML)</label>
            <textarea value={block.left} onChange={(e) => update('left', e.target.value)}
              className="input-field w-full px-2 py-1.5 text-xs font-mono min-h-[80px] resize-y" spellCheck={false} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Jobb oszlop (HTML)</label>
            <textarea value={block.right} onChange={(e) => update('right', e.target.value)}
              className="input-field w-full px-2 py-1.5 text-xs font-mono min-h-[80px] resize-y" spellCheck={false} />
          </div>
          <RangeInput label="Belső margó" value={block.padding} field="padding" min={0} max={40} />
          <RangeInput label="Oszlop köz" value={block.gap} field="gap" min={0} max={40} />
        </div>
      )

    default:
      return null
  }
}

// ─── Block Preview (canvas) ─────────────────────────────────
function BlockPreview({ block }) {
  switch (block.type) {
    case 'text':
      return (
        <div style={{ padding: `${Math.min(block.padding, 10)}px`, textAlign: block.align, fontSize: `${Math.min(block.fontSize, 14)}px`, color: block.color || '#333', backgroundColor: block.bgColor || 'transparent' }}>
          <div dangerouslySetInnerHTML={{ __html: block.content }} className="line-clamp-3 [&_p]:m-0" />
        </div>
      )
    case 'image':
      return (
        <div style={{ padding: '5px', textAlign: block.align }}>
          {block.src ? (
            <img src={block.src} alt={block.alt} style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
          ) : (
            <div className="flex items-center justify-center h-12 rounded bg-white/5 text-gray-500 text-xs">
              <Image className="w-4 h-4 mr-1" /> Kép URL megadása szükséges
            </div>
          )}
        </div>
      )
    case 'button':
      return (
        <div style={{ padding: '8px', textAlign: block.align }}>
          <span style={{ display: 'inline-block', backgroundColor: block.bgColor, color: block.textColor, padding: '6px 16px', borderRadius: `${block.borderRadius}px`, fontSize: '12px', fontWeight: 600 }}>
            {block.text}
          </span>
        </div>
      )
    case 'divider':
      return (
        <div style={{ padding: `${Math.min(block.padding, 8)}px 10px` }}>
          <div style={{ borderTop: `${block.thickness}px solid ${block.color}`, width: block.width, margin: '0 auto' }} />
        </div>
      )
    case 'spacer':
      return (
        <div className="flex items-center justify-center text-[10px] text-gray-600" style={{ height: `${Math.min(block.height, 30)}px` }}>
          ↕ {block.height}px
        </div>
      )
    case 'columns':
      return (
        <div className="grid grid-cols-2 gap-1 p-1">
          <div className="rounded bg-white/5 p-1.5 text-[10px] text-gray-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: block.left }} />
          <div className="rounded bg-white/5 p-1.5 text-[10px] text-gray-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: block.right }} />
        </div>
      )
    default:
      return null
  }
}

// ─── Extract settings from saved HTML ───────────────────────
function parseSettingsFromHtml(html) {
  const settings = { bodyBg: '#f4f4f5', contentBg: '#ffffff', contentWidth: 600 }
  if (!html) return settings
  const bodyMatch = html.match(/background-color:\s*(#[0-9a-fA-F]{3,8})/)
  if (bodyMatch) settings.bodyBg = bodyMatch[1]
  const containerMatch = html.match(/class="email-container"[^>]*style="[^"]*background-color:\s*(#[0-9a-fA-F]{3,8})/)
  if (containerMatch) settings.contentBg = containerMatch[1]
  const widthMatch = html.match(/class="email-container"\s+width="(\d+)"/)
  if (widthMatch) settings.contentWidth = parseInt(widthMatch[1])
  return settings
}

// ─── Main Template Builder ──────────────────────────────────
export default function TemplateBuilder({ initialHtml, initialBlocks, onHtmlChange, onBlocksChange }) {
  const initSettings = parseSettingsFromHtml(initialHtml)
  const [blocks, setBlocks] = useState(initialBlocks || [])
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [mode, setMode] = useState('visual') // 'visual' | 'html' | 'plaintext' | 'preview'
  const [htmlSource, setHtmlSource] = useState(initialHtml || '')
  const [plainText, setPlainText] = useState('')
  const [bodyBg, setBodyBg] = useState(initSettings.bodyBg)
  const [contentBg, setContentBg] = useState(initSettings.contentBg)
  const [contentWidth, setContentWidth] = useState(initSettings.contentWidth)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const dragItem = useRef(null)

  // Refs keep the latest values accessible inside functional setState callbacks
  const bodyBgRef = useRef(bodyBg)
  const contentBgRef = useRef(contentBg)
  const contentWidthRef = useRef(contentWidth)
  const setBodyBgTracked = (v) => { bodyBgRef.current = v; setBodyBg(v) }
  const setContentBgTracked = (v) => { contentBgRef.current = v; setContentBg(v) }
  const setContentWidthTracked = (v) => { contentWidthRef.current = v; setContentWidth(v) }

  const selectedBlock = blocks.find(b => b.id === selectedBlockId)

  const emitHtml = (newBlocks, bgOverride, cbgOverride, cwOverride) => {
    const html = blocksToHtml(newBlocks, bgOverride ?? bodyBgRef.current, cbgOverride ?? contentBgRef.current, cwOverride ?? contentWidthRef.current)
    setHtmlSource(html)
    onHtmlChange?.(html)
    onBlocksChange?.(newBlocks)
    return html
  }

  const applyBlocks = (newBlocks, overrides = {}) => {
    setBlocks(newBlocks)
    emitHtml(newBlocks, overrides.bodyBg, overrides.contentBg, overrides.contentWidth)
  }

  const addBlock = (type) => {
    const block = createBlock(type)
    setBlocks(prev => {
      const newBlocks = [...prev, block]
      emitHtml(newBlocks)
      return newBlocks
    })
    setSelectedBlockId(block.id)
  }

  const updateBlock = (updated) => {
    setBlocks(prev => {
      const newBlocks = prev.map(b => b.id === updated.id ? updated : b)
      emitHtml(newBlocks)
      return newBlocks
    })
  }

  const deleteBlock = (id) => {
    setBlocks(prev => {
      const newBlocks = prev.filter(b => b.id !== id)
      emitHtml(newBlocks)
      return newBlocks
    })
    if (selectedBlockId === id) setSelectedBlockId(null)
  }

  const duplicateBlock = (id) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx === -1) return prev
      const clone = { ...prev[idx], id: uid() }
      const newBlocks = [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]
      emitHtml(newBlocks)
      setSelectedBlockId(clone.id)
      return newBlocks
    })
  }

  const moveBlock = (id, dir) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx === -1) return prev
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const newBlocks = [...prev]
      ;[newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]]
      emitHtml(newBlocks)
      return newBlocks
    })
  }

  // Drag and drop
  const handleDragStart = (e, idx) => {
    dragItem.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  const handleDrop = (e, dropIdx) => {
    e.preventDefault()
    const dragIdx = dragItem.current
    if (dragIdx === null || dragIdx === dropIdx) { setDragOverIdx(null); return }
    const newBlocks = [...blocks]
    const [moved] = newBlocks.splice(dragIdx, 1)
    newBlocks.splice(dropIdx, 0, moved)
    applyBlocks(newBlocks)
    setDragOverIdx(null)
    dragItem.current = null
  }

  const handleDragEnd = () => { setDragOverIdx(null); dragItem.current = null }

  // Sync HTML source edits back
  const handleHtmlSourceChange = (html) => {
    setHtmlSource(html)
    onHtmlChange?.(html)
  }

  // Generate plain text from blocks
  const generatePlainText = () => {
    return blocks.map(b => {
      switch (b.type) {
        case 'text': return b.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
        case 'button': return `[${b.text}](${b.url})`
        case 'divider': return '---'
        case 'spacer': return ''
        case 'columns': return `${b.left.replace(/<[^>]+>/g, '')} | ${b.right.replace(/<[^>]+>/g, '')}`
        case 'image': return b.alt ? `[Kép: ${b.alt}]` : ''
        default: return ''
      }
    }).filter(Boolean).join('\n\n')
  }

  const currentHtml = mode === 'html' ? htmlSource : blocksToHtml(blocks, bodyBg, contentBg, contentWidth)

  const blockTypeInfo = (type) => BLOCK_TYPES.find(b => b.type === type)

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl glass-light w-fit">
        {[
          { id: 'visual', label: 'Vizuális', icon: Columns },
          { id: 'html', label: 'HTML', icon: Code },
          { id: 'plaintext', label: 'Sima szöveg', icon: FileText },
          { id: 'preview', label: 'Előnézet', icon: Eye },
        ].map(tab => (
          <button key={tab.id} type="button"
            onClick={() => {
              if (tab.id === 'plaintext') setPlainText(generatePlainText())
              setMode(tab.id)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === tab.id ? 'bg-[#1AA19C]/20 text-[#2EC4BE]' : 'text-gray-400 hover:text-gray-200'}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Visual Builder ─── */}
      {mode === 'visual' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Block palette (left) */}
          <div className="col-span-2 space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Blokkok</p>
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} type="button" onClick={() => addBlock(bt.type)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg glass-light hover:border-[#1AA19C]/20 border border-transparent text-left transition-all group">
                <bt.icon className="w-4 h-4 text-gray-500 group-hover:text-[#2EC4BE] transition-colors" />
                <div>
                  <p className="text-xs text-gray-300 font-medium">{bt.label}</p>
                  <p className="text-[10px] text-gray-600">{bt.desc}</p>
                </div>
              </button>
            ))}

            {/* Global settings */}
            <div className="pt-3 border-t border-white/5 space-y-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Beállítások</p>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Háttér</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bodyBg} onChange={(e) => { setBodyBgTracked(e.target.value); applyBlocks(blocks, { bodyBg: e.target.value }) }}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent" />
                  <input type="text" value={bodyBg} onChange={(e) => { setBodyBgTracked(e.target.value); applyBlocks(blocks, { bodyBg: e.target.value }) }}
                    className="input-field flex-1 px-2 py-1 text-[10px] font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Tartalom háttér</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={contentBg} onChange={(e) => { setContentBgTracked(e.target.value); applyBlocks(blocks, { contentBg: e.target.value }) }}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent" />
                  <input type="text" value={contentBg} onChange={(e) => { setContentBgTracked(e.target.value); applyBlocks(blocks, { contentBg: e.target.value }) }}
                    className="input-field flex-1 px-2 py-1 text-[10px] font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Szélesség: {contentWidth}px</label>
                <input type="range" min={400} max={800} value={contentWidth}
                  onChange={(e) => { const v = parseInt(e.target.value); setContentWidthTracked(v); applyBlocks(blocks, { contentWidth: v }) }}
                  className="w-full accent-[#1AA19C]" />
              </div>
            </div>

            {/* Variables */}
            <div className="pt-3 border-t border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Változók</p>
              <div className="flex flex-wrap gap-1">
                {['{{name}}', '{{email}}', '{{order_id}}'].map(v => (
                  <button key={v} type="button" onClick={() => navigator.clipboard.writeText(v).then(() => toast.success(`${v} másolva`))}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-mono hover:text-[#2EC4BE] hover:bg-[#1AA19C]/10 transition-all cursor-pointer">
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas (center) */}
          <div className="col-span-6">
            <div className="glass rounded-xl p-4 min-h-[400px]">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Plus className="w-10 h-10 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400">Adj hozzá blokkokat a bal oldali panelből</p>
                  <p className="text-xs text-gray-600 mt-1">Húzd és ejtsd az átrendezéshez</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {blocks.map((block, idx) => {
                    const info = blockTypeInfo(block.type)
                    return (
                      <div key={block.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedBlockId(block.id)}
                        className={`relative group rounded-lg border transition-all cursor-pointer ${
                          selectedBlockId === block.id
                            ? 'border-[#1AA19C]/50 bg-[#1AA19C]/5'
                            : dragOverIdx === idx
                            ? 'border-amber-500/50 bg-amber-500/5'
                            : 'border-white/5 hover:border-white/10'
                        }`}>
                        {/* Block header */}
                        <div className="flex items-center gap-2 px-2 py-1 border-b border-white/5">
                          <GripVertical className="w-3 h-3 text-gray-600 cursor-grab" />
                          {info && <info.icon className="w-3 h-3 text-gray-500" />}
                          <span className="text-[10px] text-gray-500 font-medium flex-1">{info?.label || block.type}</span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1) }}
                              className="p-0.5 text-gray-600 hover:text-gray-300"><ChevronUp className="w-3 h-3" /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1) }}
                              className="p-0.5 text-gray-600 hover:text-gray-300"><ChevronDown className="w-3 h-3" /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id) }}
                              className="p-0.5 text-gray-600 hover:text-gray-300"><Copy className="w-3 h-3" /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id) }}
                              className="p-0.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        {/* Block preview */}
                        <BlockPreview block={block} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Settings panel (right) */}
          <div className="col-span-4">
            <div className="glass rounded-xl p-4 sticky top-4">
              {selectedBlock ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">{blockTypeInfo(selectedBlock.type)?.label} beállítások</h4>
                    <button type="button" onClick={() => setSelectedBlockId(null)} className="text-gray-500 hover:text-gray-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <BlockSettings block={selectedBlock} onChange={updateBlock} />
                </>
              ) : (
                <div className="text-center py-8">
                  <Palette className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Válassz egy blokkot a szerkesztéshez</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── HTML Source Editor ─── */}
      {mode === 'html' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4">
            <label className="block text-xs text-gray-400 mb-2">HTML forráskód</label>
            <textarea value={htmlSource} onChange={(e) => handleHtmlSourceChange(e.target.value)}
              className="input-field w-full px-3 py-2 text-xs font-mono min-h-[500px] resize-y" spellCheck={false} />
          </div>
          <div className="glass rounded-xl p-4 sticky top-4">
            <label className="block text-xs text-gray-400 mb-2">Előnézet</label>
            <iframe srcDoc={htmlSource} className="w-full h-[500px] border-0 bg-white rounded-lg" sandbox="allow-same-origin" title="HTML preview" />
          </div>
        </div>
      )}

      {/* ─── Plain Text Editor ─── */}
      {mode === 'plaintext' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4">
            <label className="block text-xs text-gray-400 mb-2">Sima szöveg sablon</label>
            <textarea value={plainText} onChange={(e) => {
              setPlainText(e.target.value)
              // Wrap plain text in basic HTML
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;font-family:monospace;font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap;">${e.target.value.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</body></html>`
              setHtmlSource(html)
              onHtmlChange?.(html)
            }}
              placeholder="Írd meg az email szövegét egyszerű szövegként...&#10;&#10;Kedves {{name}},&#10;&#10;Köszönjük a rendelését!&#10;&#10;Üdvözlettel,&#10;A csapat"
              className="input-field w-full px-3 py-2 text-sm min-h-[500px] resize-y font-mono" />
          </div>
          <div className="glass rounded-xl p-4">
            <label className="block text-xs text-gray-400 mb-2">Előnézet</label>
            <div className="bg-white rounded-lg p-6 min-h-[500px] text-sm text-gray-800 font-mono whitespace-pre-wrap">
              {plainText || 'Írj szöveget a bal oldalon...'}
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Preview ─── */}
      {mode === 'preview' && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-gray-400">Email előnézet ({contentWidth}px)</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => navigator.clipboard.writeText(currentHtml).then(() => toast.success('HTML másolva'))}
                className="flex items-center gap-1 text-xs text-[#2EC4BE] hover:text-[#1AA19C] px-2 py-1 rounded-lg hover:bg-[#1AA19C]/10 transition-all">
                <Copy className="w-3 h-3" /> Másolás
              </button>
            </div>
          </div>
          <div className="flex justify-center" style={{ backgroundColor: bodyBg, borderRadius: '8px', padding: '20px' }}>
            <iframe srcDoc={currentHtml} style={{ width: `${contentWidth}px`, maxWidth: '100%' }}
              className="h-[600px] border-0 bg-white rounded-lg" sandbox="allow-same-origin" title="Full preview" />
          </div>
        </div>
      )}
    </div>
  )
}
