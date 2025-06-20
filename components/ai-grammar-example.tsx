"use client"

import { useState } from 'react'
import { useSmartGrammarCheck } from '@/hooks/use-smart-grammar-check'
import { WritingSuggestions } from '@/components/sidebar/writing-suggestions'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AIGrammarExample() {
  const [text, setText] = useState('')
  
  const {
    suggestions,
    isChecking,
    applySuggestion,
    dismissSuggestion,
    forceCheck,
    wordCount
  } = useSmartGrammarCheck(text, {
    debounceMs: 3000,
    wordsPerSegment: 5,
    onSegmentComplete: (count) => {
      console.log(`Segment completed at ${count} words`)
    }
  })

  // Handle applying a suggestion
  const handleApplySuggestion = (suggestion: any) => {
    const newText = applySuggestion(suggestion)
    setText(newText)
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Text Editor */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>AI Grammar Checker Demo</CardTitle>
          <p className="text-sm text-gray-600">
            Words: {wordCount} | Suggestions: {suggestions.length}
            {isChecking && " (Checking...)"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing to see AI-powered grammar suggestions. The system will analyze your text in 5-word segments and provide real-time feedback."
              className="min-h-[300px] resize-none"
            />
            
            <div className="flex gap-2">
              <Button 
                onClick={forceCheck}
                variant="outline"
                disabled={!text.trim() || isChecking}
              >
                Force Check
              </Button>
              
              <Button 
                onClick={() => setText('')}
                variant="outline"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions Sidebar */}
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Writing Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <WritingSuggestions
            suggestions={suggestions}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={dismissSuggestion}
            isChecking={isChecking}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// Example usage in a page:
// 
// import { AIGrammarExample } from '@/components/ai-grammar-example'
// 
// export default function TestPage() {
//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">AI Grammar Checker Test</h1>
//       <AIGrammarExample />
//     </div>
//   )
// } 