import type { GrammarSuggestion } from './types'

interface TextSegment {
  id: string
  text: string
  hash: string
  startIndex: number
  endIndex: number
}

interface DismissedSuggestion {
  id: string
  segmentHash: string
  timestamp: number
}

interface CachedResponse {
  segmentHash: string
  suggestions: GrammarSuggestion[]
  timestamp: number
}

export class AIGrammarChecker {
  private cache: Map<string, CachedResponse> = new Map()
  private dismissedSuggestions: Set<string> = new Set()
  private lastAnalysisTime: number = 0
  private analysisTimeout: NodeJS.Timeout | null = null
  private readonly ANALYSIS_DELAY = 3000 // 3 seconds delay after stop typing
  private readonly WORDS_PER_SEGMENT = 5

  constructor() {
    // Load dismissed suggestions from sessionStorage
    this.loadDismissedSuggestions()
  }

  /**
   * Generate a hash for a text segment
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
   * Generate unique ID for a suggestion
   */
  private generateSuggestionId(segmentId: string, start: number, type: string, text: string): string {
    return this.generateHash(`${segmentId}_${start}_${type}_${text}`)
  }

  /**
   * Split text into 5-word segments
   */
  private segmentText(text: string): TextSegment[] {
    console.log('🔤 AI Grammar Checker - Segmenting text:', text.length, 'characters')
    const segments: TextSegment[] = []
    
    // Use a different approach that preserves original spacing
    const words = text.split(/(\s+)/) // Split on whitespace but keep the whitespace
    let currentSegment = ''
    let segmentStartIndex = 0
    let currentIndex = 0
    let wordCount = 0

    for (let i = 0; i < words.length; i++) {
      const part = words[i]
      const isWord = /\S/.test(part) // Contains non-whitespace characters
      
      if (currentSegment === '') {
        segmentStartIndex = currentIndex
      }
      
      currentSegment += part
      currentIndex += part.length
      
      if (isWord) {
        wordCount++
      }
      
      // Create segment when we have 5 words or hit sentence-ending punctuation
      const shouldCreateSegment = 
        wordCount >= this.WORDS_PER_SEGMENT || 
        /[.!?]/.test(part) ||
        i === words.length - 1

      if (shouldCreateSegment && currentSegment.trim().length > 0) {
        const segment: TextSegment = {
          id: this.generateHash(`${segmentStartIndex}_${currentSegment}`),
          text: currentSegment,
          hash: this.generateHash(currentSegment),
          startIndex: segmentStartIndex,
          endIndex: currentIndex
        }
        segments.push(segment)
        
        currentSegment = ''
        wordCount = 0
      }
    }

    console.log('📊 AI Grammar Checker - Created segments:', segments.length, segments.map(s => ({ id: s.id, text: JSON.stringify(s.text.substring(0, 50) + '...'), hash: s.hash })))
    return segments
  }

  /**
   * Check if a segment has changed and needs re-analysis
   */
  private hasSegmentChanged(segment: TextSegment): boolean {
    const cached = this.cache.get(segment.id)
    return !cached || cached.segmentHash !== segment.hash
  }

  /**
   * Get segments that need analysis (changed or new)
   */
  private getSegmentsToAnalyze(segments: TextSegment[]): TextSegment[] {
    const segmentsToAnalyze = segments.filter(segment => this.hasSegmentChanged(segment))
    console.log('🔄 AI Grammar Checker - Segments to analyze:', segmentsToAnalyze.length, 'out of', segments.length)
    return segmentsToAnalyze
  }

  /**
   * Call the AI API for grammar checking
   */
  private async callGrammarAPI(segments: TextSegment[]): Promise<GrammarSuggestion[]> {
    console.log('🌐 AI Grammar Checker - Calling API with segments:', segments.length)
    try {
      const response = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segments: segments.map(segment => ({
            id: segment.id,
            text: segment.text,
            hash: segment.hash
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`Grammar check failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('📥 AI Grammar Checker - API Response:', data.suggestions?.length || 0, 'suggestions:', data.suggestions)
      return data.suggestions || []
    } catch (error) {
      console.error('❌ AI Grammar Checker - API error:', error)
      return []
    }
  }

  /**
   * Map API suggestions back to original text positions
   */
  private mapSuggestionsToOriginalText(
    apiSuggestions: any[], 
    segments: TextSegment[]
  ): GrammarSuggestion[] {
    const suggestions: GrammarSuggestion[] = []
    const segmentMap = new Map(segments.map(s => [s.id, s]))

    for (const apiSuggestion of apiSuggestions) {
      const segment = segmentMap.get(apiSuggestion.segmentId)
      if (!segment) continue

      const suggestion: GrammarSuggestion = {
        text: apiSuggestion.text,
        suggestion: apiSuggestion.suggestion,
        start: segment.startIndex + apiSuggestion.start,
        end: segment.startIndex + apiSuggestion.end,
        type: apiSuggestion.type,
        description: apiSuggestion.description
      }

      // Generate unique ID for this suggestion using the same method as dismissal
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
  private updateCache(segments: TextSegment[], suggestions: GrammarSuggestion[]): void {
    const suggestionsBySegment = new Map<string, GrammarSuggestion[]>()
    
    // Group suggestions by segment
    for (const suggestion of suggestions) {
      const segment = segments.find(s => 
        suggestion.start >= s.startIndex && suggestion.end <= s.endIndex
      )
      if (segment) {
        if (!suggestionsBySegment.has(segment.id)) {
          suggestionsBySegment.set(segment.id, [])
        }
        suggestionsBySegment.get(segment.id)!.push(suggestion)
      }
    }

    // Update cache for each segment
    for (const segment of segments) {
      this.cache.set(segment.id, {
        segmentHash: segment.hash,
        suggestions: suggestionsBySegment.get(segment.id) || [],
        timestamp: Date.now()
      })
    }
  }

  /**
   * Get cached suggestions for segments that haven't changed
   */
  private getCachedSuggestions(segments: TextSegment[]): GrammarSuggestion[] {
    const suggestions: GrammarSuggestion[] = []
    
    for (const segment of segments) {
      const cached = this.cache.get(segment.id)
      if (cached && cached.segmentHash === segment.hash) {
        // Map cached suggestions to current text positions
        for (const cachedSuggestion of cached.suggestions) {
          const adjustedSuggestion: GrammarSuggestion = {
            ...cachedSuggestion,
            start: segment.startIndex + (cachedSuggestion.start - segment.startIndex),
            end: segment.startIndex + (cachedSuggestion.end - segment.startIndex)
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
      const dismissed = sessionStorage.getItem('dismissed-grammar-suggestions')
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
      sessionStorage.setItem('dismissed-grammar-suggestions', JSON.stringify(dismissed))
    } catch (error) {
      console.error('Failed to save dismissed suggestions:', error)
    }
  }

  /**
   * Main method to check grammar
   */
  async checkGrammar(
    text: string, 
    onSegmentComplete?: (wordCount: number) => void,
    immediate: boolean = false
  ): Promise<GrammarSuggestion[]> {
    console.log('🎪 AI Grammar Checker - checkGrammar called:', { textLength: text.length, immediate })
    
    // Clear any existing timeout
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout)
      this.analysisTimeout = null
      console.log('⏰ AI Grammar Checker - Cleared existing timeout')
    }

    // For immediate analysis or when explicitly requested
    if (immediate) {
      console.log('⚡ AI Grammar Checker - Running immediate analysis')
      return this.performAnalysis(text)
    }

    // Set up delayed analysis
    console.log('⏱️ AI Grammar Checker - Setting up delayed analysis:', this.ANALYSIS_DELAY, 'ms')
    return new Promise((resolve) => {
      this.analysisTimeout = setTimeout(async () => {
        console.log('⏰ AI Grammar Checker - Delayed analysis timeout triggered')
        const suggestions = await this.performAnalysis(text)
        resolve(suggestions)
      }, this.ANALYSIS_DELAY)
    })
  }

  /**
   * Perform the actual grammar analysis
   */
  private async performAnalysis(text: string): Promise<GrammarSuggestion[]> {
    console.log('🔍 AI Grammar Checker - Starting analysis for text:', text.length, 'characters')
    if (!text.trim()) return []

    const segments = this.segmentText(text)
    const segmentsToAnalyze = this.getSegmentsToAnalyze(segments)
    
    let newSuggestions: GrammarSuggestion[] = []
    
    // Only call API if there are segments that need analysis
    if (segmentsToAnalyze.length > 0) {
      console.log('🔧 AI Grammar Checker - Calling API for new segments')
      const apiSuggestions = await this.callGrammarAPI(segmentsToAnalyze)
      newSuggestions = this.mapSuggestionsToOriginalText(apiSuggestions, segmentsToAnalyze)
      console.log('✨ AI Grammar Checker - Mapped suggestions:', newSuggestions.length)
      
      // Update cache
      this.updateCache(segmentsToAnalyze, newSuggestions)
    } else {
      console.log('♻️ AI Grammar Checker - No new segments to analyze')
    }

    // Get cached suggestions for unchanged segments
    const cachedSuggestions = this.getCachedSuggestions(
      segments.filter(s => !segmentsToAnalyze.includes(s))
    )
    console.log('💾 AI Grammar Checker - Cached suggestions:', cachedSuggestions.length)

    // Combine all suggestions
    const allSuggestions = [...newSuggestions, ...cachedSuggestions]
    console.log('🎯 AI Grammar Checker - Final suggestions:', allSuggestions.length, allSuggestions)
    
    return allSuggestions.sort((a, b) => a.start - b.start)
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestion: GrammarSuggestion, originalText?: string): void {
    // Generate a unique ID based on the suggestion properties
    // Since we don't have the original text context, we'll use the suggestion's properties
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
      sessionStorage.removeItem('dismissed-grammar-suggestions')
    } catch (error) {
      console.error('Failed to clear dismissed suggestions:', error)
    }
  }

  /**
   * Clear cache (useful for testing or manual resets)
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const aiGrammarChecker = new AIGrammarChecker() 