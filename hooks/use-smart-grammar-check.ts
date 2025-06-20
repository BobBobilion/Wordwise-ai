import { useState, useEffect, useRef, useCallback } from 'react'
import { checkGrammar, dismissSuggestion } from '@/lib/grammar-checker'
import type { GrammarSuggestion } from '@/lib/types'

interface UseSmartGrammarCheckOptions {
  debounceMs?: number
  wordsPerSegment?: number
  onSegmentComplete?: (wordCount: number) => void
}

export function useSmartGrammarCheck(
  text: string,
  options: UseSmartGrammarCheckOptions = {}
) {
  const {
    debounceMs = 3000,
    wordsPerSegment = 5,
    onSegmentComplete
  } = options

  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [lastWordCount, setLastWordCount] = useState(0)
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<string>('')

  // Count words in text
  const countWords = useCallback((text: string): number => {
    return text.trim().split(/\s+/).filter(word => /\w/.test(word)).length
  }, [])

  // Check if we should trigger analysis based on word count
  const shouldTriggerByWordCount = useCallback((currentText: string): boolean => {
    const currentWordCount = countWords(currentText)
    const wordDifference = currentWordCount - lastWordCount
    
    // Trigger every 5 words or when we hit punctuation
    const shouldTrigger = wordDifference >= wordsPerSegment || 
                         /[.!?]$/.test(currentText.trim())
    
    console.log('📊 Smart Grammar Hook - Word count check:', { 
      currentWordCount, 
      lastWordCount, 
      wordDifference, 
      wordsPerSegment, 
      shouldTrigger,
      endsWithPunctuation: /[.!?]$/.test(currentText.trim())
    })
    
    if (shouldTrigger) {
      setLastWordCount(currentWordCount)
      onSegmentComplete?.(currentWordCount)
      console.log('🎯 Smart Grammar Hook - Triggering by word count!')
    }
    
    return shouldTrigger
  }, [lastWordCount, wordsPerSegment, onSegmentComplete, countWords])

  // Trigger grammar check
  const triggerGrammarCheck = useCallback(async (
    text: string, 
    immediate: boolean = false
  ) => {
    console.log('🚀 Smart Grammar Hook - Triggering check:', { textLength: text.length, immediate, wordCount: countWords(text) })
    if (!text.trim() || text === lastCheckRef.current) {
      console.log('⏭️ Smart Grammar Hook - Skipping check (no text or unchanged)')
      return
    }

    setIsChecking(true)
    lastCheckRef.current = text

    try {
      const newSuggestions = await checkGrammar(text, immediate)
      console.log('✅ Smart Grammar Hook - Received suggestions:', newSuggestions.length, newSuggestions)
      setSuggestions(newSuggestions)
    } catch (error) {
      console.error('❌ Smart Grammar Hook - Grammar check failed:', error)
      setSuggestions([])
    } finally {
      setIsChecking(false)
    }
  }, [countWords])

  // Main effect for handling text changes
  useEffect(() => {
    console.log('🔄 Smart Grammar Hook - Text changed:', { textLength: text.length, text: text.substring(0, 100) + '...' })
    
    if (!text.trim()) {
      console.log('📝 Smart Grammar Hook - No text, clearing suggestions')
      setSuggestions([])
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      console.log('⏰ Smart Grammar Hook - Cleared existing timeout')
    }

    // Check if we should trigger immediately based on word count
    if (shouldTriggerByWordCount(text)) {
      console.log('⚡ Smart Grammar Hook - Triggering immediate analysis')
      triggerGrammarCheck(text, true)
      return
    }

    // Set up delayed analysis
    console.log('⏱️ Smart Grammar Hook - Setting up delayed analysis:', debounceMs, 'ms')
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Smart Grammar Hook - Timeout triggered, starting analysis')
      triggerGrammarCheck(text, false)
    }, debounceMs)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, debounceMs, shouldTriggerByWordCount, triggerGrammarCheck])

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
      await dismissSuggestion(suggestion)
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
    wordCount: countWords(text)
  }
} 