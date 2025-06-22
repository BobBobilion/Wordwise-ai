import { LocalLinter, binaryInlined } from 'harper.js';

async function inspectRawHarperResponse() {
  try {
    console.log("=== INSPECTING RAW HARPER.JS RESPONSE ===");
    
    console.log("Initializing Harper.js linter...");
    const linter = new LocalLinter({ binary: binaryInlined });
    await linter.setup();
    console.log("Linter initialized successfully");

    const testText = "Helo wordl. Tis is a test.";
    console.log("Testing with text:", testText);

    const result = await linter.lint(testText);
    
    console.log("\n=== RAW RESULT INSPECTION ===");
    console.log("Result type:", typeof result);
    console.log("Result constructor:", result.constructor.name);
    console.log("Result is array:", Array.isArray(result));
    console.log("Result length:", result.length);
    
    if (result.length > 0) {
      const firstLint = result[0];
      console.log("\n=== FIRST LINT OBJECT INSPECTION ===");
      console.log("First lint type:", typeof firstLint);
      console.log("First lint constructor:", firstLint.constructor.name);
      console.log("First lint keys:", Object.keys(firstLint));
      
      // Call the correct methods to get the actual values
      let span = { start: 0, end: 0 };
      let suggestions = [];
      let message = '';
      let kind = '';
      try {
        if (typeof firstLint.span === 'function') span = firstLint.span();
        if (typeof firstLint.suggestions === 'function') suggestions = firstLint.suggestions();
        if (typeof firstLint.message === 'function') message = firstLint.message();
        if (typeof firstLint.kind === 'function') kind = firstLint.kind();
      } catch (e) {
        console.log('Error calling Lint methods:', e);
      }
      console.log("span:", span);
      console.log("suggestions:", suggestions);
      console.log("message:", message);
      console.log("kind:", kind);
      if (span && typeof span === 'object') {
        const start = span.start;
        const end = span.end;
        console.log(`Text span in original: '${testText.substring(start, end)}'`);
      }
    }

  } catch (error) {
    console.error("Test failed:", error);
  }
}

function mapHarperResponse(harperLints, originalText) {
  return harperLints.map((lint, index) => {
    let start = 0, end = 0, suggestionsArr = [], description = '', type = 'grammar';

    try {
      // Call the methods!
      const span = lint.span();
      start = span.start;
      end = span.end;

      suggestionsArr = lint.suggestions();
      description = lint.message();
      type = lint.kind() === 'spelling' ? 'spelling' : 'grammar';
    } catch (e) {
      console.error('Error extracting lint:', e);
    }

    return {
      text: originalText.substring(start, end),
      suggestion: suggestionsArr[0] || originalText.substring(start, end),
      start,
      end,
      type,
      description
    };
  });
}

inspectRawHarperResponse(); 