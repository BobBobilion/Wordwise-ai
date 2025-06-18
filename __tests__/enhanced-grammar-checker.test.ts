import { EnhancedGrammarChecker } from '../lib/enhanced-grammar-checker';

// Mock the libraries
jest.mock('typo-js', () => {
  return jest.fn().mockImplementation(() => ({
    check: jest.fn((word: string) => {
      // Mock spell checker - return false for misspelled words
      const misspelledWords = ['teh', 'recieve', 'occured', 'seperate', 'definately'];
      return !misspelledWords.includes(word.toLowerCase());
    }),
    suggest: jest.fn((word: string) => {
      // Mock suggestions
      const suggestions: { [key: string]: string[] } = {
        'teh': ['the'],
        'recieve': ['receive'],
        'occured': ['occurred'],
        'seperate': ['separate'],
        'definately': ['definitely']
      };
      return suggestions[word.toLowerCase()] || [];
    })
  }));
});

jest.mock('write-good', () => {
  return jest.fn((text: string) => {
    // Mock write-good suggestions
    const suggestions = [];
    
    // Check for passive voice
    if (text.includes('was written')) {
      suggestions.push({
        index: text.indexOf('was written'),
        offset: 'was written'.length,
        reason: 'Passive voice detected. Consider using active voice.'
      });
    }
    
    // Check for wordy phrases
    if (text.includes('in order to')) {
      suggestions.push({
        index: text.indexOf('in order to'),
        offset: 'in order to'.length,
        reason: 'Wordy phrase. Consider using "to" instead.'
      });
    }
    
    // Check for weasel words
    if (text.includes('many people say')) {
      suggestions.push({
        index: text.indexOf('many people say'),
        offset: 'many people say'.length,
        reason: 'Weasel words detected. Be more specific.'
      });
    }
    
    return suggestions;
  });
});

describe('EnhancedGrammarChecker', () => {
  let grammarChecker: EnhancedGrammarChecker;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fetch for dictionary files
    (global.fetch as jest.Mock).mockResolvedValue({
      text: jest.fn().mockResolvedValue('mock dictionary data')
    });
    
    grammarChecker = new EnhancedGrammarChecker();
  });

  describe('Initialization', () => {
    test('should initialize spell checker on client side', async () => {
      // Force initialization
      await (grammarChecker as any).initialize();
      
      expect(global.fetch).toHaveBeenCalledWith('/dictionaries/en_US.aff');
      expect(global.fetch).toHaveBeenCalledWith('/dictionaries/en_US.dic');
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock fetch to throw error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await (grammarChecker as any).initialize();
      
      // Should not throw, but spell checker should be null
      expect((grammarChecker as any).spellChecker).toBeNull();
    });
  });

  describe('Spell Checking', () => {
    beforeEach(async () => {
      // Initialize the checker
      await (grammarChecker as any).initialize();
    });

    test('should detect misspelled words', async () => {
      const text = 'This is teh correct way to recieve the message.';
      const suggestions = await grammarChecker.checkSpelling(text, true);
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toMatchObject({
        text: 'teh',
        suggestion: 'the',
        type: 'spelling',
        description: 'Did you mean "the"?'
      });
      expect(suggestions[1]).toMatchObject({
        text: 'recieve',
        suggestion: 'receive',
        type: 'spelling',
        description: 'Did you mean "receive"?'
      });
    });

    test('should skip short text', async () => {
      const text = 'Hi';
      const suggestions = await grammarChecker.checkSpelling(text, true);
      
      expect(suggestions).toHaveLength(0);
    });

    test('should respect timer intervals', async () => {
      const text = 'This is teh correct way to recieve the message.';
      
      // First check should work
      const firstCheck = await grammarChecker.checkSpelling(text, true);
      expect(firstCheck.length).toBeGreaterThan(0);
      
      // Second check within interval should be skipped
      const secondCheck = await grammarChecker.checkSpelling(text, false);
      expect(secondCheck).toHaveLength(0);
    });

    test('should handle force check', async () => {
      const text = 'This is teh correct way to recieve the message.';
      
      // First check
      await grammarChecker.checkSpelling(text, true);
      
      // Force check should work even within interval
      const forceCheck = await grammarChecker.checkSpelling(text, true);
      expect(forceCheck.length).toBeGreaterThan(0);
    });

    test('should limit word processing for performance', async () => {
      // Create a long text with many words
      const longText = 'This is a test '.repeat(6000) + 'teh recieve';
      const suggestions = await grammarChecker.checkSpelling(longText, true);
      
      // Should still find misspellings but limit processing
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Grammar and Style Checking', () => {
    test('should detect passive voice', async () => {
      const text = 'The document was written by the author.';
      const suggestions = await grammarChecker.checkStyleAndGrammar(text);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        text: 'was written',
        type: 'grammar',
        description: 'Passive voice detected. Consider using active voice.'
      });
    });

    test('should detect wordy phrases', async () => {
      const text = 'I went to the store in order to buy groceries.';
      const suggestions = await grammarChecker.checkStyleAndGrammar(text);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        text: 'in order to',
        type: 'grammar',
        description: 'Wordy phrase. Consider using "to" instead.'
      });
    });

    test('should detect weasel words', async () => {
      const text = 'Many people say that this is the best solution.';
      const suggestions = await grammarChecker.checkStyleAndGrammar(text);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        text: 'many people say',
        type: 'grammar',
        description: 'Weasel words detected. Be more specific.'
      });
    });

    test('should respect timer intervals', async () => {
      const text = 'The document was written by the author.';
      
      // First check should work
      const firstCheck = await grammarChecker.checkStyleAndGrammar(text);
      expect(firstCheck.length).toBeGreaterThan(0);
      
      // Second check within interval should be skipped
      const secondCheck = await grammarChecker.checkStyleAndGrammar(text);
      expect(secondCheck).toHaveLength(0);
    });

    test('should handle multiple issues in same text', async () => {
      const text = 'Many people say that the document was written in order to explain the process.';
      const suggestions = await grammarChecker.checkStyleAndGrammar(text);
      
      expect(suggestions).toHaveLength(3);
    });
  });

  describe('Combined Checking', () => {
    beforeEach(async () => {
      await (grammarChecker as any).initialize();
    });

    test('should return both spelling and grammar suggestions', async () => {
      const text = 'Many people say that teh document was written in order to recieve the message.';
      const suggestions = await grammarChecker.checkAll(text, true);
      
      // Should have both spelling and grammar suggestions
      const spellingSuggestions = suggestions.filter(s => s.type === 'spelling');
      const grammarSuggestions = suggestions.filter(s => s.type === 'grammar');
      
      expect(spellingSuggestions.length).toBeGreaterThan(0);
      expect(grammarSuggestions.length).toBeGreaterThan(0);
      expect(suggestions).toHaveLength(spellingSuggestions.length + grammarSuggestions.length);
    });

    test('should sort suggestions by position', async () => {
      const text = 'teh document was written in order to recieve the message.';
      const suggestions = await grammarChecker.checkAll(text, true);
      
      // Check that suggestions are sorted by start position
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].start).toBeGreaterThanOrEqual(suggestions[i - 1].start);
      }
    });
  });

  describe('Utility Methods', () => {
    test('should reset timers', () => {
      grammarChecker.resetTimers();
      
      expect((grammarChecker as any).lastSpellCheck).toBe(0);
      expect((grammarChecker as any).lastStyleCheck).toBe(0);
    });

    test('should update intervals', () => {
      grammarChecker.updateIntervals(5000, 8000);
      
      expect((grammarChecker as any).spellCheckInterval).toBe(5000);
      expect((grammarChecker as any).styleCheckInterval).toBe(8000);
    });
  });

  describe('Dismissed Suggestions', () => {
    beforeEach(async () => {
      await (grammarChecker as any).initialize();
    });

    test('should dismiss suggestions and prevent them from reappearing', async () => {
      const text = 'This is teh correct way to recieve the message.';
      
      // First check - should find misspellings
      const firstCheck = await grammarChecker.checkSpelling(text, true);
      expect(firstCheck.length).toBeGreaterThan(0);
      
      // Dismiss the first suggestion
      const suggestionToDismiss = firstCheck[0];
      grammarChecker.dismissSuggestion(suggestionToDismiss, text);
      
      // Second check - dismissed suggestion should not appear
      const secondCheck = await grammarChecker.checkSpelling(text, true);
      const dismissedSuggestion = secondCheck.find(s => 
        s.text === suggestionToDismiss.text && 
        s.start === suggestionToDismiss.start
      );
      expect(dismissedSuggestion).toBeUndefined();
      
      // Other suggestions should still appear
      expect(secondCheck.length).toBeGreaterThan(0);
    });

    test('should clear dismissed suggestions when text changes', async () => {
      const originalText = 'This is teh correct way to recieve the message.';
      const modifiedText = 'This is teh correct way to receive the message.'; // Fixed one word
      
      // First check
      const firstCheck = await grammarChecker.checkSpelling(originalText, true);
      expect(firstCheck.length).toBeGreaterThan(0);
      
      // Dismiss a suggestion
      const suggestionToDismiss = firstCheck[0];
      grammarChecker.dismissSuggestion(suggestionToDismiss, originalText);
      
      // Check with modified text - dismissed suggestions should be cleared
      const modifiedCheck = await grammarChecker.checkSpelling(modifiedText, true);
      
      // The dismissed suggestion should be cleared and not affect the new text
      expect(grammarChecker.getDismissedSuggestionsCount()).toBe(0);
    });

    test('should track dismissed suggestions count', async () => {
      const text = 'This is teh correct way to recieve the message.';
      
      // Initial count should be 0
      expect(grammarChecker.getDismissedSuggestionsCount()).toBe(0);
      
      // Check and dismiss suggestions
      const suggestions = await grammarChecker.checkSpelling(text, true);
      grammarChecker.dismissSuggestion(suggestions[0], text);
      
      // Count should be 1
      expect(grammarChecker.getDismissedSuggestionsCount()).toBe(1);
      
      // Dismiss another suggestion
      if (suggestions.length > 1) {
        grammarChecker.dismissSuggestion(suggestions[1], text);
        expect(grammarChecker.getDismissedSuggestionsCount()).toBe(2);
      }
    });

    test('should clear all dismissed suggestions', async () => {
      const text = 'This is teh correct way to recieve the message.';
      
      // Check and dismiss suggestions
      const suggestions = await grammarChecker.checkSpelling(text, true);
      grammarChecker.dismissSuggestion(suggestions[0], text);
      
      expect(grammarChecker.getDismissedSuggestionsCount()).toBeGreaterThan(0);
      
      // Clear all dismissed suggestions
      grammarChecker.clearDismissedSuggestions();
      expect(grammarChecker.getDismissedSuggestionsCount()).toBe(0);
      
      // Check again - dismissed suggestions should reappear
      const secondCheck = await grammarChecker.checkSpelling(text, true);
      expect(secondCheck.length).toBeGreaterThan(0);
    });

    test('should handle dismiss for both spelling and grammar suggestions', async () => {
      const text = 'Many people say that teh document was written in order to recieve the message.';
      
      // Check both spelling and grammar
      const allSuggestions = await grammarChecker.checkAll(text, true);
      expect(allSuggestions.length).toBeGreaterThan(0);
      
      // Dismiss a spelling suggestion
      const spellingSuggestion = allSuggestions.find(s => s.type === 'spelling');
      if (spellingSuggestion) {
        grammarChecker.dismissSuggestion(spellingSuggestion, text);
      }
      
      // Dismiss a grammar suggestion
      const grammarSuggestion = allSuggestions.find(s => s.type === 'grammar');
      if (grammarSuggestion) {
        grammarChecker.dismissSuggestion(grammarSuggestion, text);
      }
      
      // Both should be dismissed
      expect(grammarChecker.getDismissedSuggestionsCount()).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle spell checker errors gracefully', async () => {
      await (grammarChecker as any).initialize();
      
      // Mock spell checker to throw error
      (grammarChecker as any).spellChecker.check = jest.fn().mockImplementation(() => {
        throw new Error('Spell check error');
      });
      
      const text = 'This is a test.';
      const suggestions = await grammarChecker.checkSpelling(text, true);
      
      expect(suggestions).toHaveLength(0);
    });

    test('should handle write-good errors gracefully', async () => {
      // Mock write-good to throw error
      const writeGood = require('write-good');
      writeGood.mockImplementation(() => {
        throw new Error('Write-good error');
      });
      
      const text = 'This is a test.';
      const suggestions = await grammarChecker.checkStyleAndGrammar(text);
      
      expect(suggestions).toHaveLength(0);
    });
  });
}); 