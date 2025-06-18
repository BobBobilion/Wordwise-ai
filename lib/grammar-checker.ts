import type { GrammarSuggestion } from './types'

let grammarChecker: any = null;

// Initialize the grammar checker only on client side
async function getGrammarChecker() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!grammarChecker) {
    try {
      const { EnhancedGrammarChecker } = await import('./enhanced-grammar-checker');
      grammarChecker = new EnhancedGrammarChecker();
    } catch (error) {
      console.error('Failed to initialize grammar checker:', error);
      return null;
    }
  }

  return grammarChecker;
}

export async function checkGrammar(text: string): Promise<GrammarSuggestion[]> {
  try {
    const checker = await getGrammarChecker();
    if (!checker) return [];
    
    return await checker.checkAll(text);
  } catch (error) {
    console.error('Grammar check failed:', error);
    return [];
  }
}

export async function checkSpelling(text: string, forceCheck: boolean = false): Promise<GrammarSuggestion[]> {
  try {
    const checker = await getGrammarChecker();
    if (!checker) return [];
    
    return await checker.checkSpelling(text, forceCheck);
  } catch (error) {
    console.error('Spelling check failed:', error);
    return [];
  }
}

export async function checkStyleAndGrammar(text: string): Promise<GrammarSuggestion[]> {
  try {
    const checker = await getGrammarChecker();
    if (!checker) return [];
    
    return await checker.checkStyleAndGrammar(text);
  } catch (error) {
    console.error('Style and grammar check failed:', error);
    return [];
  }
}

export async function dismissSuggestion(suggestion: GrammarSuggestion, fullText: string): Promise<void> {
  try {
    const checker = await getGrammarChecker();
    if (!checker) return;
    
    checker.dismissSuggestion(suggestion, fullText);
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

// Export the class for direct use if needed
export { EnhancedGrammarChecker } from './enhanced-grammar-checker';
