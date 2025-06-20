import type { GrammarSuggestion } from './types'
import { aiSentenceChecker } from './ai-sentence-checker'

// Initialize the AI sentence checker (already a singleton)
async function getGrammarChecker() {
  if (typeof window === 'undefined') {
    return null;
  }

  return aiSentenceChecker;
}

export async function checkGrammar(text: string, immediate: boolean = false): Promise<GrammarSuggestion[]> {
  console.log('📖 Grammar Checker - checkGrammar called:', { textLength: text.length, immediate })
  try {
    const checker = await getGrammarChecker();
    if (!checker) {
      console.log('❌ Grammar Checker - No checker available')
      return [];
    }
    
    console.log('✅ Grammar Checker - Checker available, calling checkText')
    const result = await checker.checkText(text, immediate);
    console.log('📋 Grammar Checker - checkText result:', result.length, 'suggestions')
    return result;
  } catch (error) {
    console.error('❌ Grammar Checker - checkGrammar failed:', error);
    return [];
  }
}

// Alias for checkGrammar to maintain backward compatibility
export async function checkSpelling(text: string, forceCheck: boolean = false): Promise<GrammarSuggestion[]> {
  return checkGrammar(text, forceCheck);
}

// Alias for checkGrammar to maintain backward compatibility  
export async function checkStyleAndGrammar(text: string): Promise<GrammarSuggestion[]> {
  return checkGrammar(text, false);
}

export async function dismissSuggestion(suggestion: GrammarSuggestion): Promise<void> {
  try {
    const checker = await getGrammarChecker();
    if (!checker) return;
    
    checker.dismissSuggestion(suggestion);
  } catch (error) {
    console.error('Failed to dismiss suggestion:', error);
  }
}

export async function getDismissedSuggestionsCount(): Promise<number> {
  try {
    const checker = await getGrammarChecker();
    if (!checker) return 0;
    
    return checker.getDismissedSuggestionsCount();
  } catch (error) {
    console.error('Failed to get dismissed suggestions count:', error);
    return 0;
  }
}

export async function clearDismissedSuggestions(): Promise<void> {
  try {
    const checker = await getGrammarChecker();
    if (!checker) return;
    
    checker.clearDismissedSuggestions();
  } catch (error) {
    console.error('Failed to clear dismissed suggestions:', error);
  }
}

// Export the AI sentence checker for direct use if needed
export { aiSentenceChecker, AISentenceChecker } from './ai-sentence-checker';
