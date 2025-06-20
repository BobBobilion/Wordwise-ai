import type { GrammarSuggestion } from './types'

interface Sentence {
  text: string
  hash: string
  startIndex: number
  endIndex: number
}

interface CachedResponse {
  sentenceHash: string
  suggestions: GrammarSuggestion[]
  timestamp: number
}

export class AISentenceChecker {
  private grammarCache: Map<string, CachedResponse> = new Map()
  private spellingCache: Map<string, CachedResponse> = new Map()
  private dismissedSuggestions: Set<string> = new Set()
  private lastAnalysisTime: number = 0
  private analysisTimeout: NodeJS.Timeout | null = null
  private readonly ANALYSIS_DELAY = 5000 // 5 seconds delay after stop typing

  constructor() {
    // Load dismissed suggestions from sessionStorage
    this.loadDismissedSuggestions()
  }

  /**
   * Generate a hash for a text
   */
  private generateHash(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): Sentence[] {
    console.log('🔤 AI Sentence Checker - Splitting text into sentences:', text.length, 'characters')
    const sentences: Sentence[] = []
    
    // Split on sentence endings (. ! ?) but preserve the punctuation
    const sentenceRegex = /[^.!?]*[.!?]+/g
    let match
    let currentIndex = 0
    
    while ((match = sentenceRegex.exec(text)) !== null) {
      const sentenceText = match[0].trim()
      if (sentenceText.length > 0) {
        const sentence: Sentence = {
          text: sentenceText,
          hash: this.generateHash(sentenceText),
          startIndex: currentIndex,
          endIndex: currentIndex + sentenceText.length
        }
        sentences.push(sentence)
      }
      currentIndex += match[0].length
    }
    
    // Handle any remaining text that doesn't end with punctuation
    const remainingText = text.substring(currentIndex).trim()
    if (remainingText.length > 0) {
      const sentence: Sentence = {
        text: remainingText,
        hash: this.generateHash(remainingText),
        startIndex: currentIndex,
        endIndex: currentIndex + remainingText.length
      }
      sentences.push(sentence)
    }

    console.log('📊 AI Sentence Checker - Created sentences:', sentences.length, sentences.map(s => ({ text: JSON.stringify(s.text.substring(0, 50) + '...'), hash: s.hash })))
    return sentences
  }

  /**
   * Check if a sentence has changed and needs re-analysis
   */
  private hasSentenceChanged(sentence: Sentence, cache: Map<string, CachedResponse>): boolean {
    const cached = cache.get(sentence.hash)
    return !cached || cached.sentenceHash !== sentence.hash
  }

  /**
   * Get sentences that need analysis (changed or new)
   */
  private getSentencesToAnalyze(sentences: Sentence[], cache: Map<string, CachedResponse>): Sentence[] {
    const sentencesToAnalyze = sentences.filter(sentence => this.hasSentenceChanged(sentence, cache))
    console.log('🔄 AI Sentence Checker - Sentences to analyze:', sentencesToAnalyze.length, 'out of', sentences.length)
    return sentencesToAnalyze
  }

  /**
   * Call the grammar API
   */
  private async callGrammarAPI(text: string): Promise<GrammarSuggestion[]> {
    console.log('🌐 AI Sentence Checker - Calling grammar API for text:', text.length, 'characters')
    try {
      const response = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`Grammar check failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('📥 AI Sentence Checker - Grammar API Response:', data.suggestions?.length || 0, 'suggestions:', data.suggestions)
      return data.suggestions || []
    } catch (error) {
      console.error('❌ AI Sentence Checker - Grammar API error:', error)
      return []
    }
  }

  /**
   * Call the spelling API
   */
  private async callSpellingAPI(text: string): Promise<GrammarSuggestion[]> {
    console.log('🌐 AI Sentence Checker - Calling spelling API for text:', text.length, 'characters')
    try {
      const response = await fetch('/api/spelling-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`Spelling check failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('📥 AI Sentence Checker - Spelling API Response:', data.suggestions?.length || 0, 'suggestions:', data.suggestions)
      return data.suggestions || []
    } catch (error) {
      console.error('❌ AI Sentence Checker - Spelling API error:', error)
      return []
    }
  }

  /**
   * Map API suggestions to original text positions
   */
  private mapSuggestionsToOriginalText(
    apiSuggestions: any[], 
    sentence: Sentence
  ): GrammarSuggestion[] {
    const suggestions: GrammarSuggestion[] = []

    for (const apiSuggestion of apiSuggestions) {
      const suggestion: GrammarSuggestion = {
        text: apiSuggestion.text,
        suggestion: apiSuggestion.suggestion,
        start: sentence.startIndex + apiSuggestion.start,
        end: sentence.startIndex + apiSuggestion.end,
        type: apiSuggestion.type,
        description: apiSuggestion.description
      }

      // Generate unique ID for this suggestion
      const suggestionId = this.generateHash(
        `${suggestion.start}_${suggestion.end}_${suggestion.type}_${suggestion.text}_${suggestion.suggestion}`
      )

      // Skip if suggestion was dismissed
      if (!this.dismissedSuggestions.has(suggestionId)) {
        suggestions.push(suggestion)
      }
    }

    return suggestions
  }

  /**
   * Update cache with new suggestions
   */
  private updateCache(sentence: Sentence, suggestions: GrammarSuggestion[], cache: Map<string, CachedResponse>): void {
    cache.set(sentence.hash, {
      sentenceHash: sentence.hash,
      suggestions,
      timestamp: Date.now()
    })
  }

  /**
   * Get cached suggestions for sentences that haven't changed
   */
  private getCachedSuggestions(sentences: Sentence[], cache: Map<string, CachedResponse>): GrammarSuggestion[] {
    const suggestions: GrammarSuggestion[] = []
    
    for (const sentence of sentences) {
      const cached = cache.get(sentence.hash)
      if (cached && cached.sentenceHash === sentence.hash) {
        // Map cached suggestions to current text positions
        for (const cachedSuggestion of cached.suggestions) {
          const adjustedSuggestion: GrammarSuggestion = {
            ...cachedSuggestion,
            start: sentence.startIndex + (cachedSuggestion.start - sentence.startIndex),
            end: sentence.startIndex + (cachedSuggestion.end - sentence.startIndex)
          }
          suggestions.push(adjustedSuggestion)
        }
      }
    }
    
    return suggestions
  }

  /**
   * Load dismissed suggestions from sessionStorage
   */
  private loadDismissedSuggestions(): void {
    try {
      const dismissed = sessionStorage.getItem('dismissed-sentence-suggestions')
      if (dismissed) {
        const parsedDismissed: string[] = JSON.parse(dismissed)
        this.dismissedSuggestions = new Set(parsedDismissed)
      }
    } catch (error) {
      console.error('Failed to load dismissed suggestions:', error)
      this.dismissedSuggestions = new Set()
    }
  }

  /**
   * Save dismissed suggestions to sessionStorage
   */
  private saveDismissedSuggestions(): void {
    try {
      const dismissed = Array.from(this.dismissedSuggestions)
      sessionStorage.setItem('dismissed-sentence-suggestions', JSON.stringify(dismissed))
    } catch (error) {
      console.error('Failed to save dismissed suggestions:', error)
    }
  }

  /**
   * Main method to check grammar and spelling
   */
  async checkText(
    text: string, 
    immediate: boolean = false
  ): Promise<GrammarSuggestion[]> {
    console.log('🎪 AI Sentence Checker - checkText called:', { textLength: text.length, immediate })
    
    // Clear any existing timeout
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout)
      this.analysisTimeout = null
      console.log('⏰ AI Sentence Checker - Cleared existing timeout')
    }

    // For immediate analysis or when explicitly requested
    if (immediate) {
      console.log('⚡ AI Sentence Checker - Running immediate analysis')
      return this.performAnalysis(text)
    }

    // Set up delayed analysis
    console.log('⏱️ AI Sentence Checker - Setting up delayed analysis:', this.ANALYSIS_DELAY, 'ms')
    return new Promise((resolve) => {
      this.analysisTimeout = setTimeout(async () => {
        console.log('⏰ AI Sentence Checker - Delayed analysis timeout triggered')
        const suggestions = await this.performAnalysis(text)
        resolve(suggestions)
      }, this.ANALYSIS_DELAY)
    })
  }

  /**
   * Perform the actual analysis
   */
  private async performAnalysis(text: string): Promise<GrammarSuggestion[]> {
    console.log('🔍 AI Sentence Checker - Starting analysis for text:', text.length, 'characters')
    if (!text.trim()) return []

    const sentences = this.splitIntoSentences(text)
    const grammarSentencesToAnalyze = this.getSentencesToAnalyze(sentences, this.grammarCache)
    const spellingSentencesToAnalyze = this.getSentencesToAnalyze(sentences, this.spellingCache)
    
    let newGrammarSuggestions: GrammarSuggestion[] = []
    let newSpellingSuggestions: GrammarSuggestion[] = []
    
    // Call grammar API for sentences that need grammar analysis
    if (grammarSentencesToAnalyze.length > 0) {
      console.log('🔧 AI Sentence Checker - Calling grammar API for new sentences')
      for (const sentence of grammarSentencesToAnalyze) {
        const apiSuggestions = await this.callGrammarAPI(sentence.text)
        const mappedSuggestions = this.mapSuggestionsToOriginalText(apiSuggestions, sentence)
        newGrammarSuggestions.push(...mappedSuggestions)
        this.updateCache(sentence, mappedSuggestions, this.grammarCache)
      }
      console.log('✨ AI Sentence Checker - Grammar suggestions:', newGrammarSuggestions.length)
    } else {
      console.log('♻️ AI Sentence Checker - No new sentences for grammar analysis')
    }

    // Call spelling API for sentences that need spelling analysis
    if (spellingSentencesToAnalyze.length > 0) {
      console.log('🔧 AI Sentence Checker - Calling spelling API for new sentences')
      for (const sentence of spellingSentencesToAnalyze) {
        const apiSuggestions = await this.callSpellingAPI(sentence.text)
        const mappedSuggestions = this.mapSuggestionsToOriginalText(apiSuggestions, sentence)
        newSpellingSuggestions.push(...mappedSuggestions)
        this.updateCache(sentence, mappedSuggestions, this.spellingCache)
      }
      console.log('✨ AI Sentence Checker - Spelling suggestions:', newSpellingSuggestions.length)
    } else {
      console.log('♻️ AI Sentence Checker - No new sentences for spelling analysis')
    }

    // Get cached suggestions for unchanged sentences
    const cachedGrammarSuggestions = this.getCachedSuggestions(
      sentences.filter(s => !grammarSentencesToAnalyze.includes(s)),
      this.grammarCache
    )
    const cachedSpellingSuggestions = this.getCachedSuggestions(
      sentences.filter(s => !spellingSentencesToAnalyze.includes(s)),
      this.spellingCache
    )
    
    console.log('💾 AI Sentence Checker - Cached grammar suggestions:', cachedGrammarSuggestions.length)
    console.log('💾 AI Sentence Checker - Cached spelling suggestions:', cachedSpellingSuggestions.length)

    // Combine all suggestions
    const allSuggestions = [...newGrammarSuggestions, ...newSpellingSuggestions, ...cachedGrammarSuggestions, ...cachedSpellingSuggestions]
    console.log('🎯 AI Sentence Checker - Final suggestions:', allSuggestions.length, allSuggestions)
    
    return allSuggestions.sort((a, b) => a.start - b.start)
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestion: GrammarSuggestion): void {
    // Generate a unique ID based on the suggestion properties
    const suggestionId = this.generateHash(
      `${suggestion.start}_${suggestion.end}_${suggestion.type}_${suggestion.text}_${suggestion.suggestion}`
    )
    
    this.dismissedSuggestions.add(suggestionId)
    this.saveDismissedSuggestions()
  }

  /**
   * Clear all dismissed suggestions
   */
  clearDismissedSuggestions(): void {
    this.dismissedSuggestions.clear()
    try {
      sessionStorage.removeItem('dismissed-sentence-suggestions')
    } catch (error) {
      console.error('Failed to clear dismissed suggestions:', error)
    }
  }

  /**
   * Clear cache (useful for testing or manual resets)
   */
  clearCache(): void {
    this.grammarCache.clear()
    this.spellingCache.clear()
  }
}

// Export singleton instance
export const aiSentenceChecker = new AISentenceChecker() 