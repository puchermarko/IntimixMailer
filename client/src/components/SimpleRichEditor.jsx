import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Underline, List, ListOrdered, Link,
  AlignLeft, AlignCenter, AlignRight, RemoveFormatting
} from 'lucide-react'

export default function SimpleRichEditor({ initialHtml, onChange, className }) {
  const editorRef = useRef(null)
  const [html, setHtml] = useState(initialHtml || '')

  // Sync initialHtml changes to internal state (if needed, e.g. template loaded)
  useEffect(() => {
    if (editorRef.current && initialHtml !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialHtml
      setHtml(initialHtml)
    }
  }, [initialHtml])

  // Set default paragraph separator
  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p')
  }, [])

  const handleInput = (e) => {
    const newHtml = e.currentTarget.innerHTML
    setHtml(newHtml)
    onChange?.(newHtml)
  }

  const exec = (command, value = null) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    // Trigger update
    const newHtml = editorRef.current?.innerHTML || ''
    setHtml(newHtml)
    onChange?.(newHtml)
  }

  const ToolbarBtn = ({ icon: Icon, command, value, title }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        if (command === 'createLink') {
          const url = prompt('Enter URL:')
          if (url) exec(command, url)
        } else {
          exec(command, value)
        }
      }}
      className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
      title={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <div className={`flex flex-col border border-white/10 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-white/5 border-b border-white/5 overflow-x-auto">
        <ToolbarBtn icon={Bold} command="bold" title="Bold" />
        <ToolbarBtn icon={Italic} command="italic" title="Italic" />
        <ToolbarBtn icon={Underline} command="underline" title="Underline" />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarBtn icon={AlignLeft} command="justifyLeft" title="Align Left" />
        <ToolbarBtn icon={AlignCenter} command="justifyCenter" title="Align Center" />
        <ToolbarBtn icon={AlignRight} command="justifyRight" title="Align Right" />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarBtn icon={List} command="insertUnorderedList" title="Bullet List" />
        <ToolbarBtn icon={ListOrdered} command="insertOrderedList" title="Numbered List" />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarBtn icon={Link} command="createLink" title="Link" />
        <ToolbarBtn icon={RemoveFormatting} command="removeFormat" title="Clear Formatting" />
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 p-4 min-h-[300px] outline-none text-sm text-gray-200 overflow-y-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#2EC4BE] [&_a]:underline"
      />
    </div>
  )
}
