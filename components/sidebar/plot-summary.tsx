"use client"

import { useState, useEffect, useRef } from "react"
import { BookOpen, Loader2, RefreshCw, AlertCircle, Info } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface PlotSummaryProps {
  content: string
}

interface PlotSummaryResponse {
  summary: string
  metadata?: {
    inputLength: number
    optimizedLength: number
    estimatedTokens: number
    model: string
  }
}

interface PlotSummaryError {
  error: string
}

// Function to convert markdown to HTML safely
function markdownToHtml(text: string): string {
  return text
    // Convert **bold** to <strong> tags
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em> tags
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert `code` to <code> tags
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
    // Convert line breaks to <br> tags
    .replace(/\n/g, '<br>')
}

// Function to safely render HTML content
function createMarkup(htmlContent: string) {
  return { __html: htmlContent }
}

export function PlotSummary({ content }: PlotSummaryProps) {
  const [summary, setSummary] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState("")
  const [metadata, setMetadata] = useState<PlotSummaryResponse['metadata'] | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [timeUntilNextUpdate, setTimeUntilNextUpdate] = useState<number>(0)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastContentRef = useRef<string>("")

  // Constants
  const UPDATE_INTERVAL = 300000 // 5 minutes in milliseconds
  const MIN_TEXT_LENGTH = 100
  const CONTENT_CHANGE_THRESHOLD = 20 // Only reset countdown if content changes by more than 20 characters

  const generateSummary = async (forceUpdate: boolean = false) => {
    const text = content.replace(/<[^>]*>/g, "").trim()

    if (!text || text.length < MIN_TEXT_LENGTH) {
      setSummary("Write more content to generate a plot summary...")
      setError("")
      setMetadata(null)
      return
    }

    // Check if we should update
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTime
    
    // Calculate character difference from last analyzed content
    const characterDifference = Math.abs(text.length - lastAnalyzedContent.length)
    const contentChanged = text !== lastAnalyzedContent
    
    if (!forceUpdate && !contentChanged) {
      return // Don't update if content hasn't changed
    }

    // Only reset countdown if content changed significantly or if forced update
    const shouldResetCountdown = forceUpdate || characterDifference > CONTENT_CHANGE_THRESHOLD
    
    if (!forceUpdate && timeSinceLastUpdate < UPDATE_INTERVAL && !shouldResetCountdown) {
      return // Don't update if not enough time has passed and change is minor
    }

    setLoading(true)
    setError("")
    setMetadata(null)
    
    try {
      const response = await fetch("/api/plot-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      const data: PlotSummaryResponse | PlotSummaryError = await response.json()

      if (!response.ok) {
        // Handle API errors with specific messages
        const errorData = data as PlotSummaryError
        throw new Error(errorData.error || "Failed to generate summary")
      }

      const successData = data as PlotSummaryResponse
      
      if (!successData.summary || successData.summary.trim().length === 0) {
        throw new Error("Generated summary is empty. Please try again.")
      }

      setSummary(successData.summary)
      setMetadata(successData.metadata || null)
      setLastAnalyzedContent(text)
      
      // Only update last update time if we're resetting the countdown
      if (shouldResetCountdown) {
        setLastUpdateTime(now)
      }
      
      lastContentRef.current = text
    } catch (error) {
      console.error("Plot summary error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unable to generate plot summary. Please try again."
      setError(errorMessage)
      setSummary("")
      setMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  // Handle manual refresh
  const handleManualRefresh = () => {
    generateSummary(true)
  }

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTime
      const remaining = Math.max(0, UPDATE_INTERVAL - timeSinceLastUpdate)
      setTimeUntilNextUpdate(remaining)
    }

    // Update countdown every second
    intervalRef.current = setInterval(updateCountdown, 1000)
    updateCountdown() // Initial update

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [lastUpdateTime])

  // Initial analysis when component loads with content
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, "").trim()
    if (text.length >= MIN_TEXT_LENGTH && !summary && !loading) {
      generateSummary()
    }
  }, []) // Only run once on mount

  // Check for content changes and auto-update every 5 minutes
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, "").trim()
    
    // Only run analysis if we have enough content and haven't analyzed this content before
    if (text.length >= MIN_TEXT_LENGTH && text !== lastAnalyzedContent) {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTime
      
      // Only auto-update if 5 minutes have passed since last update
      if (timeSinceLastUpdate >= UPDATE_INTERVAL) {
        generateSummary()
      }
    }
  }, [content, lastUpdateTime, lastAnalyzedContent])

  const formatBulletPoints = (text: string) => {
    // Split by bullet points and filter out empty lines
    const points = text
      .split(/(?:^|\n)(?:[•\-\*]\s*)/gm)
      .filter(point => point.trim().length > 0)
      .map(point => point.trim())

    return points
  }

  const bulletPoints = summary ? formatBulletPoints(summary) : []

  // Format countdown timer
  const formatCountdown = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Plot Summary</h3>
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Summary
              </>
            )}
          </button>
          {!loading && bulletPoints.length > 0 && (
            <span className="text-xs text-gray-500">
              Next update in {formatCountdown(timeUntilNextUpdate)}
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 min-h-32">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Generating plot summary...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
            <div className="text-sm text-red-600 text-center">
              <p className="font-medium">Analysis Failed</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        ) : bulletPoints.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Story Overview</span>
            </div>
            <div className="space-y-2">
              {bulletPoints.map((point, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <div 
                    className="text-sm text-gray-700 leading-relaxed flex-1 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={createMarkup(markdownToHtml(point))}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Write more content to generate a plot summary.</p>
            <p className="text-xs text-gray-500 mt-1">Minimum 100 words required.</p>
          </div>
        )}
      </div>

      {/* Metadata display */}
      {metadata && !loading && !error && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Analysis Details</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
            <div>
              <span className="font-medium">Input:</span> {metadata.inputLength} chars
            </div>
            <div>
              <span className="font-medium">Processed:</span> {metadata.optimizedLength} chars
            </div>
            <div>
              <span className="font-medium">Tokens:</span> ~{metadata.estimatedTokens}
            </div>
            <div>
              <span className="font-medium">Model:</span> {metadata.model}
            </div>
          </div>
        </div>
      )}

      {bulletPoints.length > 0 && !loading && !error && (
        <div className="text-xs text-gray-500 text-center">
          Summary generated by AI • Updates every 5 minutes or on manual refresh
        </div>
      )}
    </div>
  )
}
