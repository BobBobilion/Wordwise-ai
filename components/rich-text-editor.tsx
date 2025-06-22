"use client"

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import History from '@tiptap/extension-history'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
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

// Custom TextStyle extension with font size support
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {}
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          }
        },
      },
    }
  },
})

// Custom Highlight extension for error underlines
const HighlightExtension = Extension.create({
  name: 'highlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('highlight'),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, oldState) {
            try {
              const highlights = tr.getMeta('highlights')
              
              // If no highlights metadata, keep the old state
              if (highlights === undefined) {
                return oldState
              }
              
              if (!highlights || !Array.isArray(highlights) || highlights.length === 0) {
                return DecorationSet.empty
              }

              const decorations = highlights.map((highlight: any) => {
                if (!highlight || typeof highlight !== 'object') {
                  return null
                }
                
                const { from, to, color, id } = highlight
                if (typeof from !== 'number' || typeof to !== 'number' || !color || !id) {
                  return null
                }
                
                return Decoration.inline(
                  from + 1,
                  to + 1,
                  {
                    class: `highlight-${color}`,
                    'data-highlight-id': id,
                  }
                )
              }).filter((decoration): decoration is Decoration => decoration !== null)

              return DecorationSet.create(tr.doc, decorations)
            } catch (error) {
              return oldState // Keep old state on error
            }
          },
        },
        props: {
          decorations(state) {
            try {
              return this.getState(state)
            } catch (error) {
              return DecorationSet.empty
            }
          },
        },
      }),
    ]
  },
})

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  title: string
  onTitleChange: (title: string) => void
  highlights?: any[]
  onHighlightClick?: (highlight: any) => void
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
  testHighlight: () => void
  replaceText: (from: number, to: number, newText: string) => void
  findAndReplaceText: (oldText: string, newText: string, startPosition?: number) => { success: boolean; position?: number }
}

// Font families
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
]

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange, title, onTitleChange, highlights = [], onHighlightClick, onSpellCheck, isCheckingGrammar }, ref) => {
    const [cursorPosition, setCursorPosition] = useState<number>(0)
    const [currentHighlights, setCurrentHighlights] = useState<any[]>([])
    const editorRef = useRef<HTMLDivElement>(null)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          history: false, // We'll use our custom history
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
          defaultAlignment: 'left',
        }),
        FontFamily.configure({
          types: ['textStyle'],
        }),
        CustomTextStyle,
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
      },
      onSelectionUpdate: ({ editor }) => {
        const { from } = editor.state.selection
        setCursorPosition(from)
      },
    })

    // Update highlights when they change
    useEffect(() => {
      setCurrentHighlights(highlights)
      if (editor) {
        // Use a transaction that doesn't trigger content changes
        const tr = editor.state.tr.setMeta('highlights', highlights)
        editor.view.dispatch(tr)
      }
    }, [highlights, editor])

    // Add click handler for highlights
    useEffect(() => {
      if (!editor || !onHighlightClick) return

      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        const highlightElement = target.closest('[data-highlight-id]') as HTMLElement
        
        if (highlightElement) {
          // Prevent default behavior and stop propagation
          event.preventDefault()
          event.stopPropagation()
          
          const highlightId = highlightElement.getAttribute('data-highlight-id')
          const highlight = highlights.find(h => h.id === highlightId)
          
          if (highlight) {
            onHighlightClick(highlight)
          }
        }
      }

      const editorElement = editor.view.dom
      editorElement.addEventListener('click', handleClick, true) // Use capture phase
      
      return () => {
        editorElement.removeEventListener('click', handleClick, true)
      }
    }, [editor, highlights, onHighlightClick])

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

        // Prevent Ctrl+Shift+L and Ctrl+Shift+R from triggering text alignment
        // Allow browser defaults for these shortcuts
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'l' || event.key === 'L')) {
          event.stopPropagation()
          // Don't prevent default - let browser handle it
        }
        
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'r' || event.key === 'R')) {
          event.stopPropagation()
          // Don't prevent default - let browser handle it
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
        const newHighlight = { from, to, color, id }
        setCurrentHighlights(prev => [...prev, newHighlight])
        
        if (editor) {
          editor.view.dispatch(editor.state.tr.setMeta('highlights', [...currentHighlights, newHighlight]))
        }
      },
      
      removeHighlight: (id: string) => {
        setCurrentHighlights(prev => prev.filter(h => h.id !== id))
        
        if (editor) {
          const updatedHighlights = currentHighlights.filter(h => h.id !== id)
          editor.view.dispatch(editor.state.tr.setMeta('highlights', updatedHighlights))
        }
      },
      
      clearHighlights: () => {
        setCurrentHighlights([])
        
        if (editor) {
          editor.view.dispatch(editor.state.tr.setMeta('highlights', []))
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
      
      testHighlight: () => {
        // Add a test highlight
        if (editor) {
          const newHighlight = { from: 0, to: 5, color: 'red' as const, id: 'test-highlight' }
          setCurrentHighlights(prev => [...prev, newHighlight])
          editor.view.dispatch(editor.state.tr.setMeta('highlights', [...currentHighlights, newHighlight]))
        }
      },
      
      replaceText: (from: number, to: number, newText: string) => {
        if (editor) {
          // Store current cursor position
          const currentPos = editor.state.selection.from
          
          // Set selection to the range we want to replace
          editor.commands.setTextSelection({ from, to })
          
          // Replace the selected text
          editor.commands.insertContent(newText)
          
          // Restore cursor position
          setTimeout(() => {
            editor.commands.setTextSelection(currentPos)
          }, 0)
        }
      },
      
      findAndReplaceText: (oldText: string, newText: string, startPosition?: number) => {
        if (!editor) return { success: false }
        
        const doc = editor.state.doc
        const content = doc.textBetween(0, doc.content.size)
        
        // First, try to find the text starting from the suggested position
        if (startPosition !== undefined) {
          const searchStart = Math.max(0, startPosition - 50) // Search 50 chars before the suggested position
          const searchEnd = Math.min(content.length, startPosition + oldText.length + 50) // Search 50 chars after
          const searchContent = content.substring(searchStart, searchEnd)
          const foundIndex = searchContent.indexOf(oldText)
          
          if (foundIndex !== -1) {
            const actualStart = searchStart + foundIndex + 1 // Shift right by 1 character
            const actualEnd = actualStart + oldText.length
            
            // Store current cursor position
            const currentPos = editor.state.selection.from
            
            // Set selection to the found text
            editor.commands.setTextSelection({ from: actualStart, to: actualEnd })
            
            // Replace the selected text
            editor.commands.insertContent(newText)
            
            // Restore cursor position
            setTimeout(() => {
              editor.commands.setTextSelection(currentPos)
            }, 0)
            
            return { success: true, position: actualStart }
          }
        }
        
        // If not found at suggested position, search the entire document
        const fullFoundIndex = content.indexOf(oldText)
        
        if (fullFoundIndex === -1) {
          return { success: false }
        }
        
        const actualStart = fullFoundIndex + 2 // Shift right by 1 character
        const actualEnd = actualStart + oldText.length
        
        // Store current cursor position
        const currentPos = editor.state.selection.from
        
        // Set selection to the found text
        editor.commands.setTextSelection({ from: actualStart, to: actualEnd })
        
        // Replace the selected text
        editor.commands.insertContent(newText)
        
        // Restore cursor position
        setTimeout(() => {
          editor.commands.setTextSelection(currentPos)
        }, 0)
        
        return { success: true, position: actualStart }
      },
    }))

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

        {/* Editor Styles */}
        <style jsx global>{`
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
          
          /* Highlight styles for error underlines */
          .highlight-red {
            border-bottom: 3px solid #ef4444;
            border-bottom-style: wavy;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .highlight-red:hover {
            background-color: rgba(239, 68, 68, 0.1);
            border-bottom-width: 4px;
          }
          
          .highlight-yellow {
            border-bottom: 3px solid #eab308;
            border-bottom-style: wavy;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .highlight-yellow:hover {
            background-color: rgba(234, 179, 8, 0.1);
            border-bottom-width: 4px;
          }
          
          .highlight-purple {
            border-bottom: 3px solid #a855f7;
            border-bottom-style: wavy;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .highlight-purple:hover {
            background-color: rgba(168, 85, 247, 0.1);
            border-bottom-width: 4px;
          }
          
          /* Ensure highlights work with different font sizes and styles */
          .highlight-red, .highlight-yellow, .highlight-purple {
            text-decoration: none !important;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
          }
          
          /* Handle bold text with highlights */
          .highlight-red strong, .highlight-yellow strong, .highlight-purple strong {
            border-bottom: inherit;
            border-bottom-style: inherit;
          }
          
          /* Handle italic text with highlights */
          .highlight-red em, .highlight-yellow em, .highlight-purple em {
            border-bottom: inherit;
            border-bottom-style: inherit;
          }
          
          /* Handle underlined text with highlights */
          .highlight-red u, .highlight-yellow u, .highlight-purple u {
            border-bottom: inherit;
            border-bottom-style: inherit;
          }
        `}</style>
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor' 
