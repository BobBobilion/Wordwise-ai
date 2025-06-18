import type { GrammarSuggestion } from './types'
import writeGood from 'write-good'

interface SpellSuggestion {
  text: string;
  suggestion: string;
  start: number;
  end: number;
  type: 'spelling';
  description?: string;
}

interface StyleSuggestion {
  text: string;
  suggestion: string;
  start: number;
  end: number;
  type: 'style' | 'grammar';
  description?: string;
}

interface DismissedSuggestion {
  text: string;
  suggestion: string;
  start: number;
  end: number;
  type: 'spelling' | 'style' | 'grammar';
  textHash: string; // Hash of the surrounding text for context
}

export class EnhancedGrammarChecker {
  private spellChecker: any;
  private lastSpellCheck: number = 0;
  private lastStyleCheck: number = 0;
  private spellCheckInterval: number = 5000; // 5 seconds
  private styleCheckInterval: number = 10000; // 10 seconds
  private isInitialized: boolean = false;
  private dismissedSuggestions: Map<string, DismissedSuggestion> = new Map();
  private lastTextHash: string = '';

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private async initialize() {
    if (this.isInitialized) return;

    // Initialization should only run in the browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.isInitialized = true;
      return;
    }

    try {
      // Some libraries (e.g., typo-js) expect WebExtension globals like `browser.runtime.getURL` or `chrome.runtime.getURL`.
      // Provide minimal stubs so that property accesses don't throw.
      const runtimeStub = { getURL: () => '' };

      if (typeof (globalThis as any).browser === 'undefined') {
        (globalThis as any).browser = { runtime: runtimeStub };
      } else if (!(globalThis as any).browser.runtime) {
        (globalThis as any).browser.runtime = runtimeStub;
      }

      if (typeof (globalThis as any).chrome === 'undefined') {
        (globalThis as any).chrome = { runtime: runtimeStub };
      } else if (!(globalThis as any).chrome.runtime) {
        (globalThis as any).chrome.runtime = runtimeStub;
      }

      // Dynamic import to avoid SSR issues
      const TypoModule = await import('typo-js');
      const Typo = (TypoModule as any).default ?? TypoModule;

      // Load dictionary files from public directory
      const affData = await fetch('/dictionaries/en_US.aff').then((res) => res.text());
      const dicData = await fetch('/dictionaries/en_US.dic').then((res) => res.text());

      this.spellChecker = new Typo('en_US', affData, dicData, {
        platform: 'any',
      });
      
      this.isInitialized = true;
      
      // Test that spell checker is working
      console.log('Spell checker initialized:', {
        'teh': this.spellChecker.check('teh'), // should be false
        'the': this.spellChecker.check('the'), // should be true
        'slkjdlfkj': this.spellChecker.check('slkjdlfkj') // should be false
      });
    } catch (error) {
      console.error('Failed to initialize spell checker:', error);
      this.spellChecker = null;
      this.isInitialized = true; // Mark as initialized to prevent retries
    }
  }

  /**
   * Generate a hash for a text segment to track context changes
   */
  private generateTextHash(text: string, start: number, end: number): string {
    const contextStart = Math.max(0, start - 50);
    const contextEnd = Math.min(text.length, end + 50);
    const context = text.substring(contextStart, contextEnd);
    return `${contextStart}_${contextEnd}_${context}`;
  }

  /**
   * Dismiss a suggestion to prevent it from reappearing
   */
  dismissSuggestion(suggestion: GrammarSuggestion, fullText: string): void {
    const textHash = this.generateTextHash(fullText, suggestion.start, suggestion.end);
    // Use a more flexible key that doesn't depend on exact position
    const key = `${suggestion.text}_${suggestion.suggestion}_${suggestion.type || 'grammar'}`;
    
    this.dismissedSuggestions.set(key, {
      text: suggestion.text,
      suggestion: suggestion.suggestion,
      start: suggestion.start,
      end: suggestion.end,
      type: suggestion.type || 'grammar', // Default to 'grammar' if type is undefined
      textHash
    });
  }

  /**
   * Check if a suggestion has been dismissed
   */
  private isSuggestionDismissed(suggestion: GrammarSuggestion, fullText: string): boolean {
    // Use a more flexible key that doesn't depend on exact position
    const key = `${suggestion.text}_${suggestion.suggestion}_${suggestion.type || 'grammar'}`;
    const dismissed = this.dismissedSuggestions.get(key);
    
    if (!dismissed) return false;
    
    // Check if the context has changed (text was modified)
    const currentTextHash = this.generateTextHash(fullText, suggestion.start, suggestion.end);
    if (dismissed.textHash !== currentTextHash) {
      // Context changed, remove from dismissed list
      this.dismissedSuggestions.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear dismissed suggestions when text changes significantly
   */
  private clearDismissedSuggestionsIfTextChanged(text: string): void {
    // Only check for significant changes, not every spell check
    // Use a more stable hash based on text content rather than position
    const currentTextHash = this.generateStableTextHash(text);
    
    if (this.lastTextHash !== '' && this.lastTextHash !== currentTextHash) {
      // Text changed significantly, clear all dismissed suggestions
      this.dismissedSuggestions.clear();
    }
    
    this.lastTextHash = currentTextHash;
  }

  /**
   * Generate a stable hash for the entire text that's less sensitive to minor changes
   */
  private generateStableTextHash(text: string): string {
    // Use a simple hash based on text content and length
    // This is more stable than position-based hashing
    const cleanText = text.replace(/\s+/g, ' ').trim();
    return `${cleanText.length}_${cleanText.substring(0, 100)}_${cleanText.substring(Math.max(0, cleanText.length - 100))}`;
  }

  /**
   * Spell checker that runs on spacebar press and every 10 seconds
   */
  async checkSpelling(text: string, forceCheck: boolean = false): Promise<SpellSuggestion[]> {
    // Ensure we're on client side and initialized
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return [];
    }

    // Skip if text is too short
    if (text.trim().length < 10) {
      return [];
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Clear dismissed suggestions if text has changed significantly
    this.clearDismissedSuggestionsIfTextChanged(text);

    const now = Date.now();
    
    // Only run if forced (spacebar) or if 10 seconds have passed
    if (!forceCheck && (now - this.lastSpellCheck) < this.spellCheckInterval) {
      return [];
    }

    this.lastSpellCheck = now;
    const suggestions: SpellSuggestion[] = [];

    // If spell checker failed to initialize, return empty array
    if (!this.spellChecker) {
      return [];
    }

    try {
      // Add timeout protection
      const spellCheckPromise = this.performSpellCheck(text);
      const timeoutPromise = new Promise<SpellSuggestion[]>((resolve) => {
        setTimeout(() => resolve([]), 5000); // 5 second timeout
      });
      
      return await Promise.race([spellCheckPromise, timeoutPromise]);
    } catch (error) {
      console.error('Spell check error:', error);
      return [];
    }
  }

  /**
   * Perform the actual spell check
   */
  private async performSpellCheck(text: string): Promise<SpellSuggestion[]> {
    const suggestions: SpellSuggestion[] = [];
    
    try {
      const words = text.split(/\s+/);
      
      // Limit to first 5000 words to prevent excessive processing
      const maxWords = 5000;
      const wordsToCheck = words.length > maxWords ? words.slice(0, maxWords) : words;
      
      let currentIndex = 0;

      for (let i = 0; i < wordsToCheck.length; i++) {
        const word = wordsToCheck[i];
        const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
        const wordStart = text.indexOf(word, currentIndex);

        // Skip if word is too short or contains numbers
        if (cleanWord.length < 2 || /\d/.test(cleanWord)) {
          currentIndex = wordStart + word.length;
          continue;
        }

        // Yield control every 25 words to prevent blocking
        if (i % 25 === 0 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Check if word is misspelled
        if (!this.spellChecker.check(cleanWord)) {
          const spellSuggestions = this.spellChecker.suggest(cleanWord);
          if (spellSuggestions.length > 0) {
            const suggestion: SpellSuggestion = {
              text: word,
              suggestion: spellSuggestions[0],
              start: wordStart,
              end: wordStart + word.length,
              type: 'spelling',
              description: `Did you mean "${spellSuggestions[0]}"?`
            };

            // Only add suggestion if it hasn't been dismissed
            if (!this.isSuggestionDismissed(suggestion, text)) {
              suggestions.push(suggestion);
            }
          }
        }

        currentIndex = wordStart + word.length;
      }
      
      // Log if we limited the check
      if (words.length > maxWords) {
        console.log(`Spell check limited to first ${maxWords} words out of ${words.length} total`);
      }
    } catch (error) {
      console.error('Spell check error:', error);
      return [];
    }

    return suggestions;
  }

  /**
   * Style and grammar checker that runs every 15 seconds
   * Uses write-good library for grammar and style checking
   */
  async checkStyleAndGrammar(text: string): Promise<StyleSuggestion[]> {
    if (typeof window === "undefined") return [];

    // Clear dismissed suggestions if text has changed significantly
    this.clearDismissedSuggestionsIfTextChanged(text);

    const now = Date.now();
    if ((now - this.lastStyleCheck) < this.styleCheckInterval) return [];

    this.lastStyleCheck = now;

    const suggestions: StyleSuggestion[] = [];

    try {
      const result = writeGood(text);

      for (const suggestion of result) {
        // Skip suggestions with missing required properties
        if (suggestion.index === undefined || suggestion.offset === undefined || suggestion.reason === undefined) {
          continue;
        }

        const styleSuggestion: StyleSuggestion = {
          text: text.substring(suggestion.index, suggestion.index + suggestion.offset),
          suggestion: suggestion.reason,
          start: suggestion.index,
          end: suggestion.index + suggestion.offset,
          type: "grammar",
          description: suggestion.reason
        };

        // Only add suggestion if it hasn't been dismissed
        if (!this.isSuggestionDismissed(styleSuggestion, text)) {
          suggestions.push(styleSuggestion);
        }
      }
    } catch (error) {
      console.error("Grammar check error:", error);
    }

    return suggestions;
  }

  /**
   * Combined check that returns both spelling and style suggestions
   */
  async checkAll(text: string, forceSpellCheck: boolean = false): Promise<GrammarSuggestion[]> {
    const [spellSuggestions, styleSuggestions] = await Promise.all([
      this.checkSpelling(text, forceSpellCheck),
      this.checkStyleAndGrammar(text)
    ]);

    return [...spellSuggestions, ...styleSuggestions].sort((a, b) => a.start - b.start);
  }

  /**
   * Reset timers (useful for testing or manual resets)
   */
  resetTimers(): void {
    this.lastSpellCheck = 0;
    this.lastStyleCheck = 0;
    this.dismissedSuggestions.clear();
    this.lastTextHash = '';
  }

  /**
   * Update check intervals
   */
  updateIntervals(spellInterval: number, styleInterval: number): void {
    this.spellCheckInterval = spellInterval;
    this.styleCheckInterval = styleInterval;
  }

  /**
   * Get the number of dismissed suggestions
   */
  getDismissedSuggestionsCount(): number {
    return this.dismissedSuggestions.size;
  }

  /**
   * Clear all dismissed suggestions
   */
  clearDismissedSuggestions(): void {
    this.dismissedSuggestions.clear();
    this.lastTextHash = '';
  }

  /**
   * Get all dismissed suggestions (useful for debugging)
   */
  getDismissedSuggestions(): DismissedSuggestion[] {
    return Array.from(this.dismissedSuggestions.values());
  }
} 