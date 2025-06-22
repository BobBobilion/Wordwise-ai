import { NextRequest, NextResponse } from "next/server"

interface HarperCheckRequest {
  text: string
  documentId?: string
  previousContent?: string
}

interface GrammarSuggestion {
  text: string
  suggestion: string
  start: number
  end: number
  type: "grammar" | "spelling" | "style"
  description?: string
}

interface HarperCheckResponse {
  suggestions: GrammarSuggestion[]
  processingTime: number
  documentLength: number
  processingMethod: 'diff-based' | 'full-document'
}

// Global linter instance
let linter: any = null

// Initialize linter with dynamic import
async function initializeLinter() {
  if (!linter) {
    try {
      const { LocalLinter, binaryInlined } = await import('harper.js');
      linter = new LocalLinter({ binary: binaryInlined })
      await linter.setup()
      console.log("Harper.js linter initialized successfully")
    } catch (error) {
      console.error("Failed to initialize Harper.js linter:", error)
      throw error
    }
  }
  return linter
}

// Helper function to safely extract text from WASM objects
function extractTextFromWasmObject(obj: any): string {
  if (!obj) return '';
  
  try {
    // If it's already a string, return it
    if (typeof obj === 'string') {
      return obj;
    }
    
    // If it's a function, try to call it
    if (typeof obj === 'function') {
      try {
        const result = obj();
        return extractTextFromWasmObject(result);
      } catch (e) {
        console.log('Error calling WASM function:', e);
        return '';
      }
    }
    
    // If it's an object, try to access common text properties
    if (typeof obj === 'object') {
      // Try common property names
      const textProps = ['text', 'value', 'content', 'suggestion', 'message', 'description'];
      for (const prop of textProps) {
        if (obj[prop] !== undefined) {
          const extracted = extractTextFromWasmObject(obj[prop]);
          if (extracted) return extracted;
        }
      }
      
      // Try toString method
      if (typeof obj.toString === 'function') {
        const str = obj.toString();
        if (str && str !== '[object Object]' && str !== '[object Undefined]' && !str.includes('__wbg_ptr')) {
          return str;
        }
      }
      
      // Try to iterate over all properties
      for (const key in obj) {
        if (key !== '__wbg_ptr' && typeof obj[key] === 'string' && obj[key].length > 0) {
          return obj[key];
        }
      }
    }
    
    return '';
  } catch (error) {
    console.log('Error extracting text from WASM object:', error);
    return '';
  }
}

// Helper function to safely extract numbers from WASM objects
function extractNumberFromWasmObject(obj: any, defaultValue: number = 0): number {
  if (!obj) return defaultValue;
  
  try {
    // If it's already a number, return it
    if (typeof obj === 'number') {
      return obj;
    }
    
    // If it's a function, try to call it
    if (typeof obj === 'function') {
      try {
        const result = obj();
        return extractNumberFromWasmObject(result, defaultValue);
      } catch (e) {
        console.log('Error calling WASM function for number:', e);
        return defaultValue;
      }
    }
    
    // If it's an object, try to access common number properties
    if (typeof obj === 'object') {
      const numberProps = ['start', 'end', 'length', 'value', 'index'];
      for (const prop of numberProps) {
        if (obj[prop] !== undefined && typeof obj[prop] === 'number') {
          return obj[prop];
        }
      }
    }
    
    return defaultValue;
  } catch (error) {
    console.log('Error extracting number from WASM object:', error);
    return defaultValue;
  }
}

// Map Harper.js response to our interface
function mapHarperResponse(harperLints: any[], originalText: string): GrammarSuggestion[] {
  console.log("=== HARPER.JS RAW RESPONSE ===")
  console.log("Original text:", originalText)
  console.log("Number of lints found:", harperLints.length)
  
  const mappedSuggestions = harperLints.map((lint, index) => {
    let start = 0, end = 0, suggestionsArr: string[] = [], description = '', type: 'grammar' | 'spelling' | 'style' = 'grammar';
    try {
      // Call the correct methods on the Lint object
      let span = { start: 0, end: 0 };
      if (typeof lint.span === 'function') span = lint.span();
      if (span && typeof span === 'object') {
        start = span.start;
        end = span.end;
      }
      
      // ✅ FIXED: Use correct Harper.js suggestion extraction
      if (typeof lint.suggestions === 'function') {
        const rawSuggestions = lint.suggestions();
        suggestionsArr = rawSuggestions.map((s: any) => {
          if (typeof s === 'string') return s;
          if (typeof s === 'object' && s !== null) {
            // Use the correct Harper.js method
            if (typeof s.get_replacement_text === 'function') {
              return s.get_replacement_text();
            }
            // Fallback to toString if get_replacement_text doesn't exist
            if (typeof s.toString === 'function') {
              const str = s.toString();
              if (str && str !== '[object Object]' && !str.includes('__wbg_ptr')) {
                return str;
              }
            }
          }
          return '';
        }).filter(Boolean);
      }
      
      if (typeof lint.message === 'function') description = lint.message();
      
      // Manual classification based on description text
      const descriptionLower = description.toLowerCase();
      if (descriptionLower.includes('did you mean to spell')) {
        type = 'spelling';
      } else if (descriptionLower.includes('vocabulary enhancement')) {
        type = 'style';
      } else {
        type = 'grammar';
      }
    } catch (e) {
      console.log('Error extracting lint:', e);
    }
    
    const text = originalText.substring(start, end);
    const typeSafe: 'grammar' | 'spelling' | 'style' = type;
    
    console.log(`\n--- Lint ${index + 1} ---`);
    console.log("Description:", description);
    console.log("Kind:", typeSafe);
    console.log("Span:", { start, end });
    console.log("Text found:", text);
    console.log("Suggestions:", suggestionsArr);
    
    return {
      text,
      suggestions: suggestionsArr.length > 0 ? suggestionsArr : [text],
      suggestion: suggestionsArr[0] || text, // Keep for compatibility if needed, but suggestions array is primary
      start,
      end,
      type: typeSafe,
      description
    };
  })
  
  console.log("\n=== MAPPED SUGGESTIONS ===")
  console.log(JSON.stringify(mappedSuggestions, null, 2))
  console.log("=== END HARPER.JS LOG ===\n")
  
  return mappedSuggestions
}

// Basic text linting function
async function lintText(text: string): Promise<GrammarSuggestion[]> {
  try {
    const linter = await initializeLinter()
    const result = await linter.lint(text)
    return mapHarperResponse(result, text)
  } catch (error) {
    console.error("Error linting text with Harper.js:", error)
    return []
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("Harper check API called")
  
  try {
    const { text, documentId, previousContent }: HarperCheckRequest = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ 
        suggestions: [],
        processingTime: Date.now() - startTime,
        documentLength: 0,
        processingMethod: 'full-document'
      })
    }

    // For now, use full document linting
    // TODO: Implement diff-based linting in Phase 2
    const suggestions = await lintText(text)

    const response: HarperCheckResponse = {
      suggestions,
      processingTime: Date.now() - startTime,
      documentLength: text.length,
      processingMethod: 'full-document'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Harper check API error:", error)
    // Return empty suggestions on error
    return NextResponse.json({ 
      suggestions: [],
      processingTime: Date.now() - startTime,
      documentLength: 0,
      processingMethod: 'fallback'
    })
  }
} 