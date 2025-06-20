"use client"

import { useState, useEffect, useRef } from "react"
import { BookOpen, Loader2, RefreshCw, AlertCircle, Info } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface PlotSummaryProps {
  content: string
}

interface PlotSummaryResponse {
  plotSummary: string[]
  actionableInsights: string[]
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
  let result = text
  
  // First pass: Convert **bold** to <strong> tags
  // Use a simple but effective approach
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Second pass: Convert *italic* to <em> tags
  // Only match single asterisks that aren't part of HTML tags
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  
  // Convert `code` to <code> tags
  result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
  
  // Convert line breaks to <br> tags
  result = result.replace(/\n/g, '<br>')
  
  return result
}

// Function to safely render HTML content
function createMarkup(htmlContent: string) {
  return { __html: htmlContent }
}

export function PlotSummary({ content }: PlotSummaryProps) {
  const [summary, setSummary] = useState<string[]>([])
  const [actionableInsights, setActionableInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [metadata, setMetadata] = useState<PlotSummaryResponse['metadata'] | null>(null)

  // Constants
  const MIN_TEXT_LENGTH = 100

  const generateSummary = async () => {
    const text = content.replace(/<[^>]*>/g, "").trim()

    if (!text || text.length < MIN_TEXT_LENGTH) {
      setSummary([])
      setError("")
      setMetadata(null)
      return
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
      
      if (!successData.plotSummary || successData.plotSummary.length === 0) {
        throw new Error("Generated plot summary is empty. Please try again.")
      }

      setSummary(successData.plotSummary)
      setActionableInsights(successData.actionableInsights)
      setMetadata(successData.metadata || null)
    } catch (error) {
      console.error("Plot summary error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unable to generate plot summary. Please try again."
      setError(errorMessage)
      setSummary([])
      setActionableInsights([])
      setMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  // Handle manual refresh
  const handleManualRefresh = () => {
    generateSummary()
  }

  const bulletPoints = summary

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
          <div className="space-y-6">
            {/* Plot Summary Section */}
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

            {/* Actionable Insights Section */}
            {actionableInsights.length > 0 && (
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <Info className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Writing Insights</span>
                </div>
                <div className="space-y-2">
                  {actionableInsights.map((insight, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold mt-0.5">→</span>
                      <div 
                        className="text-sm text-gray-700 leading-relaxed flex-1 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={createMarkup(markdownToHtml(insight))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {(bulletPoints.length > 0 || actionableInsights.length > 0) && !loading && !error && (
        <div className="text-xs text-gray-500 text-center">
          Summary generated by AI • Manual refresh only
        </div>
      )}
    </div>
  )
}
