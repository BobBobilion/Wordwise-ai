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
  try {
    const { text }: GrammarCheckRequest = await request.json()
    console.log('🔍 Grammar Check API - Received text:', text?.length, 'characters')

    if (!text || !text.trim()) {
      console.log('❌ Grammar Check API - No text provided')
      return NextResponse.json({ suggestions: [] })
    }

    console.log('📤 Grammar Check API - Sending to AI:')
    console.log('📋 Raw text being sent:', JSON.stringify(text))
    console.log('📋 Length:', text.length, 'characters')

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

    console.log('📥 Grammar Check API - AI Response:', aiResponse)

    // Parse AI response
    let suggestions: GrammarSuggestion[] = []
    
    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        console.log('✅ Grammar Check API - Found JSON match:', jsonMatch[0])
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        // Try parsing the entire response as JSON
        console.log('🔄 Grammar Check API - Trying to parse full response as JSON')
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
      
      console.log('🔍 Grammar Check API - Raw suggestions:', suggestions.length, suggestions)
      console.log('✅ Grammar Check API - Valid suggestions:', validSuggestions.length, validSuggestions)
      
      suggestions = validSuggestions
      
    } catch (parseError) {
      console.error('❌ Grammar Check API - Failed to parse AI response:', parseError, 'Response:', aiResponse)
      suggestions = []
    }

    console.log('📤 Grammar Check API - Final response:', { suggestions })
    return NextResponse.json({ suggestions })

  } catch (error) {
    console.error('❌ Grammar Check API error:', error)
    
    // Return empty suggestions on error (as requested)
    return NextResponse.json({ suggestions: [] })
  }
} 