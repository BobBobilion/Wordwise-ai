"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { getUserDocuments, createDocument, deleteDocument } from "@/lib/firestore"
import type { Document } from "@/lib/types"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Plus, FileText, LogOut, Loader2, Trash2, BookOpen, Search, Upload } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { DownloadButton } from "@/components/ui/download-button"
import React from "react"

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<"modified-desc" | "modified-asc" | "created-desc" | "created-asc">("modified-desc")

  // Color mapping functions from sidebar
  const getMoodColor = (mood: string) => {
    const colors: Record<string, string> = {
      happy: "bg-yellow-100 text-yellow-800",
      sad: "bg-blue-100 text-blue-800",
      angry: "bg-red-100 text-red-800",
      mysterious: "bg-purple-100 text-purple-800",
      romantic: "bg-pink-100 text-pink-800",
      adventurous: "bg-green-100 text-green-800",
      tense: "bg-orange-100 text-orange-800",
      melancholic: "bg-indigo-100 text-indigo-800",
      hopeful: "bg-emerald-100 text-emerald-800",
      dark: "bg-gray-800 text-gray-100",
      peaceful: "bg-teal-100 text-teal-800",
      exciting: "bg-red-100 text-red-800",
      nostalgic: "bg-amber-100 text-amber-800",
      neutral: "bg-gray-100 text-gray-800",
    }
    return colors[mood.toLowerCase()] || colors.neutral
  }

  const getGenreColor = (genre: string) => {
    const colors: Record<string, string> = {
      "Science Fiction": "bg-purple-100 text-purple-800",
      "Fantasy": "bg-indigo-100 text-indigo-800",
      "Mystery": "bg-gray-100 text-gray-800",
      "Romance": "bg-pink-100 text-pink-800",
      "Thriller": "bg-red-100 text-red-800",
      "Horror": "bg-gray-800 text-gray-100",
      "Adventure": "bg-green-100 text-green-800",
      "Historical Fiction": "bg-amber-100 text-amber-800",
      "Literary Fiction": "bg-blue-100 text-blue-800",
      "Young Adult": "bg-emerald-100 text-emerald-800",
      "Children's": "bg-yellow-100 text-yellow-800",
      "Non-Fiction": "bg-teal-100 text-teal-800",
      "Biography": "bg-orange-100 text-orange-800",
      "Memoir": "bg-rose-100 text-rose-800",
      "General Fiction": "bg-indigo-100 text-indigo-800",
    }
    return colors[genre] || colors["General Fiction"]
  }

  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [user])

  const loadDocuments = async () => {
    if (!user) return

    try {
      const userDocs = await getUserDocuments(user.uid)
      setDocuments(userDocs)
    } catch (error) {
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDocument = async () => {
    if (!user) return

    setCreating(true)
    try {
      const docId = await createDocument(user.uid, "Untitled Document")
      router.push(`/editor/${docId}`)
    } catch (error) {
      toast.error("Failed to create document")
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!user) return

    const allowedTypes = ["text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".doc") && !file.name.endsWith(".docx")) {
      toast.error("Only .doc, .docx, or .txt files are supported.")
      return
    }

    let content = ""
    try {
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        content = await file.text()
      } else {
        // For .doc/.docx, show error for now (implement parsing later)
        toast.error(".doc and .docx upload coming soon.")
        return
      }
      const docId = await createDocument(user.uid, file.name.replace(/\.[^/.]+$/, ""), content)
      router.push(`/editor/${docId}`)
    } catch (error) {
      toast.error("Failed to upload file.")
    }
  }

  const handleDeleteClick = (docId: string) => {
    setPendingDelete(docId)
    setShowConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeletingId(pendingDelete)
    try {
      await deleteDocument(pendingDelete)
      setDocuments((docs) => docs.filter((d) => d.id !== pendingDelete))
      toast.success("Document deleted successfully.")
    } catch (error) {
      toast.error("Failed to delete document.")
    } finally {
      setDeletingId(null)
      setPendingDelete(null)
      setShowConfirm(false)
    }
  }

  const handleCancelDelete = () => {
    setShowConfirm(false)
    setPendingDelete(null)
  }

  const filteredDocuments = searchQuery.trim()
    ? documents.filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents

  // Memoized sorted documents based on selected option
  const sortedDocuments = React.useMemo(() => {
    const docs = [...filteredDocuments]
    switch (sortOption) {
      case "modified-desc":
        return docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      case "modified-asc":
        return docs.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      case "created-desc":
        return docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      case "created-asc":
        return docs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      default:
        return docs
    }
  }, [filteredDocuments, sortOption])

  return (
    <AuthGuard requireVerification>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Wordwise AI
                  </h1>
                  <p className="text-sm text-gray-600">My Documents</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-full">
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-purple-200 shadow-sm text-sm font-medium rounded-lg text-purple-700 bg-white/70 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Action Bar */}
          <div className="mb-8">
            <div className="flex gap-4 flex-wrap items-center">
              <button
                onClick={handleCreateDocument}
                disabled={creating}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-all duration-200"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    New Document
                  </>
                )}
              </button>
              
              <button
                type="button"
                className="inline-flex items-center px-4 py-3 border border-purple-200 text-sm font-medium rounded-lg shadow-sm text-purple-700 bg-white/70 hover:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                onClick={handleUploadClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </button>
              
              <div className="flex-1 min-w-[300px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white/70 backdrop-blur-sm"
                />
              </div>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="px-4 py-3 border border-purple-200 rounded-lg shadow-sm bg-white/70 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Sort documents"
              >
                <option value="modified-desc">Most recently modified</option>
                <option value="modified-asc">Least recently modified</option>
                <option value="created-desc">Most recently created</option>
                <option value="created-asc">Least recently created</option>
              </select>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Documents Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            </div>
          ) : sortedDocuments.length === 0 ? (
            <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-xl shadow-lg">
              <FileText className="mx-auto h-16 w-16 text-purple-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {searchQuery ? 'No matching documents' : 'No documents yet'}
              </h3>
              <p className="mt-2 text-gray-600">
                {searchQuery ? 'Try a different search term.' : 'Get started by creating your first document.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreateDocument}
                  className="mt-4 inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg rounded-xl cursor-pointer hover:shadow-xl transition-all duration-200 border border-purple-100 hover:border-purple-200"
                  onClick={() => router.push(`/editor/${doc.id}`)}
                >
                  <div className="p-6 pb-12">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 hover:underline cursor-pointer transition-all duration-200">
                        {doc.title}
                      </h3>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DownloadButton document={doc} />
                      </div>
                    </div>
                    <p className="text-sm text-purple-600 font-medium mb-2">
                      Modified {formatDistanceToNow(doc.updatedAt, { addSuffix: true })}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                      {doc.content.replace(/<[^>]*>/g, "").substring(0, 150)}...
                    </p>
                    
                    {/* Analysis Information */}
                    {doc.analysis && (
                      <div className="space-y-2 mb-4">
                        {/* Genre and Mood */}
                        {doc.analysis.writingAnalysis && (
                          <div className="space-y-2">
                            {/* Genre */}
                            <div className="flex flex-wrap gap-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getGenreColor(doc.analysis.writingAnalysis.genre)} transition-all duration-200 hover:scale-102 hover:shadow-md cursor-pointer`}>
                                {doc.analysis.writingAnalysis.genre}
                              </span>
                            </div>
                            {/* Moods */}
                            <div className="flex flex-wrap gap-1">
                              {doc.analysis.writingAnalysis.mood.map((mood, index) => (
                                <span key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(mood)} transition-all duration-200 hover:scale-102 hover:shadow-md cursor-pointer`}>
                                  {mood}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Character Count */}
                        {doc.analysis.characters && doc.analysis.characters.length > 0 && (
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="mr-1">👥</span>
                            {doc.analysis.characters.length} character{doc.analysis.characters.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        
                        {/* Plot Summary Status */}
                        {doc.analysis.plotSummary && (
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="mr-1">📖</span>
                            {doc.analysis.plotSummary.plotSummary.length} plot point{doc.analysis.plotSummary.plotSummary.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <button
                      className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-red-100 text-red-600 z-10 transition-colors duration-200"
                      onClick={e => { e.stopPropagation(); handleDeleteClick(doc.id) }}
                      disabled={deletingId === doc.id}
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
        
        {/* Delete Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Delete Document?
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete "{documents.find(d => d.id === pendingDelete)?.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors duration-200"
                  onClick={handleCancelDelete}
                  disabled={deletingId !== null}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
                  onClick={handleConfirmDelete}
                  disabled={deletingId !== null}
                >
                  {deletingId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
