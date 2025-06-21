"use client"

import { useState, useEffect, useRef } from "react"
import { BookOpen, Loader2, RefreshCw, AlertCircle, Info, Lightbulb, Eye } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { TensionChart } from "./tension-chart"

interface PlotSummaryProps {
  content: string
}

interface PlotPoint {
  point: string
  tension: number
}

interface PlotSummaryResponse {
  plotSummary: PlotPoint[]
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

interface PlotSuggestionsResponse {
  suggestions: string[]
  metadata?: {
    inputPlotPoints: number
    model: string
  }
}

interface PlotSuggestionsError {
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
  const [summary, setSummary] = useState<PlotPoint[]>([])
  const [actionableInsights, setActionableInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [metadata, setMetadata] = useState<PlotSummaryResponse['metadata'] | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  
  // Plot suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string>("")
  const [suggestionsMetadata, setSuggestionsMetadata] = useState<PlotSuggestionsResponse['metadata'] | null>(null)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())

  // Constants
  const MIN_TEXT_LENGTH = 100

  const generateSummary = async () => {
    const text = content.replace(/<[^>]*>/g, "").trim()

    if (!text || text.length < MIN_TEXT_LENGTH) {
      setSummary([])
      setError("")
      setMetadata(null)
      setSelectedPoint(null)
      setSuggestions([])
      setSelectedSuggestions(new Set())
      return
    }

    setLoading(true)
    setError("")
    setMetadata(null)
    setSelectedPoint(null)
    
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
      setSelectedPoint(null)
      setSuggestions([])
      setSelectedSuggestions(new Set())
    } finally {
      setLoading(false)
    }
  }

  // Generate plot suggestions
  const generateSuggestions = async () => {
    if (summary.length < 2) {
      setSuggestionsError("Need at least 2 plot points to generate suggestions")
      return
    }

    setSuggestionsLoading(true)
    setSuggestionsError("")
    setSuggestionsMetadata(null)
    
    try {
      // Determine if this is a partial regeneration
      const selectedIndices = Array.from(selectedSuggestions)
      const isPartialRegeneration = suggestions.length > 0 && selectedIndices.length > 0 && selectedIndices.length < 3
      
      const requestBody = isPartialRegeneration 
        ? { 
            plotPoints: summary, 
            selectedSuggestions: selectedIndices,
            existingSuggestions: suggestions
          }
        : { plotPoints: summary }

      const response = await fetch("/api/plot-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data: PlotSuggestionsResponse | PlotSuggestionsError = await response.json()

      if (!response.ok) {
        const errorData = data as PlotSuggestionsError
        throw new Error(errorData.error || "Failed to generate suggestions")
      }

      const successData = data as PlotSuggestionsResponse
      
      if (!successData.suggestions || successData.suggestions.length === 0) {
        throw new Error("Generated suggestions are empty. Please try again.")
      }

      setSuggestions(successData.suggestions)
      setSuggestionsMetadata(successData.metadata || null)
      
      // For partial regeneration, keep the selected suggestions selected
      if (isPartialRegeneration) {
        // The selected suggestions should remain selected since they're preserved
        // No need to modify selectedSuggestions state
      } else {
        // For full regeneration, clear all selections
        setSelectedSuggestions(new Set())
      }
    } catch (error) {
      console.error("Plot suggestions error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unable to generate plot suggestions. Please try again."
      setSuggestionsError(errorMessage)
      setSuggestions([])
      setSuggestionsMetadata(null)
      setSelectedSuggestions(new Set())
    } finally {
      setSuggestionsLoading(false)
    }
  }

  // Handle manual refresh
  const handleManualRefresh = () => {
    generateSummary()
  }

  // Handle point selection from tension chart
  const handlePointClick = (index: number) => {
    setSelectedPoint(selectedPoint === index ? null : index)
  }

  // Handle suggestion toggle
  const handleSuggestionToggle = (index: number) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
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
        ) : summary.length > 0 ? (
          <div className="space-y-6">
            {/* Plot Summary Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Story Overview</span>
              </div>
              <div className="space-y-2">
                {summary.map((plotPoint, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start space-x-2 p-2 rounded transition-all duration-200 cursor-pointer hover:bg-gray-50 hover:shadow-sm hover:scale-[1.01] ${
                      selectedPoint === index ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                    onClick={() => handlePointClick(index)}
                    onMouseEnter={() => setHoveredPoint(index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <span className="text-blue-600 font-bold mt-0.5 min-w-[20px]">{index + 1}.</span>
                    <div 
                      className="text-sm text-gray-700 leading-relaxed flex-1 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={createMarkup(markdownToHtml(plotPoint.point))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tension Chart Section */}
            <TensionChart 
              plotSummary={summary}
              onPointClick={handlePointClick}
              selectedPoint={selectedPoint}
              hoveredPoint={hoveredPoint}
            />

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

            {/* Plot Suggestions Section */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Plot Continuation Ideas</span>
                </div>
                <button
                  onClick={generateSuggestions}
                  disabled={suggestionsLoading}
                  className="inline-flex items-center px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
                >
                  {suggestionsLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : suggestions.length > 0 ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {selectedSuggestions.size > 0 && selectedSuggestions.size < 3 
                        ? `Regenerate ${3 - selectedSuggestions.size}`
                        : 'Regenerate All'
                      }
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Generate
                    </>
                  )}
                </button>
              </div>

              {suggestionsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="ml-2 text-xs text-gray-600">Generating plot suggestions...</span>
                </div>
              ) : suggestionsError ? (
                <div className="flex items-center justify-center py-4">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <div className="text-xs text-red-600 text-center">
                    <p className="font-medium">Failed to generate suggestions</p>
                    <p className="text-xs mt-1">{suggestionsError}</p>
                  </div>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => {
                    const isSelected = selectedSuggestions.has(index)
                    return (
                      <div key={index} className="relative group">
                        <div 
                          className={`flex items-start space-x-2 p-2 rounded bg-white border transition-all duration-300 cursor-pointer ${
                            isSelected 
                              ? 'border-2 border-purple-400 shadow-sm bg-purple-50' 
                              : 'border-2 border-gray-200 hover:border-purple-400'
                          }`}
                          onClick={() => handleSuggestionToggle(index)}
                        >
                          <span className="text-purple-600 font-bold mt-0.5 min-w-[20px]">{index + 1}.</span>
                          <div 
                            className="text-sm text-gray-700 leading-relaxed flex-1 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={createMarkup(markdownToHtml(suggestion))}
                          />
                        </div>
                        
                        {/* Blur overlay - only show if not selected */}
                        {!isSelected && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded border border-gray-200 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 cursor-pointer pointer-events-none">
                            <div className="flex items-center space-x-2 text-gray-500">
                              <Eye className="h-4 w-4" />
                              <span className="text-sm font-medium">Click to reveal</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Click "Generate" to get plot continuation ideas.</p>
                </div>
              )}
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

      {(summary.length > 0 || actionableInsights.length > 0) && !loading && !error && (
        <div className="text-xs text-gray-500 text-center">
          Summary generated by AI • Manual refresh only
        </div>
      )}
    </div>
  )
}
