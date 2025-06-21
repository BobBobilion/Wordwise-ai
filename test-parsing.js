// Test the parsing function with the provided JSON
const testParsing = () => {
  const sampleResponse = `[
  {
    "name": "Sadie",
    "mentions": 2,
    "role": "Supporting Character",
    "description": "**Sadie** has *long hair* and *bright eyes*. She is one of the friends who participates in telling ghost stories. Her main motivation is *entertaining her friends* with spooky tales."
  },
  {
    "name": "Katie",
    "mentions": 4,
    "role": "Main Character",
    "description": "**Katie** has *curly hair* and *a playful demeanor*. She is a central figure who expresses her fear of ghost stories and later surprises her friends. Her main motivation is *to have fun and scare her friends*."
  },
  {
    "name": "Lucy",
    "mentions": 3,
    "role": "Supporting Character",
    "description": "**Lucy** has *short hair* and *an adventurous spirit*. She takes the lead in telling a scary story, showcasing her creativity. Her main motivation is *to impress her friends with a thrilling tale*."
  },
  {
    "name": "The Man",
    "mentions": 1,
    "role": "Minor Character",
    "description": "**The Man** is described as *mysterious* and *ominous*. He appears in Lucy's story as a figure that adds suspense and fear. His main role is to *heighten the tension in the ghost story*."
  },
  {
    "name": "The Baby",
    "mentions": 1,
    "role": "Minor Character",
    "description": "**The Baby** appears as a *cute creature* with *yellow, bloody fangs*. It transforms into a bat in Lucy's story, contributing to the horror element. Its main role is to *serve as a shocking twist in the narrative*."
  }
]`;

  // Simulate the current parsing function
  function parseCharacterResponse(response) {
    try {
      const cleanedResponse = response.trim();
      const jsonStart = cleanedResponse.indexOf('[');
      const jsonEnd = cleanedResponse.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("Invalid JSON format");
      }
      
      const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
      const characters = JSON.parse(jsonString);
      
      if (!Array.isArray(characters)) {
        throw new Error("Response is not an array");
      }
      
      // This is the problematic validation
      const validCharacters = characters.filter((char) => {
        const isValid = char && 
          typeof char.name === 'string' && 
          typeof char.role === 'string' &&
          typeof char.description === 'string' &&
          typeof char.type === 'string'; // This fails because 'type' is missing
        
        const hasValidMentions = typeof char.mentions === 'number' || 
                                typeof char.mentions === 'string' ||
                                char.mentions === undefined;
        
        return isValid && hasValidMentions;
      });
      
      return validCharacters;
      
    } catch (error) {
      console.error("Error parsing character response:", error);
      return [];
    }
  }

  console.log('🔍 Testing Current Parsing Function...\n');
  console.log('📝 Sample Response:');
  console.log(sampleResponse);
  console.log('\n' + '='.repeat(50));
  
  const result = parseCharacterResponse(sampleResponse);
  console.log('❌ Result (should be empty due to missing "type" field):');
  console.log(JSON.stringify(result, null, 2));
  console.log('Characters found:', result.length);
  
  console.log('\n💡 The issue: Each character object is missing the "type" field!');
  console.log('The parsing function requires: name, role, description, AND type');
};

testParsing(); 