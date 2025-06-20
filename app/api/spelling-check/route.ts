import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface SpellingCheckRequest {
  text: string
}

interface SpellingSuggestion {
  text: string
  suggestion: string
  start: number
  end: number
  type: "spelling"
  description?: string
}

interface SpellingCheckResponse {
  suggestions: SpellingSuggestion[]
}

export async function POST(request: NextRequest) {
  console.log("Spelling check API called")
  
  try {
    const { text }: SpellingCheckRequest = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ suggestions: [] })
    }

    const { text: aiResponse } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are a spelling assistant. Analyze the provided text and identify spelling errors only.

For each spelling error found, respond in this exact JSON format:
{
  "text": "the misspelled word",
  "suggestion": "correct spelling",
  "start": position_in_text,
  "end": end_position_in_text,
  "type": "spelling",
  "description": "brief explanation"
}

Rules:
- Only return valid JSON array of suggestion objects
- Focus ONLY on spelling errors, not grammar or style
- start/end positions should be the exact character positions in the text
- For spelling: suggest the correct spelling
- Ignore proper nouns, names, technical terms unless clearly misspelled
- If no spelling errors found, return empty array []

Respond with ONLY the JSON array, no other text.`,
      prompt: `Check the spelling in this text: "${text}"`,
      maxTokens: 3000,
      temperature: 0.1,
    })

    // Parse AI response
    let suggestions: SpellingSuggestion[] = []
    
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
        suggestion.type === 'spelling'
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