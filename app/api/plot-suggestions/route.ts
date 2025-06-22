import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Constants for configuration
const MAX_TOKENS = 2000
const TEMPERATURE = 0.7 // Slightly higher for creative suggestions

// System prompt for plot suggestions
const PLOT_SUGGESTIONS_SYSTEM_PROMPT = `You are a creative writing assistant specializing in plot development. Your task is to generate 3 immediate plot continuation suggestions based on the current story progression.

CRITICAL: You MUST respond with ONLY valid JSON in this EXACT format - no additional text, no markdown formatting, just pure JSON:
{
  "suggestions": [
    "suggestion 1",
    "suggestion 2", 
    "suggestion 3"
  ]
}

DO NOT include any text before or after the JSON. DO NOT use markdown code blocks. DO NOT add explanations. Return ONLY the JSON object.

Plot Suggestion Guidelines:
- Focus on IMMEDIATE next steps (next few scenes, not chapters)
- Each suggestion should be 1-2 sentences maximum
- Make suggestions specific and actionable
- Consider the current tension level and story momentum
- Provide variety in tone and direction
- Use **bold** for key elements and character names
- Use *italic* for emphasis and literary terms
- Keep suggestions high-level but specific enough to be useful
- Avoid suggestions that would require major story restructuring

Examples of good suggestions:
• "**Sarah** confronts **Michael** about the *hidden letter*, leading to an emotional confrontation in the garden."
• "**Detective** discovers a *crucial piece of evidence* that contradicts the main suspect's alibi."
• "**Protagonist** makes a *split-second decision* that changes the course of the entire mission."

REMEMBER: Return ONLY valid JSON, nothing else.`

// Error messages
const ERROR_MESSAGES = {
  INVALID_PLOT_POINTS: "Invalid plot points provided. Please provide a valid array of plot points.",
  PLOT_POINTS_TOO_SHORT: "Not enough plot points for analysis. At least 2 plot points required.",
  API_KEY_MISSING: "OpenAI API key not configured. Please check your environment variables.",
  RATE_LIMIT: "Rate limit exceeded. Please try again later.",
  INVALID_API_KEY: "Invalid API key. Please check your OpenAI configuration.",
  UNEXPECTED_ERROR: "An unexpected error occurred while generating plot suggestions. Please try again.",
  API_ERROR: "Failed to generate plot suggestions. Please try again."
} as const

// Helper function to handle OpenAI API errors
function handleOpenAIError(error: any): { status: number; message: string } {
  if (error.status === 429) {
    return { status: 429, message: ERROR_MESSAGES.RATE_LIMIT }
  }
  
  if (error.status === 401) {
    return { status: 401, message: ERROR_MESSAGES.INVALID_API_KEY }
  }
  
  if (error.status === 400) {
    return { status: 400, message: "Invalid request to OpenAI API. Please check your input." }
  }
  
  return { status: 500, message: ERROR_MESSAGES.UNEXPECTED_ERROR }
}

export async function POST(request: NextRequest) {
  console.log("Plot suggestions API called")
  
  try {
    // Validate request method
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: "Method not allowed. Use POST." },
        { status: 405 }
      )
    }

    // Validate content type
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      )
    }

    // Parse and validate request body
    let body: any
    try {
      const bodyText = await request.text()
      
      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          { error: "Request body is empty" },
          { status: 400 }
        )
      }
      
      body = JSON.parse(bodyText)
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    // Validate body structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Request body must be an object" },
        { status: 400 }
      )
    }

    const { plotPoints, selectedSuggestions, existingSuggestions } = body

    // Input validation
    if (!plotPoints || !Array.isArray(plotPoints)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_PLOT_POINTS },
        { status: 400 }
      )
    }

    if (plotPoints.length < 2) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.PLOT_POINTS_TOO_SHORT },
        { status: 400 }
      )
    }

    // Validate plot points structure
    for (const point of plotPoints) {
      if (!point.point || typeof point.point !== 'string') {
        return NextResponse.json(
          { error: "Invalid plot point structure" },
          { status: 400 }
        )
      }
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.API_KEY_MISSING },
        { status: 500 }
      )
    }

    // Determine if this is a partial regeneration
    const isPartialRegeneration = selectedSuggestions && Array.isArray(selectedSuggestions) && existingSuggestions && Array.isArray(existingSuggestions)
    
    let finalSuggestions: string[] = []
    let newSuggestionsCount = 3

    if (isPartialRegeneration) {
      // Validate selected suggestions
      if (selectedSuggestions.length >= 3) {
        return NextResponse.json(
          { error: "Cannot regenerate when all suggestions are selected" },
          { status: 400 }
        )
      }

      // Validate existing suggestions
      if (existingSuggestions.length !== 3) {
        return NextResponse.json(
          { error: "Invalid existing suggestions array" },
          { status: 400 }
        )
      }

      // Create final suggestions array with selected ones in their positions
      finalSuggestions = [...existingSuggestions]
      newSuggestionsCount = 3 - selectedSuggestions.length

      // Mark positions that need new suggestions
      const positionsToRegenerate: number[] = []
      for (let i = 0; i < 3; i++) {
        if (!selectedSuggestions.includes(i)) {
          positionsToRegenerate.push(i)
        }
      }

      // Prepare context for AI including selected suggestions
      const selectedSuggestionsText = selectedSuggestions
        .map(index => `${index + 1}. ${existingSuggestions[index]}`)
        .join('\n')

      // Prepare plot points for the prompt
      const plotPointsText = plotPoints.map((point, index) => 
        `${index + 1}. ${point.point}`
      ).join('\n')
      
      // Generate new suggestions using OpenAI
      const { text: responseText } = await generateText({
        model: openai("gpt-4o-mini"),
        system: PLOT_SUGGESTIONS_SYSTEM_PROMPT,
        prompt: `Based on these plot points, generate ${newSuggestionsCount} immediate plot continuation suggestions that follow similar plot story patterns to the selected suggestions below. Focus on similar narrative developments, character actions, and story progression rather than writing style.\n\nPlot Points:\n${plotPointsText}\n\nSelected Suggestions (generate similar plot developments to these):\n${selectedSuggestionsText}\n\nGenerate ${newSuggestionsCount} new suggestions that follow similar plot story patterns to the selected ones above:`,
        maxTokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      })

      // Validate response
      if (!responseText || responseText.trim().length === 0) {
        return NextResponse.json(
          { error: "Generated response is empty. Please try again." },
          { status: 500 }
        )
      }

      // Parse JSON response
      let parsedResponse: { suggestions: string[] }
      try {
        const cleanedText = responseText.trim()
        const jsonText = cleanedText.replace(/```json\s*|\s*```/g, '')
        parsedResponse = JSON.parse(jsonText)
        
        if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
          throw new Error("Invalid response structure")
        }

        if (parsedResponse.suggestions.length !== newSuggestionsCount) {
          throw new Error(`Expected ${newSuggestionsCount} suggestions, got ${parsedResponse.suggestions.length}`)
        }

        // Validate suggestion structure
        for (const suggestion of parsedResponse.suggestions) {
          if (!suggestion || typeof suggestion !== 'string') {
            throw new Error("Invalid suggestion - must be a non-empty string")
          }
        }

        // Insert new suggestions into their correct positions
        let newSuggestionIndex = 0
        for (const position of positionsToRegenerate) {
          finalSuggestions[position] = parsedResponse.suggestions[newSuggestionIndex]
          newSuggestionIndex++
        }

      } catch (parseError) {
        return NextResponse.json(
          { error: "Failed to parse AI response. Please try again." },
          { status: 500 }
        )
      }

    } else {
      // Full regeneration - original logic
      const plotPointsText = plotPoints.map((point, index) => 
        `${index + 1}. ${point.point}`
      ).join('\n')
      
      const { text: responseText } = await generateText({
        model: openai("gpt-4o-mini"),
        system: PLOT_SUGGESTIONS_SYSTEM_PROMPT,
        prompt: `Based on these plot points, generate 3 immediate plot continuation suggestions:\n\n${plotPointsText}`,
        maxTokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      })

      if (!responseText || responseText.trim().length === 0) {
        return NextResponse.json(
          { error: "Generated response is empty. Please try again." },
          { status: 500 }
        )
      }

      let parsedResponse: { suggestions: string[] }
      try {
        const cleanedText = responseText.trim()
        const jsonText = cleanedText.replace(/```json\s*|\s*```/g, '')
        parsedResponse = JSON.parse(jsonText)
        
        if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
          throw new Error("Invalid response structure - missing suggestions")
        }

        if (parsedResponse.suggestions.length === 0) {
          throw new Error("Response contains empty suggestions array")
        }

        if (parsedResponse.suggestions.length !== 3) {
          throw new Error("Response must contain exactly 3 suggestions")
        }

        for (const suggestion of parsedResponse.suggestions) {
          if (!suggestion || typeof suggestion !== 'string') {
            throw new Error("Invalid suggestion - must be a non-empty string")
          }
        }

        finalSuggestions = parsedResponse.suggestions

      } catch (parseError) {
        return NextResponse.json(
          { error: "Failed to parse AI response. Please try again." },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ 
      suggestions: finalSuggestions,
      metadata: {
        inputPlotPoints: plotPoints.length,
        model: "gpt-4o-mini",
        isPartialRegeneration: isPartialRegeneration,
        preservedCount: isPartialRegeneration ? selectedSuggestions.length : 0
      }
    })

  } catch (error: any) {
    // Handle specific OpenAI API errors
    if (error.name === 'OpenAIError' || error.status) {
      const { status, message } = handleOpenAIError(error)
      return NextResponse.json({ error: message }, { status })
    }

    // Handle general errors
    return NextResponse.json(
      { error: ERROR_MESSAGES.API_ERROR },
      { status: 500 }
    )
  }
} 