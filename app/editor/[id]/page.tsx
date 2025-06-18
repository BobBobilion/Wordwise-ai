"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { getDocument, updateDocument } from "@/lib/firestore"
import type { Document } from "@/lib/types"
import { RichTextEditor, RichTextEditorRef } from "@/components/rich-text-editor"
import { Button } from "@/components/ui/button"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { ArrowLeft, Save, Loader2, BookOpen } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useDebounce } from "@/hooks/use-debounce"
import { WritingSidebar } from "@/components/sidebar/writing-sidebar"
import type { GrammarSuggestion } from "@/lib/types"
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
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
  const editorRef = useRef<RichTextEditorRef>(null)

  const documentId = params.id as string

  // Debounce content changes for autosave
  const debouncedContent = useDebounce(document?.content || "", 2000)
  const debouncedTitle = useDebounce(document?.title || "", 1000)

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

  const handleApplySuggestion = (suggestion: GrammarSuggestion) => {
    // Use the editor ref to apply the suggestion
    if (editorRef.current) {
      editorRef.current.applySuggestion(suggestion)
    }
  }

  const handleDismissSuggestion = (suggestion: GrammarSuggestion) => {
    setSuggestions((prev) => prev.filter((s) => s !== suggestion))
  }

  const handleBackToDashboard = async () => {
    // Save the document before navigating back
    if (document && !saving) {
      try {
        const cleanedContent = cleanTextContent(document.content)
        await updateDocument(documentId, {
          title: document.title,
          content: cleanedContent,
        })
        setLastSaved(new Date())
      } catch (error) {
        console.error("Failed to save document before navigation:", error)
      }
    }
    
    // Navigate back to dashboard
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <AuthGuard requireVerification>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                  <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Wordwise AI
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToDashboard}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-full">
                  {saving ? (
                    <span className="flex items-center">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </span>
                  ) : lastSaved ? (
                    `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
                  ) : (
                    "All changes saved"
                  )}
                </div>

                <DownloadButton document={document} />

                <Button 
                  onClick={saveDocument} 
                  disabled={saving} 
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                  <span className="ml-2 text-xs opacity-60">Ctrl+S</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex h-[calc(100vh-80px)]">
          <div className="flex-1 flex justify-center py-8 overflow-y-auto">
            <div className="max-w-4xl w-full px-4 sm:px-6 lg:px-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-8">
                <RichTextEditor
                  content={document.content}
                  onChange={handleContentChange}
                  title={document.title}
                  onTitleChange={handleTitleChange}
                  onSuggestionsChange={setSuggestions}
                  ref={editorRef}
                />
              </div>
            </div>
          </div>
          <WritingSidebar
            content={document.content}
            suggestions={suggestions}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
          />
        </main>

        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      </div>
    </AuthGuard>
  )
}
