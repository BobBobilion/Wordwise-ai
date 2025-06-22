import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface StyleCheckRequest {
  text: string
}

interface StyleSuggestion {
  text: string
  suggestion: string
  start: number
  end: number
  type: "style"
  description?: string
}

interface StyleCheckResponse {
  suggestions: StyleSuggestion[]
}

export async function POST(request: NextRequest) {
  console.log("Style check API called")
  
  try {
    const { text }: StyleCheckRequest = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ suggestions: [] })
    }

    const { text: aiResponse } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are a writing style expert. Analyze the provided text and identify ONLY significant style improvements.

For each significant style issue found, respond in this exact JSON format:
{
  "text": "the problematic text",
  "suggestion": "the improved text, without any extra phrases",
  "start": position_in_text,
  "end": end_position_in_text,
  "type": "style",
  "description": "brief explanation of the style improvement"
}

Rules:
- The 'suggestion' field MUST contain only the replacement text. It should NOT include instructional phrases like "Transform this into:".
- The 'description' field SHOULD use suggestive language (e.g., "Rephrase to...", "Consider changing...").
- Only return a valid JSON array of suggestion objects.
- Focus ONLY on significant style improvements, NOT grammar or spelling.
- Only suggest changes for sentences that REALLY need improvement. Avoid minor tweaks.
- Look for: wordiness, passive voice, repetitive phrases, unclear sentences, weak verbs.
- Provide ONE improved suggestion per significant issue.
- Be very selective - only 1-3 suggestions per 500 words maximum.
- If no significant style issues found, return an empty array [].

Respond with ONLY the JSON array, no other text.`,
      prompt: `Analyze this text for significant style improvements: "${text}"`,
      maxTokens: 5000,
      temperature: 0.1,
    })

    // Parse AI response
    let suggestions: StyleSuggestion[] = []
    try {
      const parsed = JSON.parse(aiResponse)
      if (Array.isArray(parsed)) {
        suggestions = parsed
      } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions
      }
    } catch (parseError) {
      console.error('Failed to parse style check response:', parseError)
      console.log('Raw AI response:', aiResponse)
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Style check API error:', error)
    return NextResponse.json({ suggestions: [] }, { status: 500 })
  }
} 