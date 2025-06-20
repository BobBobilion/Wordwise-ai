import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Constants for configuration
const MIN_TEXT_LENGTH = 100
const MAX_TOKENS = 5000 // Significantly increased for comprehensive JSON response
const TEMPERATURE = 0.3 // Lower temperature for more consistent analysis

// System prompt for consistent literary analysis with JSON structure
const LITERARY_ANALYST_SYSTEM_PROMPT = `You are a literary analyst specializing in plot analysis and story structure. Your task is to create concise plot summaries and actionable insights that help writers understand their narrative.

CRITICAL: You MUST respond with ONLY valid JSON in this EXACT format - no additional text, no markdown formatting, just pure JSON:
{
  "plotSummary": [
    {
      "point": "bullet point 1",
      "tension": 25
    },
    {
      "point": "bullet point 2", 
      "tension": 45
    },
    {
      "point": "bullet point 3",
      "tension": 85
    }
  ],
  "actionableInsights": [
    "insight 1",
    "insight 2", 
    "insight 3"
  ]
}

DO NOT include any text before or after the JSON. DO NOT use markdown code blocks. DO NOT add explanations. Return ONLY the JSON object.

Plot Summary Guidelines:
- Focus on main plot points and story progression
- Key events and turning points
- Character motivations and conflicts
- Overall narrative arc and themes
- Keep each bullet point as ONE FULL SENTENCE (not too short, not too long)
- Aim for 5-20 bullet points depending on text length
- Use **bold** for key themes, character names, and important concepts
- Use *italic* for emphasis and literary terms
- Provide high-level overview, not extreme details
- Format example: "**John** discovers a *hidden truth* that changes his entire perspective on the conflict."

Tension Score Guidelines:
- Assign a tension score (0-100) to each plot point
- 0 = No tension (calm, exposition, resolution)
- 25 = Low tension (character development, setup)
- 50 = Medium tension (conflicts begin, complications)
- 75 = High tension (climax approaches, major conflicts)
- 100 = Maximum tension (climax, peak conflict)
- Consider the emotional intensity and narrative stakes of each point
- Tension should generally build throughout the story with peaks at key moments

Actionable Insights Guidelines:
- Provide specific writing advice and suggestions
- Focus on story structure improvements
- Suggest character development opportunities
- Identify potential plot holes or inconsistencies
- Recommend pacing adjustments
- Highlight strengths and areas for improvement
- Keep insights concise but actionable
- Use **bold** for key recommendations
- Use *italic* for literary concepts

Examples of good plot points with tension scores:
• {"point": "**John** discovers a *hidden truth* that changes his entire perspective on the conflict.", "tension": 65}
• {"point": "**Conflict** escalates between *rivals* as they compete for the same goal.", "tension": 80}
• {"point": "**Revelation** about the past changes *everything* for the protagonist.", "tension": 90}
• {"point": "**Character** makes a *difficult choice* that affects the entire story.", "tension": 75}

Examples of good insights:
• **Consider** adding *backstory* for **protagonist**
• **Develop** *tension* between **rival characters**
• **Clarify** the *stakes* of the **conflict**
• **Balance** *pacing* with **character moments**

REMEMBER: Return ONLY valid JSON, nothing else.`

// Error messages
const ERROR_MESSAGES = {
  INVALID_TEXT: "Invalid text provided. Please provide a valid string.",
  TEXT_TOO_SHORT: `Text too short for analysis. Minimum ${MIN_TEXT_LENGTH} characters required.`,
  API_KEY_MISSING: "OpenAI API key not configured. Please check your environment variables.",
  RATE_LIMIT: "Rate limit exceeded. Please try again later.",
  INVALID_API_KEY: "Invalid API key. Please check your OpenAI configuration.",
  UNEXPECTED_ERROR: "An unexpected error occurred while generating plot summary. Please try again.",
  API_ERROR: "Failed to generate plot summary. Please try again."
} as const

// Helper function to estimate token usage
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

// Helper function to optimize input text
function optimizeInputText(text: string, maxTokens: number = 10000): string {
  const estimatedTokens = estimateTokens(text)
  
  if (estimatedTokens > maxTokens) {
    // Truncate to reasonable length while preserving context
    const truncatedLength = maxTokens * 4
    return text.substring(0, truncatedLength) + "..."
  }
  
  return text
}

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
  console.log("Plot summary API called")
  
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

    const { text } = body

    // Input validation
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_TEXT },
        { status: 400 }
      )
    }

    if (text.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.TEXT_TOO_SHORT },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.API_KEY_MISSING },
        { status: 500 }
      )
    }

    // Optimize input text to prevent token limit issues
    const optimizedText = optimizeInputText(text)
    
    // Generate plot summary using OpenAI
    const { text: responseText } = await generateText({
      model: openai("gpt-4o-mini"),
      system: LITERARY_ANALYST_SYSTEM_PROMPT,
      prompt: `Please provide a plot summary and actionable insights for this text in JSON format: "${optimizedText}"`,
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
    let parsedResponse: { plotSummary: { point: string; tension: number }[]; actionableInsights: string[] }
    try {
      // Clean the response text to ensure it's valid JSON
      const cleanedText = responseText.trim()
      
      // Remove any markdown code blocks if present
      const jsonText = cleanedText.replace(/```json\s*|\s*```/g, '')
      
      parsedResponse = JSON.parse(jsonText)
      
      // Validate the parsed structure
      if (!parsedResponse.plotSummary || !parsedResponse.actionableInsights) {
        throw new Error("Invalid response structure - missing plotSummary or actionableInsights")
      }
      
      if (!Array.isArray(parsedResponse.plotSummary) || !Array.isArray(parsedResponse.actionableInsights)) {
        throw new Error("Invalid response structure - plotSummary and actionableInsights must be arrays")
      }

      // Validate array contents
      if (parsedResponse.plotSummary.length === 0 && parsedResponse.actionableInsights.length === 0) {
        throw new Error("Response contains empty arrays")
      }

      // Validate plotSummary structure
      for (const item of parsedResponse.plotSummary) {
        if (!item.point || typeof item.point !== 'string') {
          throw new Error("Invalid plotSummary item - missing or invalid point")
        }
        if (typeof item.tension !== 'number' || item.tension < 0 || item.tension > 100) {
          throw new Error("Invalid plotSummary item - tension must be a number between 0 and 100")
        }
      }

    } catch (parseError) {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      plotSummary: parsedResponse.plotSummary,
      actionableInsights: parsedResponse.actionableInsights,
      metadata: {
        inputLength: text.length,
        optimizedLength: optimizedText.length,
        estimatedTokens: estimateTokens(optimizedText),
        model: "gpt-4o-mini"
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
