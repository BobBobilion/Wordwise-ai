// Simple test to verify dismiss functionality
// Run this in the browser console to test

async function testDismissFunctionality() {
  console.log('Testing dismiss functionality...');
  
  // Import the grammar checker
  const { EnhancedGrammarChecker } = await import('./lib/enhanced-grammar-checker.js');
  const checker = new EnhancedGrammarChecker();
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const testText = 'This is teh correct way to recieve the message.';
  
  // First check - should find misspellings
  console.log('1. Running first spell check...');
  const firstCheck = await checker.checkSpelling(testText, true);
  console.log('First check results:', firstCheck);
  
  if (firstCheck.length === 0) {
    console.log('No suggestions found, test cannot continue');
    return;
  }
  
  // Dismiss the first suggestion
  console.log('2. Dismissing first suggestion...');
  const suggestionToDismiss = firstCheck[0];
  checker.dismissSuggestion(suggestionToDismiss, testText);
  console.log('Dismissed suggestion:', suggestionToDismiss.text);
  
  // Second check - dismissed suggestion should not appear
  console.log('3. Running second spell check...');
  const secondCheck = await checker.checkSpelling(testText, true);
  console.log('Second check results:', secondCheck);
  
  const dismissedSuggestion = secondCheck.find(s => 
    s.text === suggestionToDismiss.text && 
    s.suggestion === suggestionToDismiss.suggestion
  );
  
  if (dismissedSuggestion) {
    console.log('❌ FAILED: Dismissed suggestion reappeared!');
  } else {
    console.log('✅ SUCCESS: Dismissed suggestion did not reappear');
  }
  
  console.log('Dismissed suggestions count:', checker.getDismissedSuggestionsCount());
}

// Run the test
testDismissFunctionality().catch(console.error); 