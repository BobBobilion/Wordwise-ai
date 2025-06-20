"use client"

import { useState } from 'react'
import { useSentenceGrammarCheck } from '@/hooks/use-sentence-grammar-check'
import { WritingSuggestions } from '@/components/sidebar/writing-suggestions'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SentenceGrammarExample() {
  const [text, setText] = useState('')
  
  const {
    suggestions,
    isChecking,
    applySuggestion,
    dismissSuggestion,
    forceCheck,
    sentenceCount
  } = useSentenceGrammarCheck(text, {
    debounceMs: 5000,
    onSentenceComplete: (count) => {
      console.log(`Sentence completed! Total sentences: ${count}`)
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
          <CardTitle>Sentence-Based AI Grammar Checker</CardTitle>
          <p className="text-sm text-gray-600">
            Sentences: {sentenceCount} | Suggestions: {suggestions.length}
            {isChecking && " (Checking...)"}
          </p>
          <p className="text-xs text-gray-500">
            Triggers: After sentence completion (.!?) or 5-second timeout
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing to see AI-powered grammar suggestions. The system will analyze your text when you complete a sentence or after 5 seconds of inactivity."
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

            {/* Test text examples */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Test Examples:</p>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setText('This is a test sentence with some grammar issues.')}
                >
                  Grammar Test
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setText('This sentense has speling errors.')}
                >
                  Spelling Test
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setText('The document was written by the author in order to recieve the message.')}
                >
                  Style Test
                </Button>
              </div>
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
// import { SentenceGrammarExample } from '@/components/sentence-grammar-example'
// 
// export default function TestPage() {
//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Sentence-Based Grammar Checker Test</h1>
//       <SentenceGrammarExample />
//     </div>
//   )
// } 