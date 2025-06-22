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
  type: "grammar" | "spelling"
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

// Map Harper.js response to our interface
function mapHarperResponse(harperLints: any[], originalText: string): GrammarSuggestion[] {
  console.log("=== HARPER.JS RAW RESPONSE ===")
  console.log("Original text:", originalText)
  console.log("Number of lints found:", harperLints.length)
  
  const mappedSuggestions = harperLints.map((lint, index) => {
    try {
      // Get span info
      let span = lint.span;
      let start = 0;
      let end = 0;
      
      if (span && typeof span === 'function') {
        try {
          span = span();
          start = span?.start ?? 0;
          end = span?.end ?? 0;
        } catch (spanError) {
          console.log(`Error getting span for lint ${index}:`, spanError);
          start = 0;
          end = 0;
        }
      } else if (span && typeof span === 'object') {
        start = span?.start ?? 0;
        end = span?.end ?? 0;
      }

      // Get suggestions as strings
      let suggestionsArr: string[] = [];
      if (typeof lint.suggestions === 'function') {
        try {
          const rawSuggestions = lint.suggestions();
          suggestionsArr = rawSuggestions.map((s: any) => {
            try {
              // Try different ways to get the actual text from WASM objects
              if (typeof s === 'string') {
                return s;
              } else if (s && typeof s === 'object') {
                // Try to access common properties that might contain the text
                if (s.text !== undefined) return s.text;
                if (s.value !== undefined) return s.value;
                if (s.content !== undefined) return s.content;
                if (s.suggestion !== undefined) return s.suggestion;
                // If none of the above, try toString but check if it's meaningful
                const str = s.toString();
                if (str && str !== '[object Object]' && str !== '[object Undefined]') {
                  return str;
                }
                // Last resort: try to access any string-like property
                for (const key in s) {
                  if (typeof s[key] === 'string' && s[key].length > 0) {
                    return s[key];
                  }
                }
              }
              return '';
            } catch (suggestionError) {
              console.log(`Error converting suggestion:`, suggestionError);
              return '';
            }
          });
        } catch (suggestionsError) {
          console.log(`Error getting suggestions for lint ${index}:`, suggestionsError);
          suggestionsArr = [];
        }
      } else if (Array.isArray(lint.suggestions)) {
        suggestionsArr = lint.suggestions.map((s: any) => {
          try {
            // Same logic as above for array suggestions
            if (typeof s === 'string') {
              return s;
            } else if (s && typeof s === 'object') {
              if (s.text !== undefined) return s.text;
              if (s.value !== undefined) return s.value;
              if (s.content !== undefined) return s.content;
              if (s.suggestion !== undefined) return s.suggestion;
              const str = s.toString();
              if (str && str !== '[object Object]' && str !== '[object Undefined]') {
                return str;
              }
              for (const key in s) {
                if (typeof s[key] === 'string' && s[key].length > 0) {
                  return s[key];
                }
              }
            }
            return '';
          } catch (suggestionError) {
            console.log(`Error converting suggestion:`, suggestionError);
            return '';
          }
        });
      }
      
      const text = originalText.substring(start, end);
      const type: 'grammar' | 'spelling' = lint.kind === 'spelling' ? 'spelling' : 'grammar';
      
      let description = '';
      if (lint.problem) {
        try {
          description = typeof lint.problem === 'string' ? lint.problem : (typeof lint.problem?.toString === 'function' ? lint.problem.toString() : '');
        } catch (problemError) {
          console.log(`Error getting problem for lint ${index}:`, problemError);
          description = '';
        }
      }

      console.log(`\n--- Lint ${index + 1} ---`)
      console.log("Problem:", description)
      console.log("Kind:", lint.kind)
      console.log("Span:", { start, end })
      console.log("Text found:", text)
      console.log("Suggestions:", suggestionsArr)
      console.log("Raw lint object:", JSON.stringify(lint, null, 2))

      return {
        text,
        suggestion: suggestionsArr[0] || text,
        start,
        end,
        type,
        description
      }
    } catch (lintError) {
      console.log(`Error processing lint ${index}:`, lintError);
      return {
        text: '',
        suggestion: '',
        start: 0,
        end: 0,
        type: 'grammar' as const,
        description: ''
      };
    }
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