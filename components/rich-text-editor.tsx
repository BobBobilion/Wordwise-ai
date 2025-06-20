"use client"

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import History from '@tiptap/extension-history'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Type,
  Undo,
  Redo,
  CheckCircle,
  Loader2,
  RotateCw
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Custom extensions
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

interface HighlightMark {
  from: number
  to: number
  color: 'red' | 'yellow' | 'purple'
  id: string
}

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  title: string
  onTitleChange: (title: string) => void
  highlights?: HighlightMark[]
  onHighlightClick?: (highlight: HighlightMark) => void
  onSpellCheck?: () => void
  isCheckingGrammar?: boolean
}

export interface RichTextEditorRef {
  addHighlight: (from: number, to: number, color: 'red' | 'yellow' | 'purple', id: string) => void
  removeHighlight: (id: string) => void
  clearHighlights: () => void
  getContent: () => string
  setContent: (content: string) => void
  focus: () => void
  getCursorPosition: () => number
  setCursorPosition: (position: number) => void
}

// Custom Highlight Extension
const HighlightExtension = Extension.create({
  name: 'highlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          highlight: {
            default: null,
            parseHTML: element => element.getAttribute('data-highlight'),
            renderHTML: attributes => {
              if (!attributes.highlight) {
                return {}
              }
              return {
                'data-highlight': attributes.highlight,
                class: `highlight-${attributes.highlight}`,
              }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('highlight'),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, oldState) {
            const highlights = tr.getMeta('highlights') as HighlightMark[] || []
            
            if (highlights.length === 0) {
              return oldState
            }

            const decorations = highlights.map(highlight => 
              Decoration.inline(highlight.from, highlight.to, {
                class: `highlight-${highlight.color}`,
                'data-highlight-id': highlight.id,
              })
            )

            return DecorationSet.create(tr.doc, decorations)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

// Font families
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
]

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange, title, onTitleChange, highlights = [], onHighlightClick, onSpellCheck, isCheckingGrammar }, ref) => {
    const [currentHighlights, setCurrentHighlights] = useState<HighlightMark[]>(highlights)
    const [cursorPosition, setCursorPosition] = useState<number>(0)
    const editorRef = useRef<HTMLDivElement>(null)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          history: false, // We'll use our custom history
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        FontFamily.configure({
          types: ['textStyle'],
        }),
        TextStyle,
        Underline,
        History.configure({
          depth: 100,
        }),
        HighlightExtension,
      ],
      content,
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        onChange(html)
        
        // Store cursor position
        const { from } = editor.state.selection
        setCursorPosition(from)
        
        // Clear highlights that overlap with edited text
        const newHighlights = currentHighlights.filter(highlight => {
          const hasOverlap = editor.state.doc.textBetween(
            Math.max(0, highlight.from - 1),
            Math.min(editor.state.doc.content.size, highlight.to + 1)
          ).length > 0
          return hasOverlap
        })
        
        if (newHighlights.length !== currentHighlights.length) {
          setCurrentHighlights(newHighlights)
        }
      },
      onSelectionUpdate: ({ editor }) => {
        const { from } = editor.state.selection
        setCursorPosition(from)
      },
    })

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (!editor) return

        // Ctrl+Z for undo
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          editor.chain().focus().undo().run()
        }
        
        // Ctrl+U for redo (custom shortcut as requested)
        if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
          event.preventDefault()
          editor.chain().focus().redo().run()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [editor])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      addHighlight: (from: number, to: number, color: 'red' | 'yellow' | 'purple', id: string) => {
        if (!editor) return
        
        const newHighlight: HighlightMark = { from, to, color, id }
        setCurrentHighlights(prev => [...prev, newHighlight])
        
        // Store current cursor position
        const currentPos = editor.state.selection.from
        
        // Apply highlight to editor
        editor.commands.setTextSelection({ from, to })
        editor.commands.setMark('textStyle', { highlight: color })
        
        // Restore cursor position
        setTimeout(() => {
          editor.commands.setTextSelection(currentPos)
        }, 0)
      },
      
      removeHighlight: (id: string) => {
        setCurrentHighlights(prev => prev.filter(h => h.id !== id))
      },
      
      clearHighlights: () => {
        setCurrentHighlights([])
        if (editor) {
          editor.commands.unsetMark('textStyle')
        }
      },
      
      getContent: () => {
        return editor?.getHTML() || ''
      },
      
      setContent: (content: string) => {
        if (editor) {
          const currentPos = editor.state.selection.from
          editor.commands.setContent(content)
          // Restore cursor position
          setTimeout(() => {
            editor.commands.setTextSelection(currentPos)
          }, 0)
        }
      },
      
      focus: () => {
        editor?.commands.focus()
      },
      
      getCursorPosition: () => cursorPosition,
      
      setCursorPosition: (position: number) => {
        if (editor) {
          editor.commands.setTextSelection(position)
        }
      },
    }))

    // Apply highlights when they change
    useEffect(() => {
      if (!editor || highlights.length === 0) return
      
      setCurrentHighlights(highlights)
      
      // Store current cursor position
      const currentPos = editor.state.selection.from
      
      // Apply highlights to editor
      highlights.forEach(highlight => {
        editor.commands.setTextSelection({ from: highlight.from, to: highlight.to })
        editor.commands.setMark('textStyle', { highlight: highlight.color })
      })
      
      // Restore cursor position
      setTimeout(() => {
        editor.commands.setTextSelection(currentPos)
      }, 0)
    }, [highlights, editor])

    // Handle highlight clicks
    const handleHighlightClick = useCallback((event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('highlight-red') || 
          target.classList.contains('highlight-yellow') || 
          target.classList.contains('highlight-purple')) {
        const highlightId = target.getAttribute('data-highlight-id')
        if (highlightId && onHighlightClick) {
          const highlight = currentHighlights.find(h => h.id === highlightId)
          if (highlight) {
            onHighlightClick(highlight)
          }
        }
      }
    }, [currentHighlights, onHighlightClick])

    useEffect(() => {
      const editorElement = editorRef.current
      if (editorElement) {
        editorElement.addEventListener('click', handleHighlightClick)
        return () => {
          editorElement.removeEventListener('click', handleHighlightClick)
        }
      }
    }, [handleHighlightClick])

    if (!editor) {
      return <div>Loading editor...</div>
    }

    return (
      <div className="w-full">
        {/* Title Input */}
        <div className="mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Document title..."
            className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder-gray-400"
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-3 bg-gray-50 rounded-lg border">
          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            <Button
              variant={editor.isActive('bold') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('italic') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('underline') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className="h-8 w-8 p-0"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Text Alignment */}
          <div className="flex items-center gap-1">
            <Button
              variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className="h-8 w-8 p-0"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className="h-8 w-8 p-0"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className="h-8 w-8 p-0"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className="h-8 w-8 p-0"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Font Family */}
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-gray-500" />
            <Select
              value={editor.getAttributes('textStyle').fontFamily || 'Arial, sans-serif'}
              onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Font Size */}
          <div className="flex items-center gap-2">
            <Select
              value={editor.getAttributes('textStyle').fontSize || '16px'}
              onValueChange={(value) => editor.chain().focus().setMark('textStyle', { fontSize: value }).run()}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8 p-0"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8 p-0"
              title="Redo (Ctrl+U)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Spell Check */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onSpellCheck}
              disabled={isCheckingGrammar}
              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
              title="Check Spelling & Grammar"
            >
              {isCheckingGrammar ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4 mr-1" />
              )}
              Check
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div 
          ref={editorRef}
          className="border rounded-lg bg-white min-h-[400px] focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500"
        >
          <EditorContent editor={editor} />
        </div>

        {/* Bubble Menu for quick formatting */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100 }}
            className="flex items-center gap-1 p-2 bg-white border rounded-lg shadow-lg"
          >
            <Button
              variant={editor.isActive('bold') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('italic') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('underline') ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className="h-8 w-8 p-0"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
          </BubbleMenu>
        )}

        {/* Highlight Styles */}
        <style jsx global>{`
          .highlight-red {
            background-color: rgba(239, 68, 68, 0.3);
            border-bottom: 2px solid #ef4444;
            cursor: pointer;
          }
          .highlight-yellow {
            background-color: rgba(234, 179, 8, 0.3);
            border-bottom: 2px solid #eab308;
            cursor: pointer;
          }
          .highlight-purple {
            background-color: rgba(147, 51, 234, 0.3);
            border-bottom: 2px solid #9333ea;
            cursor: pointer;
          }
          .ProseMirror {
            outline: none;
            min-height: 400px;
            padding: 1rem;
          }
          .ProseMirror p.is-editor-empty:first-child::before {
            color: #adb5bd;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
        `}</style>
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor' 