"use client"

import { CheckCircle, AlertCircle, X } from "lucide-react"
import type { GrammarSuggestion } from "@/lib/types"

interface WritingSuggestionsProps {
  suggestions: GrammarSuggestion[]
  onApplySuggestion: (suggestion: GrammarSuggestion) => void
  onDismissSuggestion: (suggestion: GrammarSuggestion) => void
}

export function WritingSuggestions({ suggestions, onApplySuggestion, onDismissSuggestion }: WritingSuggestionsProps) {
  // Debug logging
  console.log('WritingSuggestions received:', suggestions.length, 'suggestions:', suggestions)
  
  const spellingIssues = suggestions.filter((s) => s.type === "spelling")
  const grammarIssues = suggestions.filter((s) => s.type === "grammar" || s.type === "style")

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
          <span className="text-orange-600">{grammarIssues.length} grammar/style</span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 border">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertCircle
                    className={`h-3 w-3 ${suggestion.type === "spelling" ? "text-red-500" : "text-orange-500"}`}
                  />
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      suggestion.type === "spelling" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {suggestion.type || "grammar"}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="line-through text-red-600 bg-red-50 px-1 rounded">{suggestion.text}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-green-600 bg-green-50 px-1 rounded font-medium">{suggestion.suggestion}</span>
                  </div>

                  {suggestion.description && <p className="text-xs text-gray-600">{suggestion.description}</p>}
                </div>
              </div>

              <button
                onClick={() => onDismissSuggestion(suggestion)}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <button
              onClick={() => onApplySuggestion(suggestion)}
              className="w-full px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Apply Fix
            </button>
          </div>
        ))}
      </div>

      {/* Accept All Button */}
      {suggestions.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => suggestions.forEach(suggestion => onApplySuggestion(suggestion))}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Accept All ({suggestions.length} suggestions)
          </button>
        </div>
      )}
    </div>
  )
}
