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
import { cleanTextContent, collectAnalysisData } from "@/lib/utils"

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
  const [isHighlightClick, setIsHighlightClick] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const editorRef = useRef<RichTextEditorRef>(null)
  const sidebarRef = useRef<WritingSidebarRef>(null)
  const lastCheckedContentRef = useRef<string>('')
  
  // Style checking state
  const [styleSuggestions, setStyleSuggestions] = useState<GrammarSuggestion[]>([])
  const [isCheckingStyle, setIsCheckingStyle] = useState(false)
  const lastCheckedStyleContentRef = useRef<string>('')
  
  // Analysis data loading state
  const [loadedAnalysisData, setLoadedAnalysisData] = useState<{
    writingAnalysis?: any
    characters?: any[]
    plotSummary?: any
    plotSuggestions?: string[]
    selectedSuggestions?: Set<number>
  } | undefined>(undefined)
  const [analysisDataLoaded, setAnalysisDataLoaded] = useState(false)

  const documentId = params.id as string

  // Debounce content changes for autosave
  const debouncedContent = useDebounce(document?.content || "", 5000)
  const debouncedTitle = useDebounce(document?.title || "", 5000)

  // Debounce the document content for automatic grammar checking
  const debouncedGrammarCheck = useDebounce(document?.content || '', 3000)
  
  // Debounce the document content for automatic style checking (5 seconds)
  const debouncedStyleCheck = useDebounce(document?.content || '', 5000)

  useEffect(() => {
    if (documentId && user) {
      loadDocument()
    }
  }, [documentId, user])

  // Autosave effect - save every 5 seconds
  useEffect(() => {
    if (document) {
      saveDocument()
    }
  }, [debouncedContent, debouncedTitle])

  // Clear highlighted suggestion when suggestions change
  useEffect(() => {
    setHighlightedSuggestionId(undefined)
  }, [grammarSuggestions])

  // Automatic grammar checking when content changes (debounced)
  useEffect(() => {
    if (debouncedGrammarCheck && debouncedGrammarCheck.trim() && !isCheckingGrammar && !isHighlightClick) {
      // Only check if content has actually changed
      if (lastCheckedContentRef.current !== debouncedGrammarCheck) {
        lastCheckedContentRef.current = debouncedGrammarCheck
        checkGrammar(debouncedGrammarCheck)
      }
    }
  }, [debouncedGrammarCheck, isHighlightClick])

  // Automatic style checking when content changes (debounced - 5 seconds)
  useEffect(() => {
    if (debouncedStyleCheck && debouncedStyleCheck.trim() && !isCheckingStyle && !isHighlightClick) {
      // Only check if content has actually changed
      if (lastCheckedStyleContentRef.current !== debouncedStyleCheck) {
        lastCheckedStyleContentRef.current = debouncedStyleCheck
        checkStyle(debouncedStyleCheck)
      }
    }
  }, [debouncedStyleCheck, isHighlightClick])

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
      
      // Extract saved analysis data
      if (doc.analysis) {
        const analysisData = {
          writingAnalysis: doc.analysis.writingAnalysis,
          characters: doc.analysis.characters,
          plotSummary: doc.analysis.plotSummary,
          plotSuggestions: doc.analysis.plotSuggestions || [],
          selectedSuggestions: doc.analysis.selectedSuggestions ? new Set(doc.analysis.selectedSuggestions as number[]) : new Set<number>()
        }
        console.log('Loading saved analysis data:', analysisData)
        setLoadedAnalysisData(analysisData)
        setAnalysisDataLoaded(true)
      } else {
        setLoadedAnalysisData(undefined)
        setAnalysisDataLoaded(false)
      }
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
      
      // Collect analysis data from sidebar components
      let analysisData = undefined
      if (sidebarRef.current) {
        const analysis = sidebarRef.current.getAnalysisData()
        analysisData = collectAnalysisData(
          analysis.plotSummary,
          analysis.characters,
          analysis.writingAnalysis
        )
        
        // Add plot suggestions and selected suggestions if available
        if (analysisData && sidebarRef.current.getPlotSuggestionsData) {
          const plotSuggestionsData = sidebarRef.current.getPlotSuggestionsData()
          if (plotSuggestionsData) {
            analysisData.plotSuggestions = plotSuggestionsData.suggestions
            analysisData.selectedSuggestions = Array.from(plotSuggestionsData.selectedSuggestions)
            console.log('Saving plot suggestions data:', plotSuggestionsData)
          }
        }
      }
      
      await updateDocument(documentId, {
        title: document.title,
        content: cleanedContent,
        analysis: analysisData
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
    
    const updateSuggestions = (suggestions: GrammarSuggestion[]) => suggestions.map(suggestion => {
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
    }).filter(Boolean) as GrammarSuggestion[]
    
    setGrammarSuggestions(prev => updateSuggestions(prev))
    setStyleSuggestions(prev => updateSuggestions(prev))
  }, [])

  const checkGrammar = async (content: string) => {
    if (!content.trim() || isCheckingGrammar) return

    // Convert HTML to plain text before sending to Harper.js
    const plainText = cleanTextContent(content)

    setIsCheckingGrammar(true)
    try {
      const response = await fetch('/api/harper-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: plainText }),
      })

      if (response.ok) {
        const data = await response.json()
        setGrammarSuggestions(data.suggestions || [])
        
        // Convert grammar suggestions to highlights
        const newHighlights: HighlightMark[] = data.suggestions.map((suggestion: GrammarSuggestion, index: number) => ({
          from: suggestion.start,
          to: suggestion.end,
          color: suggestion.type === 'spelling' ? 'red' : suggestion.type === 'grammar' ? 'yellow' : 'purple',
          id: `harper-${index}-${Date.now()}`,
        }))
        
        setHighlights(newHighlights)
      }
    } catch (error) {
      console.error('Failed to check grammar and spelling:', error)
    } finally {
      setIsCheckingGrammar(false)
    }
  }

  const checkStyle = async (content: string) => {
    if (!content.trim() || isCheckingStyle) return

    // Convert HTML to plain text before sending to style check API
    const plainText = cleanTextContent(content)

    setIsCheckingStyle(true)
    try {
      const response = await fetch('/api/style-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: plainText }),
      })

      if (response.ok) {
        const data = await response.json()
        const receivedSuggestions = data.suggestions || []

        const correctedSuggestions = receivedSuggestions.map((suggestion: GrammarSuggestion) => {
            const { text, start: inaccurateStart } = suggestion

            // The AI isn't perfect at locating text. We use its 'start' as a hint to find the real position.
            const searchOffset = 100 // Search in a window of 100 chars
            const searchStartIndex = Math.max(0, inaccurateStart - searchOffset)
            
            const foundIndex = plainText.indexOf(text, searchStartIndex)

            // Check if the found text is reasonably close to the original suggestion
            if (foundIndex !== -1 && Math.abs(foundIndex - inaccurateStart) < (searchOffset * 2)) {
                return {
                    ...suggestion,
                    start: foundIndex,
                    end: foundIndex + text.length,
                }
            }
            
            // Fallback: If not found near the hint, try a global search from the beginning.
            const globalFoundIndex = plainText.indexOf(text)
            if (globalFoundIndex !== -1) {
                return {
                    ...suggestion,
                    start: globalFoundIndex,
                    end: globalFoundIndex + text.length
                }
            }
            
            // If we can't find the text at all, discard the suggestion.
            return null
        }).filter(Boolean) as GrammarSuggestion[]

        setStyleSuggestions(correctedSuggestions)
        
        // Convert style suggestions to highlights
        const styleHighlights: HighlightMark[] = correctedSuggestions.map((suggestion, index) => ({
            from: suggestion.start,
            to: suggestion.end,
            color: 'purple',
            id: `style-${index}-${Date.now()}`,
        }))

        // To prevent duplicate or stale highlights, remove old style highlights before adding new ones.
        setHighlights(prev => {
            const nonStyleHighlights = prev.filter(h => !h.id.startsWith('style-'))
            return [...nonStyleHighlights, ...styleHighlights]
        })
      }
    } catch (error) {
      console.error('Failed to check style:', error)
    } finally {
      setIsCheckingStyle(false)
    }
  }

  const handleApplySuggestion = (suggestion: GrammarSuggestion) => {
    if (!editorRef.current || !document) return

    // Get the editor instance
    const editor = editorRef.current
    
    // Get the current content before the change
    const oldContent = editor.getContent()
    
    // ✅ FIXED: Use exact position-based replacement with the chosen replacement text
    try {
      editor.replaceText(suggestion.start + 1, suggestion.end + 1, suggestion.suggestion)
    } catch (error) {
      // Fallback: if position-based replacement fails, try text search
      console.warn('Position-based replacement failed, falling back to text search for:', suggestion.text)
      const searchResult = editor.findAndReplaceText(suggestion.text, suggestion.suggestion, suggestion.start)
      
      if (!searchResult.success) {
        toast.error(`Could not find the text "${suggestion.text}" at the expected position. It may have been already corrected or removed.`)
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
    
    // Remove the applied suggestion from the appropriate list
    if (suggestion.type === 'style') {
      setStyleSuggestions(prev => prev.filter(s => 
        !(s.start === suggestion.start && s.end === suggestion.end && s.text === suggestion.text)
      ))
    } else {
      setGrammarSuggestions(prev => prev.filter(s => 
        !(s.start === suggestion.start && s.end === suggestion.end && s.text === suggestion.text)
      ))
    }
  }

  const handleDismissSuggestion = (suggestion: GrammarSuggestion) => {
    // Remove the highlight for this suggestion
    setHighlights(prev => prev.filter(h => 
      !(h.from === suggestion.start && h.to === suggestion.end && 
        h.color === (suggestion.type === 'spelling' ? 'red' : suggestion.type === 'grammar' ? 'yellow' : 'purple'))
    ))
    
    // Remove the suggestion from the appropriate list
    if (suggestion.type === 'style') {
      setStyleSuggestions(prev => prev.filter(s => 
        !(s.start === suggestion.start && s.end === suggestion.end && s.text === suggestion.text)
      ))
    } else {
      setGrammarSuggestions(prev => prev.filter(s => 
        !(s.start === suggestion.start && s.end === suggestion.end && s.text === suggestion.text)
      ))
    }
  }

  const handleHighlightClick = (highlight: HighlightMark) => {
    // Set flag to prevent automatic grammar check during highlight click
    setIsHighlightClick(true)
    
    // Find the corresponding suggestion from both grammar and style suggestions
    const suggestion = [...grammarSuggestions, ...styleSuggestions].find(s => 
      s.start === highlight.from && s.end === highlight.to && 
      (s.type === 'spelling' ? 'red' : s.type === 'grammar' ? 'yellow' : 'purple') === highlight.color
    )
    
    if (suggestion) {
      // Generate suggestion ID that matches the format in WritingSuggestions
      const suggestionId = `${suggestion.start}-${suggestion.end}-${suggestion.text}`
      
      // Set the card as selected to make the highlight persistent
      setSelectedCardId(suggestionId)
      
      // Switch sidebar to writing suggestions tab
      setActiveSidebarTab('suggestions')
      setHighlightedSuggestionId(suggestionId)
    }
    
    // Reset the flag after a short delay to allow the click to complete
    setTimeout(() => {
      setIsHighlightClick(false)
    }, 100)
  }

  const handleCardClick = (suggestion: GrammarSuggestion | null) => {
    if (suggestion) {
      // Card was clicked - select it and keep highlight on
      const suggestionId = `${suggestion.start}-${suggestion.end}-${suggestion.text}`
      setSelectedCardId(suggestionId)
      setHighlightedSuggestionId(suggestionId)
      
      // Scroll the editor to the error position
      if (editorRef.current) {
        editorRef.current.scrollToPosition(suggestion.start)
      }
    } else {
      // Card selection was cleared (clicked outside or switched tabs)
      setSelectedCardId(null)
      setHighlightedSuggestionId(undefined)
    }
  }

  // Create persistent highlight for selected card
  const persistentHighlight = selectedCardId ? (() => {
    const selectedSuggestion = [...grammarSuggestions, ...styleSuggestions].find(s => {
      const suggestionId = `${s.start}-${s.end}-${s.text}`
      return suggestionId === selectedCardId
    })
    
    if (selectedSuggestion) {
      return {
        from: selectedSuggestion.start,
        to: selectedSuggestion.end,
        color: selectedSuggestion.type === 'spelling' ? 'red' : selectedSuggestion.type === 'grammar' ? 'yellow' : 'purple',
        id: `persistent-${selectedCardId}`
      }
    }
    return null
  })() : null

  const handleTabChange = (tab: 'overview' | 'suggestions' | 'characters' | 'plot') => {
    // Clear card selection when switching tabs
    setSelectedCardId(null)
    setHighlightedSuggestionId(undefined)
    setActiveSidebarTab(tab)
  }

  const handleManualSpellCheck = () => {
    if (editorRef.current && !isCheckingGrammar && !isCheckingStyle) {
      const currentContent = editorRef.current.getContent()
      if (currentContent && currentContent.trim()) {
        // Reset last checked content to force a new check for both grammar and style
        lastCheckedContentRef.current = ''
        lastCheckedStyleContentRef.current = ''
        checkGrammar(currentContent)
        checkStyle(currentContent)
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

  const generateNameVariations = (fullName: string) => {
    const variations: Array<{text: string, type: 'first' | 'last' | 'full'}> = []
    const nameParts = fullName.trim().split(/\s+/)
    
    if (nameParts.length === 0) return variations
    
    // Always add full name
    variations.push({ text: fullName, type: 'full' })
    
    if (nameParts.length === 1) {
      // Single name - treat as both first and last name
      variations.push({ text: nameParts[0], type: 'first' })
      variations.push({ text: nameParts[0], type: 'last' })
    } else {
      // Multiple names
      // First name: everything except the last term
      const firstName = nameParts.slice(0, -1).join(' ')
      variations.push({ text: firstName, type: 'first' })
      
      // Last name: only the last term
      const lastName = nameParts[nameParts.length - 1]
      variations.push({ text: lastName, type: 'last' })
    }
    
    return variations
  }

  const handleCharacterNameChange = async (oldName: string, newName: string) => {
    if (!document || !editorRef.current) return

    // Get the current content from the editor
    const currentContent = editorRef.current.getContent()
    
    // Create a temporary div to parse HTML content
    const tempDiv = window.document.createElement('div')
    tempDiv.innerHTML = currentContent
    
    // Get the text content for replacement
    const textContent = tempDiv.textContent || tempDiv.innerText || ''
    
    // Generate name variations for comprehensive replacement
    const oldVariations = generateNameVariations(oldName)
    const newVariations = generateNameVariations(newName)
    let newTextContent = textContent
    
    // Create a map of old variation types to new names
    const replacementMap = new Map<string, string>()
    
    // Map each type to the appropriate new name
    oldVariations.forEach(oldVar => {
      if (oldVar.type === 'full') {
        replacementMap.set(oldVar.text, newName)
      } else if (oldVar.type === 'first') {
        // Find the new first name
        const newFirstName = newVariations.find(v => v.type === 'first')
        replacementMap.set(oldVar.text, newFirstName?.text || newName)
      } else if (oldVar.type === 'last') {
        // Find the new last name
        const newLastName = newVariations.find(v => v.type === 'last')
        replacementMap.set(oldVar.text, newLastName?.text || newName)
      }
    })
    
    // Perform replacements
    replacementMap.forEach((newText, oldText) => {
      const regex = new RegExp(`\\b${escapeRegExp(oldText)}\\b`, 'gi')
      newTextContent = newTextContent.replace(regex, newText)
    })
    
    // Update the HTML content by replacing the text content
    const newHtmlContent = currentContent.replace(textContent, newTextContent)
    
    // Update the document content
    setDocument({ ...document, content: newHtmlContent })
    
    // Update the editor content
    editorRef.current.setContent(newHtmlContent)
    
    // Save the document
    await saveDocument()
  }

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
                  persistentHighlight={persistentHighlight}
                  onHighlightClick={handleHighlightClick}
                  onSpellCheck={handleManualSpellCheck}
                  isCheckingGrammar={isCheckingGrammar}
                  onEditorClick={() => {
                    setSelectedCardId(null)
                    setHighlightedSuggestionId(undefined)
                  }}
                  grammarSuggestions={grammarSuggestions}
                  onApplySuggestion={handleApplySuggestion}
                  ref={editorRef}
                />
              </div>
            </div>
          </div>
          <WritingSidebar
            ref={sidebarRef}
            content={document.content}
            suggestions={[...grammarSuggestions, ...styleSuggestions]}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            activeTab={activeSidebarTab}
            onTabChange={handleTabChange}
            highlightedSuggestionId={highlightedSuggestionId}
            onCardClick={handleCardClick}
            selectedCardId={selectedCardId}
            onCharacterNameChange={handleCharacterNameChange}
            loadedAnalysisData={loadedAnalysisData}
            isCheckingGrammar={isCheckingGrammar}
            isCheckingStyle={isCheckingStyle}
          />
        </main>

        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      </div>
    </AuthGuard>
  )
}
