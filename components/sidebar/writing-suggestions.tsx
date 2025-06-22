"use client"

import { CheckCircle, AlertCircle, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { GrammarSuggestion } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface WritingSuggestionsProps {
  suggestions: GrammarSuggestion[]
  onApplySuggestion: (suggestion: GrammarSuggestion, replacement: string) => void
  onDismissSuggestion: (suggestion: GrammarSuggestion) => void
  isChecking?: boolean
  isCheckingGrammar?: boolean
  isCheckingStyle?: boolean
  highlightedSuggestionId?: string
  onCardClick?: (suggestion: GrammarSuggestion) => void
  selectedCardId?: string | null
}

export function WritingSuggestions({ 
  suggestions, 
  onApplySuggestion, 
  onDismissSuggestion, 
  isChecking = false,
  isCheckingGrammar = false,
  isCheckingStyle = false,
  highlightedSuggestionId,
  onCardClick,
  selectedCardId
}: WritingSuggestionsProps) {
  const suggestionsContainerRef = useRef<HTMLDivElement>(null)
  const [localSelectedCardId, setLocalSelectedCardId] = useState<string | null>(null)
  
  // Use selectedCardId from props if provided, otherwise use local state
  const currentSelectedCardId = selectedCardId !== undefined ? selectedCardId : localSelectedCardId
  
  // Scroll to highlighted suggestion when it changes
  useEffect(() => {
    if (suggestionsContainerRef.current) {
      // First, remove any existing highlights from all cards
      const allCards = suggestionsContainerRef.current.querySelectorAll('[data-suggestion-id]')
      allCards.forEach(card => {
        card.classList.remove('border-purple-500', 'border-2')
      })
      
      // Then apply highlight to the new card if one is specified
      if (highlightedSuggestionId) {
        const highlightedElement = suggestionsContainerRef.current.querySelector(
          `[data-suggestion-id="${highlightedSuggestionId}"]`
        ) as HTMLElement
        
        if (highlightedElement) {
          // Add highlight effect - change border instead of adding ring
          highlightedElement.classList.add('border-purple-500', 'border-2')
          
          // Scroll to the element
          highlightedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
        }
      }
    }
  }, [highlightedSuggestionId])

  // Handle card selection
  const handleCardClick = (suggestion: GrammarSuggestion) => {
    const suggestionId = `${suggestion.start}-${suggestion.end}-${suggestion.text}`
    
    if (onCardClick) {
      // Use the callback if provided
      onCardClick(suggestion)
    } else {
      // Use local state if no callback provided
      setLocalSelectedCardId(currentSelectedCardId === suggestionId ? null : suggestionId)
    }
  }

  // Clear selection when clicking outside or switching tabs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(event.target as Node)) {
        if (onCardClick) {
          // Call with null to clear selection
          onCardClick(null as any)
        } else {
          setLocalSelectedCardId(null)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [onCardClick])

  const spellingIssues = suggestions.filter((s) => s.type === "spelling")
  const grammarIssues = suggestions.filter((s) => s.type === "grammar")
  const styleIssues = suggestions.filter((s) => s.type === "style")

  // Show checking state only when grammar/spelling is being checked, not style
  const isCheckingGrammarOrSpelling = isChecking || isCheckingGrammar

  if (isCheckingGrammarOrSpelling) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Checking...</h3>
        <p className="text-sm text-gray-600">
          {isCheckingGrammar ? "Checking grammar and spelling..." : "Analyzing your text with AI."}
        </p>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="p-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
        <p className="text-sm text-gray-600">No grammar, spelling, or style issues found.</p>
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
          const isSelected = currentSelectedCardId === suggestionId
          const isHighlighted = highlightedSuggestionId === suggestionId
          
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
              className={`bg-white rounded-lg p-3 border shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md ${
                isSelected 
                  ? 'border-purple-500 border-2 bg-purple-50' 
                  : isHighlighted 
                    ? 'border-purple-500 border-2' 
                    : 'border-gray-200'
              }`}
              data-suggestion-id={suggestionId}
              onClick={() => handleCardClick(suggestion)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className={`h-4 w-4 ${iconColor}`} />
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeBgColor} ${badgeTextColor}`}
                    >
                      {suggestion.type}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {suggestion.description?.split('`').map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="text-gray-900 font-bold">{part}</strong> : <span key={i}>{part}</span>
                    )}
                  </p>

                  {isStyleIssue ? (
                    // Style suggestions: show problematic text and single replacement button
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Problematic:</span>
                        <span className="ml-2 text-red-700 bg-red-100 px-2 py-0.5 rounded">{suggestion.text}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Improved:</span>
                        <span className="ml-2 text-green-700 bg-green-100 px-2 py-0.5 rounded">{suggestion.suggestion}</span>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation() // Prevent card click
                          onApplySuggestion(suggestion, suggestion.suggestion)
                        }}
                        size="sm"
                        className="bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Apply Style Fix
                      </Button>
                    </div>
                  ) : (
                    // Grammar/Spelling suggestions: show "Found:" text and multiple suggestion buttons
                    <>
                      <div className="text-sm mb-3">
                        <span className="font-medium text-gray-700">Found:</span>
                        <span className="ml-2 line-through text-red-700 bg-red-100 px-2 py-0.5 rounded">{suggestion.text}</span>
                      </div>

                      {suggestion.suggestions && suggestion.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {suggestion.suggestions.slice(0, 3).map((altSuggestion, altIndex) => (
                            <Button
                              key={altIndex}
                              onClick={(e) => {
                                e.stopPropagation() // Prevent card click
                                onApplySuggestion(suggestion, altSuggestion)
                              }}
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
                    </>
                  )}
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation() // Prevent card click
                    onDismissSuggestion(suggestion)
                  }}
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
