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
  try {
    const { text }: SpellingCheckRequest = await request.json()
    console.log('🔍 Spelling Check API - Received text:', text?.length, 'characters')

    if (!text || !text.trim()) {
      console.log('❌ Spelling Check API - No text provided')
      return NextResponse.json({ suggestions: [] })
    }

    console.log('📤 Spelling Check API - Sending to AI:')
    console.log('📋 Raw text being sent:', JSON.stringify(text))
    console.log('📋 Length:', text.length, 'characters')

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
      maxTokens: 1000,
      temperature: 0.1,
    })

    console.log('📥 Spelling Check API - AI Response:', aiResponse)

    // Parse AI response
    let suggestions: SpellingSuggestion[] = []
    
    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        console.log('✅ Spelling Check API - Found JSON match:', jsonMatch[0])
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        // Try parsing the entire response as JSON
        console.log('🔄 Spelling Check API - Trying to parse full response as JSON')
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
      
      console.log('🔍 Spelling Check API - Raw suggestions:', suggestions.length, suggestions)
      console.log('✅ Spelling Check API - Valid suggestions:', validSuggestions.length, validSuggestions)
      
      suggestions = validSuggestions
      
    } catch (parseError) {
      console.error('❌ Spelling Check API - Failed to parse AI response:', parseError, 'Response:', aiResponse)
      suggestions = []
    }

    console.log('📤 Spelling Check API - Final response:', { suggestions })
    return NextResponse.json({ suggestions })

  } catch (error) {
    console.error('❌ Spelling Check API error:', error)
    
    // Return empty suggestions on error (as requested)
    return NextResponse.json({ suggestions: [] })
  }
} 