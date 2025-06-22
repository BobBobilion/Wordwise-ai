import { LocalLinter, binary } from 'harper.js';

async function testHarper() {
  try {
    console.log('Initializing Harper.js linter...');
    const linter = new LocalLinter({ binary });
    await linter.setup();
    console.log('Linter initialized successfully!');

    const testText = "This is a test text with some spelling erors and grammer issues.";
    console.log('Testing with text:', testText);
    
    const result = await linter.lint(testText);
    console.log('Linting result:', JSON.stringify(result, null, 2));
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testHarper(); 