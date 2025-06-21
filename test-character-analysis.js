const testCharacterAnalysis = async () => {
  // Sample text for testing character analysis
  const sampleText = `
    In the bustling city of New York, Detective Sarah Johnson walked down the rain-soaked streets, her trench coat billowing behind her. She was determined to solve the mysterious disappearance of her partner, Detective Mike Rodriguez, who had vanished three days ago while investigating a high-profile case involving the notorious crime boss, Antonio "The Snake" Martinez.
    
    Sarah had been working with Mike for five years, and they had become more than just partners - they were best friends. Mike was a dedicated officer with a sharp mind and a heart of gold, always putting others before himself. His disappearance had left a void in the precinct, and Sarah knew she had to find him before it was too late.
    
    As she approached the old warehouse where Mike was last seen, Sarah noticed a shadowy figure watching from the rooftop. It was Carlos, Mike's informant, who had been helping them gather information on Martinez's operations. Carlos was a street-smart kid with a troubled past, but he had proven himself trustworthy time and time again.
    
    "Sarah!" Carlos called out, his voice barely audible over the sound of the rain. "I found something you need to see." He gestured toward a nearby alley where a young woman named Emily Chen was waiting. Emily was a forensic analyst who had been working closely with Mike on the case, and she had discovered some crucial evidence that could break the case wide open.
  `;

  try {
    console.log('🚀 Testing Character Analysis API...\n');
    console.log('📝 Sample Text Length:', sampleText.length, 'characters\n');
    
    const response = await fetch('http://localhost:3000/api/character-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: sampleText }),
    });

    const data = await response.json();
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data:\n');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.characters && data.characters.length > 0) {
      console.log('\n🎭 Characters Found:', data.characters.length);
      data.characters.forEach((character, index) => {
        console.log(`\n${index + 1}. ${character.name}`);
        console.log(`   Role: ${character.role}`);
        console.log(`   Type: ${character.type}`);
        console.log(`   Mentions: ${character.mentions}`);
        console.log(`   Description: ${character.description}`);
      });
    } else {
      console.log('\n❌ No characters found in the analysis');
    }
    
    if (data.metadata) {
      console.log('\n📈 Metadata:');
      console.log(`   Input Length: ${data.metadata.inputLength}`);
      console.log(`   Optimized Length: ${data.metadata.optimizedLength}`);
      console.log(`   Estimated Tokens: ${data.metadata.estimatedTokens}`);
      console.log(`   Model: ${data.metadata.model}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing character analysis:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your Next.js development server is running:');
      console.log('   npm run dev');
    }
  }
};

// Run the test
testCharacterAnalysis(); 