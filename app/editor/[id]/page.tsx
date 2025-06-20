"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { getDocument, updateDocument } from "@/lib/firestore"
import type { Document, GrammarSuggestion, HighlightMark } from "@/lib/types"
import { RichTextEditor, RichTextEditorRef } from "@/components/rich-text-editor"
import { WritingSidebar, WritingSidebarRef } from "@/components/sidebar/writing-sidebar"
import { Button } from "@/components/ui/button"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { ArrowLeft, Save, Loader2, BookOpen } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useDebounce } from "@/hooks/use-debounce"
import { DownloadButton } from "@/components/ui/download-button"
import { cleanTextContent } from "@/lib/utils"

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [grammarSuggestions, setGrammarSuggestions] = useState<GrammarSuggestion[]>([])
  const [highlights, setHighlights] = useState<HighlightMark[]>([])
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'overview' | 'suggestions' | 'characters' | 'plot'>('overview')
  const [highlightedSuggestionId, setHighlightedSuggestionId] = useState<string | undefined>()
  const editorRef = useRef<RichTextEditorRef>(null)
  const sidebarRef = useRef<WritingSidebarRef>(null)
  const lastCheckedContentRef = useRef<string>('')

  const documentId = params.id as string

  // Debounce content changes for autosave
  const debouncedContent = useDebounce(document?.content || "", 2000)
  const debouncedTitle = useDebounce(document?.title || "", 1000)

  // Debounce the document content for automatic grammar checking
  const debouncedGrammarCheck = useDebounce(document?.content || '', 3000)

  useEffect(() => {
    if (documentId && user) {
      loadDocument()
    }
  }, [documentId, user])

  // Autosave effect
  useEffect(() => {
    if (document && (debouncedContent !== document.content || debouncedTitle !== document.title)) {
      saveDocument()
    }
  }, [debouncedContent, debouncedTitle])

  // Clear highlighted suggestion when suggestions change
  useEffect(() => {
    setHighlightedSuggestionId(undefined)
  }, [grammarSuggestions])

  // Automatic grammar checking when content changes (debounced)
  // useEffect(() => {
  //   if (debouncedGrammarCheck && debouncedGrammarCheck.trim() && !isCheckingGrammar) {
  //     // Only check if content has actually changed
  //     if (lastCheckedContentRef.current !== debouncedGrammarCheck) {
  //       lastCheckedContentRef.current = debouncedGrammarCheck
  //       checkGrammar(debouncedGrammarCheck)
  //     }
  //   }
  // }, [debouncedGrammarCheck])

  const loadDocument = async () => {
    try {
      const doc = await getDocument(documentId)
      if (!doc) {
        toast.error("Document not found")
        router.push("/dashboard")
        return
      }

      if (doc.userId !== user?.uid) {
        toast.error("You do not have permission to access this document")
        router.push("/dashboard")
        return
      }

      setDocument(doc)
    } catch (error) {
      toast.error("Failed to load document")
    } finally {
      setLoading(false)
    }
  }

  const saveDocument = useCallback(async () => {
    if (!document) return

    setSaving(true)
    try {
      const cleanedContent = cleanTextContent(document.content)
      await updateDocument(documentId, {
        title: document.title,
        content: cleanedContent,
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Failed to save document:", error)
    } finally {
      setSaving(false)
    }
  }, [document, documentId])

  // Update suggestion positions when text changes
  const updateSuggestionPositions = useCallback((oldContent: string, newContent: string, changeStart: number, changeEnd: number, newText: string) => {
    const originalLength = changeEnd - changeStart
    const newLength = newText.length
    const lengthDifference = newLength - originalLength
    
    if (lengthDifference === 0) return // No position changes needed
    
    setGrammarSuggestions(prev => prev.map(suggestion => {
      // If suggestion is completely before the change, keep it as is
      if (suggestion.end <= changeStart) {
        return suggestion
      }
      
      // If suggestion overlaps with the change, remove it
      if (suggestion.start < changeEnd && suggestion.end > changeStart) {
        return null
      }
      
      // If suggestion is completely after the change, adjust its position
      if (suggestion.start >= changeEnd) {
        return {
          ...suggestion,
          start: suggestion.start + lengthDifference,
          end: suggestion.end + lengthDifference
        }
      }
      
      return suggestion
    }).filter(Boolean) as GrammarSuggestion[])
  }, [])

  const checkGrammar = async (content: string) => {
    if (!content.trim() || isCheckingGrammar) return

    setIsCheckingGrammar(true)
    try {
      const response = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      })

      if (response.ok) {
        const data = await response.json()
        setGrammarSuggestions(data.suggestions || [])
        
        // Convert grammar suggestions to highlights
        const newHighlights: HighlightMark[] = data.suggestions.map((suggestion: GrammarSuggestion, index: number) => ({
          from: suggestion.start,
          to: suggestion.end,
          color: suggestion.type === 'grammar' ? 'red' : 'yellow',
          id: `grammar-${index}-${Date.now()}`,
        }))
        
        setHighlights(newHighlights)
      }
    } catch (error) {
      console.error('Failed to check grammar:', error)
    } finally {
      setIsCheckingGrammar(false)
    }
  }

  const handleApplySuggestion = (suggestion: GrammarSuggestion) => {
    if (!editorRef.current || !document) return

    // Get the editor instance
    const editor = editorRef.current
    
    // Get the current content before the change
    const oldContent = editor.getContent()
    
    // Try to find and replace the text starting from the suggested position
    const result = editor.findAndReplaceText(suggestion.text, suggestion.suggestion, suggestion.start)
    
    if (!result.success) {
      // If not found at the suggested position, search the entire document
      const fullResult = editor.findAndReplaceText(suggestion.text, suggestion.suggestion)
      
      if (!fullResult.success) {
        // Text not found anywhere in the document
        toast.error(`Could not find the text "${suggestion.text}" in the document. It may have been already corrected or removed.`)
        return
      }
    }
    
    // Update document content
    const newContent = editor.getContent()
    setDocument({ ...document, content: newContent })
    
    // Calculate the length difference between original text and suggestion
    const originalLength = suggestion.text.length
    const newLength = suggestion.suggestion.length
    const lengthDifference = newLength - originalLength
    
    // Update highlight positions for highlights that come after the change
    setHighlights(prev => prev.map(highlight => {
      // If highlight is completely before the change, keep it as is
      if (highlight.to <= suggestion.start) {
        return highlight
      }
      
      // If highlight overlaps with the change, remove it
      if (highlight.from < suggestion.end && highlight.to > suggestion.start) {
        return null
      }
      
      // If highlight is completely after the change, adjust its position
      if (highlight.from >= suggestion.end) {
        return {
          ...highlight,
          from: highlight.from + lengthDifference,
          to: highlight.to + lengthDifference
        }
      }
      
      return highlight
    }).filter(Boolean) as HighlightMark[])
    
    // Update suggestion positions for remaining suggestions
    updateSuggestionPositions(oldContent, newContent, suggestion.start, suggestion.end, suggestion.suggestion)
    
    // Remove the applied suggestion from the list
    setGrammarSuggestions(prev => prev.filter(s => 
      !(s.start === suggestion.start && s.end === suggestion.end && s.text === suggestion.text)
    ))
    
    // Show success toast
    toast.success(`Applied correction: "${suggestion.text}" → "${suggestion.suggestion}"`)
  }

  const handleDismissSuggestion = (suggestion: GrammarSuggestion) => {
    // Remove the highlight for this suggestion
    setHighlights(prev => prev.filter(h => 
      !(h.from === suggestion.start && h.to === suggestion.end && h.color === (suggestion.type === 'grammar' ? 'red' : 'yellow'))
    ))
    
    // Remove the suggestion from the list
    setGrammarSuggestions(prev => prev.filter(s => 
      !(s.start === suggestion.start && s.end === suggestion.end && s.text === suggestion.text)
    ))
  }

  const handleHighlightClick = (highlight: HighlightMark) => {
    // Find the corresponding suggestion
    const suggestion = grammarSuggestions.find(s => 
      s.start === highlight.from && s.end === highlight.to && 
      (s.type === 'grammar' ? 'red' : 'yellow') === highlight.color
    )
    
    if (suggestion) {
      // Print error reference to console
      console.log('🔍 Spelling Error Clicked:', {
        error: suggestion.text,
        suggestion: suggestion.suggestion,
        type: suggestion.type,
        description: suggestion.description,
        position: `from ${suggestion.start} to ${suggestion.end}`,
        color: highlight.color,
        highlightId: highlight.id
      })
      
      // Generate suggestion ID that matches the format in WritingSuggestions
      const suggestionId = `${suggestion.start}-${suggestion.end}-${suggestion.text}`
      
      // Switch sidebar to writing suggestions tab
      setActiveSidebarTab('suggestions')
      setHighlightedSuggestionId(suggestionId)
    }
  }

  const handleManualSpellCheck = () => {
    if (editorRef.current && !isCheckingGrammar) {
      const currentContent = editorRef.current.getContent()
      if (currentContent && currentContent.trim()) {
        // Reset last checked content to force a new check
        lastCheckedContentRef.current = ''
        checkGrammar(currentContent)
      }
    }
  }

  // Keyboard shortcut handler for Ctrl+S
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl+S is pressed (or Cmd+S on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault() // Prevent browser's default save behavior
        
        if (document && !saving) {
          saveDocument()
        }
      }
    }

    // Add event listener to the DOM document
    if (typeof window !== 'undefined') {
      window.document.addEventListener('keydown', handleKeyDown)

      // Cleanup
      return () => {
        window.document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [document, saving, saveDocument])

  const handleContentChange = (content: string) => {
    if (document) {
      setDocument({ ...document, content })
    }
  }

  const handleTitleChange = (title: string) => {
    if (document) {
      setDocument({ ...document, title })
    }
  }

  const handleBackToDashboard = async () => {
    // Save before leaving if there are unsaved changes
    if (document && !saving) {
      await saveDocument()
    }
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Loading document...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!document) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Document not found</p>
            <Button onClick={() => router.push("/dashboard")} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-sm border-b border-purple-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToDashboard}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div className="w-px h-6 bg-gray-300" />
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Editor</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {lastSaved && (
                  <span className="text-xs text-gray-500">
                    Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
                  </span>
                )}
                <Button
                  onClick={saveDocument}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <DownloadButton document={document} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex h-[calc(100vh-80px)]">
          <div className="flex-1 flex justify-center py-8 overflow-y-auto">
            <div className="max-w-4xl w-full px-4 sm:px-6 lg:px-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-8">
                <RichTextEditor
                  content={document.content}
                  onChange={handleContentChange}
                  title={document.title}
                  onTitleChange={handleTitleChange}
                  highlights={highlights}
                  onHighlightClick={handleHighlightClick}
                  onSpellCheck={handleManualSpellCheck}
                  isCheckingGrammar={isCheckingGrammar}
                  ref={editorRef}
                />
              </div>
            </div>
          </div>
          <WritingSidebar
            ref={sidebarRef}
            content={document.content}
            suggestions={grammarSuggestions}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            activeTab={activeSidebarTab}
            onTabChange={setActiveSidebarTab}
            highlightedSuggestionId={highlightedSuggestionId}
          />
        </main>

        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      </div>
    </AuthGuard>
  )
}
