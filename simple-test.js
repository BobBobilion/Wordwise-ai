// Simple test to show the parsing issue
const sampleResponse = `[
  {
    "name": "Sadie",
    "mentions": 2,
    "role": "Supporting Character",
    "description": "**Sadie** has *long hair* and *bright eyes*. She is one of the friends who participates in telling ghost stories. Her main motivation is *entertaining her friends* with spooky tales."
  }
]`;

// Old parsing function (problematic)
function oldParse(response) {
  try {
    const cleanedResponse = response.trim();
    const jsonStart = cleanedResponse.indexOf('[');
    const jsonEnd = cleanedResponse.lastIndexOf(']') + 1;
    const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
    const characters = JSON.parse(jsonString);
    
    if (!Array.isArray(characters)) {
      throw new Error("Response is not an array");
    }
    
    const validCharacters = characters.filter((char) => {
      const isValid = char && 
        typeof char.name === 'string' && 
        typeof char.role === 'string' &&
        typeof char.description === 'string' &&
        typeof char.type === 'string'; // This fails!
      
      const hasValidMentions = typeof char.mentions === 'number' || 
                              typeof char.mentions === 'string' ||
                              char.mentions === undefined;
      
      return isValid && hasValidMentions;
    });
    
    return validCharacters;
  } catch (error) {
    console.error("Error:", error.message);
    return [];
  }
}

// New parsing function (fixed)
function newParse(response) {
  try {
    const cleanedResponse = response.trim();
    const jsonStart = cleanedResponse.indexOf('[');
    const jsonEnd = cleanedResponse.lastIndexOf(']') + 1;
    const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
    const characters = JSON.parse(jsonString);
    
    if (!Array.isArray(characters)) {
      throw new Error("Response is not an array");
    }
    
    const validCharacters = characters.filter((char) => {
      const hasRequiredFields = char && 
        typeof char.name === 'string' && 
        typeof char.role === 'string' &&
        typeof char.description === 'string';
      
      const hasValidMentions = typeof char.mentions === 'number' || 
                              typeof char.mentions === 'string' ||
                              char.mentions === undefined;
      
      return hasRequiredFields && hasValidMentions;
    }).map((char) => {
      return {
        name: char.name,
        mentions: typeof char.mentions === 'number' ? char.mentions : 
                 typeof char.mentions === 'string' ? parseInt(char.mentions) || 0 : 0,
        role: char.role,
        description: char.description,
        type: char.type || 'Human' // Default value!
      };
    });
    
    return validCharacters;
  } catch (error) {
    console.error("Error:", error.message);
    return [];
  }
}

console.log('🔍 Testing Parsing Functions...\n');

console.log('❌ OLD PARSING (fails due to missing "type" field):');
const oldResult = oldParse(sampleResponse);
console.log('Characters found:', oldResult.length);
console.log('Result:', JSON.stringify(oldResult, null, 2));

console.log('\n✅ NEW PARSING (works with default "type" field):');
const newResult = newParse(sampleResponse);
console.log('Characters found:', newResult.length);
console.log('Result:', JSON.stringify(newResult, null, 2));

console.log('\n💡 The issue was that the AI response was missing the "type" field!');
console.log('The fix: Provide a default value of "Human" when "type" is missing.'); 