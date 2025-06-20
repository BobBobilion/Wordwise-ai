import { useState, useEffect, useRef, useCallback } from 'react'
import { aiSentenceChecker } from '@/lib/ai-sentence-checker'
import type { GrammarSuggestion } from '@/lib/types'

interface UseSentenceGrammarCheckOptions {
  debounceMs?: number
  onSentenceComplete?: (sentenceCount: number) => void
}

export function useSentenceGrammarCheck(
  text: string,
  options: UseSentenceGrammarCheckOptions = {}
) {
  const {
    debounceMs = 5000,
    onSentenceComplete
  } = options

  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [lastSentenceCount, setLastSentenceCount] = useState(0)
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<string>('')

  // Count sentences in text
  const countSentences = useCallback((text: string): number => {
    if (!text.trim()) return 0
    const sentences = text.match(/[^.!?]*[.!?]+/g) || []
    const remainingText = text.replace(/[^.!?]*[.!?]+/g, '').trim()
    return sentences.length + (remainingText ? 1 : 0)
  }, [])

  // Check if we should trigger analysis based on sentence completion
  const shouldTriggerBySentenceCompletion = useCallback((currentText: string): boolean => {
    const currentSentenceCount = countSentences(currentText)
    const sentenceDifference = currentSentenceCount - lastSentenceCount
    
    // Trigger when we complete a sentence (add ending punctuation)
    const shouldTrigger = sentenceDifference > 0 && /[.!?]$/.test(currentText.trim())
    
    console.log('📊 Sentence Grammar Hook - Sentence count check:', { 
      currentSentenceCount, 
      lastSentenceCount, 
      sentenceDifference, 
      shouldTrigger,
      endsWithPunctuation: /[.!?]$/.test(currentText.trim())
    })
    
    if (shouldTrigger) {
      setLastSentenceCount(currentSentenceCount)
      onSentenceComplete?.(currentSentenceCount)
      console.log('🎯 Sentence Grammar Hook - Triggering by sentence completion!')
    }
    
    return shouldTrigger
  }, [lastSentenceCount, onSentenceComplete, countSentences])

  // Trigger grammar check
  const triggerGrammarCheck = useCallback(async (
    text: string, 
    immediate: boolean = false
  ) => {
    console.log('🚀 Sentence Grammar Hook - Triggering check:', { textLength: text.length, immediate, sentenceCount: countSentences(text) })
    if (!text.trim() || text === lastCheckRef.current) {
      console.log('⏭️ Sentence Grammar Hook - Skipping check (no text or unchanged)')
      return
    }

    setIsChecking(true)
    lastCheckRef.current = text

    try {
      const newSuggestions = await aiSentenceChecker.checkText(text, immediate)
      console.log('✅ Sentence Grammar Hook - Received suggestions:', newSuggestions.length, newSuggestions)
      setSuggestions(newSuggestions)
    } catch (error) {
      console.error('❌ Sentence Grammar Hook - Grammar check failed:', error)
      setSuggestions([])
    } finally {
      setIsChecking(false)
    }
  }, [countSentences])

  // Main effect for handling text changes
  useEffect(() => {
    console.log('🔄 Sentence Grammar Hook - Text changed:', { textLength: text.length, text: text.substring(0, 100) + '...' })
    
    if (!text.trim()) {
      console.log('📝 Sentence Grammar Hook - No text, clearing suggestions')
      setSuggestions([])
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      console.log('⏰ Sentence Grammar Hook - Cleared existing timeout')
    }

    // Check if we should trigger immediately based on sentence completion
    if (shouldTriggerBySentenceCompletion(text)) {
      console.log('⚡ Sentence Grammar Hook - Triggering immediate analysis')
      triggerGrammarCheck(text, true)
      return
    }

    // Set up delayed analysis
    console.log('⏱️ Sentence Grammar Hook - Setting up delayed analysis:', debounceMs, 'ms')
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Sentence Grammar Hook - Timeout triggered, starting analysis')
      triggerGrammarCheck(text, false)
    }, debounceMs)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, debounceMs, shouldTriggerBySentenceCompletion, triggerGrammarCheck])

  // Handle applying a suggestion
  const applySuggestion = useCallback((suggestion: GrammarSuggestion) => {
    // Return the new text with the suggestion applied
    const beforeText = text.substring(0, suggestion.start)
    const afterText = text.substring(suggestion.end)
    const newText = beforeText + suggestion.suggestion + afterText
    
    // Remove the applied suggestion from the list
    setSuggestions(prev => prev.filter(s => s !== suggestion))
    
    return newText
  }, [text])

  // Handle dismissing a suggestion
  const dismissSuggestionHandler = useCallback(async (suggestion: GrammarSuggestion) => {
    try {
      aiSentenceChecker.dismissSuggestion(suggestion)
      setSuggestions(prev => prev.filter(s => s !== suggestion))
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error)
    }
  }, [])

  // Force immediate check
  const forceCheck = useCallback(() => {
    triggerGrammarCheck(text, true)
  }, [text, triggerGrammarCheck])

  return {
    suggestions,
    isChecking,
    applySuggestion,
    dismissSuggestion: dismissSuggestionHandler,
    forceCheck,
    sentenceCount: countSentences(text)
  }
} 