"use client"

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, CheckCircle } from "lucide-react"
import { checkSpelling, checkStyleAndGrammar, dismissSuggestion as dismissGrammarSuggestion } from "@/lib/grammar-checker"
import type { GrammarSuggestion } from "@/lib/types"
import { toast } from "react-toastify"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onTitleChange: (title: string) => void
  title: string
  onSuggestionsChange?: (suggestions: GrammarSuggestion[]) => void
}

export interface RichTextEditorRef {
  applySuggestion: (suggestion: GrammarSuggestion) => void
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange, onTitleChange, title, onSuggestionsChange }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const [selectedFont, setSelectedFont] = useState("sans-serif")
    const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
    const [isCheckingGrammar, setIsCheckingGrammar] = useState(false)
    const [lastKeyPressed, setLastKeyPressed] = useState<string>("")
    const [isGrammarCheckInProgress, setIsGrammarCheckInProgress] = useState(false)

    useEffect(() => {
      if (editorRef.current && editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content
      }
    }, [content])

    // Spell checker: runs on spacebar press and every 5 seconds
    useEffect(() => {
      if (typeof window === 'undefined') return

      const intervalId = setInterval(() => {
        if (editorRef.current) {
          const text = editorRef.current.innerText
          if (text.trim().length > 20 && !isGrammarCheckInProgress) {
            // Wrap in try-catch to prevent crashes
            try {
              setIsGrammarCheckInProgress(true)
              handleSpellCheck(false, false) // Silent check every 10 seconds, no force check
            } catch (error) {
              console.error('Spell check interval error:', error)
            } finally {
              setIsGrammarCheckInProgress(false)
            }
          }
        }
      }, 10000) // Check every 10 seconds

      return () => clearInterval(intervalId)
    }, [isGrammarCheckInProgress])

    // Style and grammar checker: runs every 5 seconds
    useEffect(() => {
      if (typeof window === 'undefined') return

      // Temporarily disabled style/grammar check interval to prevent freezing
      // Will be re-enabled once we find a non-blocking solution
      return () => {}
    }, [])

    const handleInput = useCallback(() => {
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML
        onChange(newContent)
      }
    }, [onChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      // Track spacebar press for spell checking
      if (e.key === " " && typeof window !== 'undefined') {
        setLastKeyPressed(" ")
        // Trigger spell check on spacebar
        if (editorRef.current) {
          const text = editorRef.current.innerText
          if (text.trim().length > 5) {
            handleSpellCheck(false, false) // Silent check on spacebar, no force check
          }
        }
      }
    }, [])

    const execCommand = (command: string, value?: string) => {
      document.execCommand(command, false, value)
      editorRef.current?.focus()
    }

    const handleFontChange = (font: string) => {
      setSelectedFont(font)
      if (editorRef.current) {
        editorRef.current.style.fontFamily = font
      }
    }

    const handleSpellCheck = async (showNotification = true, forceCheck = false) => {
      if (!editorRef.current) return

      const text = editorRef.current.innerText
      if (!text.trim()) return

      if (isGrammarCheckInProgress) return

      if (showNotification) setIsCheckingGrammar(true)

      try {
        setIsGrammarCheckInProgress(true)
        const spellSuggestions = await checkSpelling(text, forceCheck) // Only force check when explicitly requested
        
        // Merge with existing suggestions, keeping style/grammar suggestions
        setSuggestions(prev => {
          const existingStyleGrammar = prev.filter(s => s.type === 'style' || s.type === 'grammar')
          const newSuggestions = [...existingStyleGrammar, ...spellSuggestions].sort((a, b) => a.start - b.start)
          return newSuggestions
        })
      } catch (error) {
        console.error("Spell check failed:", error)
      } finally {
        if (showNotification) setIsCheckingGrammar(false)
        setIsGrammarCheckInProgress(false)
      }
    }

    const handleStyleAndGrammarCheck = async (showNotification = true) => {
      if (!editorRef.current) return

      const text = editorRef.current.innerText
      if (!text.trim()) return

      if (isGrammarCheckInProgress) return

      if (showNotification) setIsCheckingGrammar(true)

      try {
        setIsGrammarCheckInProgress(true)
        // Temporarily disabled write-good to prevent freezing
        const styleGrammarSuggestions: GrammarSuggestion[] = []
        
        // Merge with existing suggestions, keeping spelling suggestions
        setSuggestions(prev => {
          const existingSpelling = prev.filter(s => s.type === 'spelling')
          const newSuggestions = [...existingSpelling, ...styleGrammarSuggestions].sort((a, b) => a.start - b.start)
          return newSuggestions
        })

        if (showNotification) {
          if (styleGrammarSuggestions.length === 0) {
            console.log("No style or grammar issues found!")
          }
        }
      } catch (error) {
        console.error("Style and grammar check failed:", error)
      } finally {
        if (showNotification) setIsCheckingGrammar(false)
        setIsGrammarCheckInProgress(false)
      }
    }

    const handleGrammarCheck = async (showNotification = true) => {
      // Combined check for manual trigger
      await Promise.all([
        handleSpellCheck(showNotification, true), // Force check for manual trigger
        handleStyleAndGrammarCheck(showNotification)
      ])
    }

    // Helper function to adjust suggestion positions after text changes
    const adjustSuggestionPositions = (appliedSuggestion: GrammarSuggestion, appliedText: string, newText: string) => {
      const lengthDifference = appliedText.length - newText.length
      
      return (suggestion: GrammarSuggestion) => {
        // If this suggestion comes after the applied one, adjust its position
        if (suggestion.start >= appliedSuggestion.end) {
          return {
            ...suggestion,
            start: suggestion.start - lengthDifference,
            end: suggestion.end - lengthDifference
          }
        }
        // If this suggestion overlaps with the applied one, it needs to be removed or adjusted
        else if (suggestion.end > appliedSuggestion.start && suggestion.start < appliedSuggestion.end) {
          return null // Remove overlapping suggestions
        }
        // If this suggestion comes before the applied one, keep it as is
        else {
          return suggestion
        }
      }
    }

    const applySuggestion = (suggestion: GrammarSuggestion) => {
      if (!editorRef.current) return

      const text = editorRef.current.innerText
      const appliedText = text.substring(suggestion.start, suggestion.end)

      // Create new text with the suggestion applied
      const newText = text.substring(0, suggestion.start) + suggestion.suggestion + text.substring(suggestion.end)

      // Update the editor content
      editorRef.current.innerText = newText
      // Use innerText instead of innerHTML to avoid HTML entities like &nbsp;
      onChange(editorRef.current.innerText)

      // Adjust positions of remaining suggestions and remove the applied one
      setSuggestions((prev) => {
        const adjustedSuggestions = prev
          .filter((s) => s !== suggestion) // Remove the applied suggestion
          .map(adjustSuggestionPositions(suggestion, appliedText, suggestion.suggestion))
          .filter((s): s is GrammarSuggestion => s !== null) // Remove null suggestions
        
        return adjustedSuggestions
      })
    }

    const dismissSuggestion = async (suggestion: GrammarSuggestion) => {
      // Dismiss the suggestion in the grammar checker
      if (editorRef.current) {
        const text = editorRef.current.innerText
        await dismissGrammarSuggestion(suggestion, text)
      }
      
      // Remove from local suggestions
      setSuggestions((prev) => prev.filter((s) => s !== suggestion))
    }

    // Ensure suggestions are passed to parent component whenever they change
    useEffect(() => {
      onSuggestionsChange?.(suggestions)
    }, [suggestions, onSuggestionsChange])

    // Function to get cursor position as character offset
    const getCaretCharacterOffsetWithin = (element: HTMLElement): number => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return 0

      const range = selection.getRangeAt(0)
      const preCaretRange = range.cloneRange()
      preCaretRange.selectNodeContents(element)
      preCaretRange.setEnd(range.endContainer, range.endOffset)
      return preCaretRange.toString().length
    }

    // Function to set cursor position from character offset
    const setCaretPosition = (element: HTMLElement, offset: number) => {
      const selection = window.getSelection()
      const range = document.createRange()

      let currentNode: Node | null = null
      let currentOffset = 0

      function traverse(node: Node): boolean {
        if (node.nodeType === Node.TEXT_NODE) {
          const textLength = (node.textContent || "").length
          if (currentOffset + textLength >= offset) {
            currentNode = node
            offset -= currentOffset
            return true
          }
          currentOffset += textLength
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            if (traverse(node.childNodes[i])) return true
          }
        }
        return false
      }

      traverse(element)

      if (currentNode && selection) {
        range.setStart(currentNode, offset)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }

    // Function to apply highlighting to text without moving cursor
    const applyHighlighting = useCallback(() => {
      if (!editorRef.current || suggestions.length === 0) return

      const editor = editorRef.current
      const text = editor.innerText
      
      // Save current selection and focus state
      const wasFocused = document.activeElement === editor
      const currentScrollTop = editor.scrollTop
      const currentScrollLeft = editor.scrollLeft
      
      // Save cursor position as character offset
      const cursorOffset = wasFocused ? getCaretCharacterOffsetWithin(editor) : 0
      
      // Create highlighted HTML
      let highlightedHTML = ''
      let currentPos = 0
      
      // Sort suggestions by start position
      const sortedSuggestions = [...suggestions].sort((a, b) => a.start - b.start)
      
      for (const suggestion of sortedSuggestions) {
        // Add text before this suggestion
        if (suggestion.start > currentPos) {
          highlightedHTML += text.substring(currentPos, suggestion.start)
        }
        
        // Add highlighted suggestion
        const suggestionText = text.substring(suggestion.start, suggestion.end)
        const color = suggestion.type === 'spelling' ? '#ef4444' : '#f59e0b'
        highlightedHTML += `<span style="text-decoration: underline; text-decoration-color: ${color}; text-decoration-thickness: 2px; text-underline-offset: 2px;">${suggestionText}</span>`
        
        currentPos = suggestion.end
      }
      
      // Add remaining text
      if (currentPos < text.length) {
        highlightedHTML += text.substring(currentPos)
      }
      
      // Update content
      editor.innerHTML = highlightedHTML
      
      // Restore scroll position
      editor.scrollTop = currentScrollTop
      editor.scrollLeft = currentScrollLeft
      
      // Restore focus and cursor position
      if (wasFocused) {
        editor.focus()
        setCaretPosition(editor, cursorOffset)
      }
    }, [suggestions])

    // Apply highlighting when suggestions change
    useEffect(() => {
      const timer = setTimeout(applyHighlighting, 50) // Small delay to ensure typing is complete
      return () => clearTimeout(timer)
    }, [suggestions, applyHighlighting])

    useImperativeHandle(ref, () => ({
      applySuggestion
    }))

    return (
      <div className="space-y-4">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-2xl font-bold border-none outline-none bg-gray-50 rounded-lg px-4 py-3 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
          placeholder="Document Title"
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-4">
            {/* Font Selection */}
            <select
              value={selectedFont}
              onChange={(e) => handleFontChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans Serif</option>
              <option value="monospace">Monospace</option>
            </select>

            {/* Formatting Buttons */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => execCommand("bold")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("italic")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("underline")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                title="Underline"
              >
                <Underline className="h-4 w-4" />
              </button>
            </div>

            {/* Alignment Buttons */}
            <div className="flex items-center space-x-1 border-l pl-4">
              <button
                type="button"
                onClick={() => execCommand("justifyLeft")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("justifyCenter")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand("justifyRight")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Grammar Check Controls */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleGrammarCheck(true)}
              disabled={isCheckingGrammar}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isCheckingGrammar ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-2"></div>
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check All
                </>
              )}
            </button>
          </div>
        </div>

        {/* Grammar Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-800 mb-3 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Writing Suggestion
            </h3>
            <div className="bg-white p-3 rounded border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="line-through text-red-600 font-medium">{suggestions[0].text}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 font-medium">{suggestions[0].suggestion}</span>
                  </div>
                  {suggestions[0].description && <p className="text-xs text-gray-500">{suggestions[0].description}</p>}
                  <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                    suggestions[0].type === 'spelling' 
                      ? 'bg-red-100 text-red-600' 
                      : suggestions[0].type === 'grammar'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {suggestions[0].type || "style"}
                  </span>
                  {suggestions.length > 1 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{suggestions.length - 1} more suggestion{suggestions.length > 2 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    type="button"
                    onClick={() => applySuggestion(suggestions[0])}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissSuggestion(suggestions[0])}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="min-h-96 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          style={{ fontFamily: selectedFont }}
          suppressContentEditableWarning={true}
          data-placeholder="Start writing your document..."
        />

        {/* Grammar Status */}
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>Auto-checking enabled • Spell check on spacebar • Style/grammar every 5s</span>
          {suggestions.length > 0 && (
            <span className="text-yellow-600">
              {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} found
            </span>
          )}
        </div>
      </div>
    )
  }
)
