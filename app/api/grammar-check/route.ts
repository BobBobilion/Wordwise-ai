import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface GrammarCheckRequest {
  text: string
}

interface GrammarSuggestion {
  text: string
  suggestion: string
  start: number
  end: number
  type: "grammar" | "style"
  description?: string
}

interface GrammarCheckResponse {
  suggestions: GrammarSuggestion[]
}

export async function POST(request: NextRequest) {
  console.log("Grammar check API called")
  
  try {
    const { text }: GrammarCheckRequest = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ suggestions: [] })
    }

    const { text: aiResponse } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are a grammar and style assistant. Analyze the provided text and identify grammar and style issues only.

For each issue found, respond in this exact JSON format:
{
  "text": "the problematic text",
  "suggestion": "corrected text",
  "start": position_in_text,
  "end": end_position_in_text,
  "type": "grammar|style",
  "description": "brief explanation of the issue"
}

Rules:
- Only return valid JSON array of suggestion objects
- Focus ONLY on grammar and style issues, NOT spelling
- start/end positions should be the exact character positions in the text
- For grammar: suggest grammatically correct alternatives
- For style: suggest clearer, more concise alternatives
- Ignore minor style preferences
- If no issues found, return empty array []

Respond with ONLY the JSON array, no other text.`,
      prompt: `Analyze this text for grammar and style issues: "${text}"`,
      maxTokens: 3000,
      temperature: 0.1,
    })

    // Parse AI response
    let suggestions: GrammarSuggestion[] = []
    
    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        // Try parsing the entire response as JSON
        suggestions = JSON.parse(aiResponse)
      }
      
      // Validate suggestions format
      const validSuggestions = suggestions.filter((suggestion: any) => 
        suggestion.text && 
        suggestion.suggestion &&
        typeof suggestion.start === 'number' &&
        typeof suggestion.end === 'number' &&
        ['grammar', 'style'].includes(suggestion.type)
      )
      
      suggestions = validSuggestions
      
    } catch (parseError) {
      suggestions = []
    }

    return NextResponse.json({ suggestions })

  } catch (error) {
    // Return empty suggestions on error (as requested)
    return NextResponse.json({ suggestions: [] })
  }
} 