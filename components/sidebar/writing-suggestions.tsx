"use client"

import { CheckCircle, AlertCircle, X } from "lucide-react"
import { useEffect, useRef } from "react"
import type { GrammarSuggestion } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface WritingSuggestionsProps {
  suggestions: GrammarSuggestion[]
  onApplySuggestion: (suggestion: GrammarSuggestion, replacement: string) => void
  onDismissSuggestion: (suggestion: GrammarSuggestion) => void
  isChecking?: boolean
  highlightedSuggestionId?: string
}

export function WritingSuggestions({ 
  suggestions, 
  onApplySuggestion, 
  onDismissSuggestion, 
  isChecking = false,
  highlightedSuggestionId
}: WritingSuggestionsProps) {
  const suggestionsContainerRef = useRef<HTMLDivElement>(null)
  
  // Scroll to highlighted suggestion when it changes
  useEffect(() => {
    console.log('🔍 WritingSuggestions: highlightedSuggestionId changed to:', highlightedSuggestionId)
    
    if (highlightedSuggestionId && suggestionsContainerRef.current) {
      console.log('🔍 WritingSuggestions: Looking for element with data-suggestion-id:', highlightedSuggestionId)
      
      const highlightedElement = suggestionsContainerRef.current.querySelector(
        `[data-suggestion-id="${highlightedSuggestionId}"]`
      ) as HTMLElement
      
      console.log('🔍 WritingSuggestions: Found element:', highlightedElement)
      
      if (highlightedElement) {
        // Add highlight effect
        highlightedElement.classList.add('ring-2', 'ring-purple-500', 'bg-purple-50')
        
        // Scroll to the element
        console.log('🔍 WritingSuggestions: Scrolling to element')
        highlightedElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        
        // Remove highlight effect after 3 seconds
        setTimeout(() => {
          highlightedElement.classList.remove('ring-2', 'ring-purple-500', 'bg-purple-50')
        }, 3000)
      } else {
        console.log('🔍 WritingSuggestions: Element not found')
      }
    }
  }, [highlightedSuggestionId])

  // Debug logging
  console.log('WritingSuggestions received:', suggestions.length, 'suggestions:', suggestions)
  
  const spellingIssues = suggestions.filter((s) => s.type === "spelling")
  const grammarIssues = suggestions.filter((s) => s.type === "grammar")
  const styleIssues = suggestions.filter((s) => s.type === "style")

  if (isChecking) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Checking...</h3>
        <p className="text-sm text-gray-600">Analyzing your text with AI.</p>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="p-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
        <p className="text-sm text-gray-600">No grammar or spelling issues found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Writing Suggestions</h3>
        <div className="flex justify-center space-x-4 text-sm">
          <span className="text-red-600">{spellingIssues.length} spelling</span>
          <span className="text-yellow-600">{grammarIssues.length} grammar</span>
          <span className="text-purple-600">{styleIssues.length} style</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto" ref={suggestionsContainerRef}>
        {suggestions.map((suggestion, index) => {
          const isSpellingIssue = suggestion.type === "spelling"
          const isStyleIssue = suggestion.type === "style"
          const isGrammarIssue = suggestion.type === "grammar"
          const suggestionId = `${suggestion.start}-${suggestion.end}-${suggestion.text}`
          
          // Determine colors based on issue type
          let iconColor = "text-red-500"
          let badgeBgColor = "bg-red-100"
          let badgeTextColor = "text-red-700"
          
          if (isStyleIssue) {
            iconColor = "text-purple-500"
            badgeBgColor = "bg-purple-100"
            badgeTextColor = "text-purple-700"
          } else if (isGrammarIssue) {
            iconColor = "text-yellow-500"
            badgeBgColor = "bg-yellow-100"
            badgeTextColor = "text-yellow-700"
          } else if (isSpellingIssue) {
            iconColor = "text-red-500"
            badgeBgColor = "bg-red-100"
            badgeTextColor = "text-red-700"
          }
          
          return (
            <div 
              key={index} 
              className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm transition-all duration-200"
              data-suggestion-id={suggestionId}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className={`h-4 w-4 ${iconColor}`} />
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeBgColor}`}
                    >
                      {suggestion.type}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {suggestion.description?.split('`').map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="text-gray-900 font-bold">{part}</strong> : <span key={i}>{part}</span>
                    )}
                  </p>

                  <div className="text-sm mb-3">
                    <span className="font-medium text-gray-700">Found:</span>
                    <span className="ml-2 line-through text-red-700 bg-red-100 px-2 py-0.5 rounded">{suggestion.text}</span>
                  </div>

                  {suggestion.suggestions && suggestion.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {suggestion.suggestions.slice(0, 3).map((altSuggestion, altIndex) => (
                        <Button
                          key={altIndex}
                          onClick={() => onApplySuggestion(suggestion, altSuggestion)}
                          size="sm"
                          variant={altIndex === 0 ? 'default' : 'outline'}
                          className={
                            altIndex === 0
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'text-blue-600 border-blue-400 hover:bg-blue-50'
                          }
                        >
                          {altSuggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => onDismissSuggestion(suggestion)}
                  size="icon"
                  variant="ghost"
                  className="ml-2 h-8 w-8 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Accept All and Deny All Buttons */}
      {suggestions.length > 0 && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => suggestions.forEach(s => onApplySuggestion(s, s.suggestion))}
              className="bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Accept All ({suggestions.length})
            </Button>
            <Button
              onClick={() => suggestions.forEach(s => onDismissSuggestion(s))}
              variant="outline"
              className="border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400 hover:text-red-600 text-sm"
            >
              Deny All
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
