import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Constants for configuration
const MIN_TEXT_LENGTH = 50
const MAX_TOKENS = 1500 // Significantly increased for comprehensive character analysis
const TEMPERATURE = 0.3 // Lower temperature for more consistent analysis

// System prompt for character analysis
const CHARACTER_ANALYST_SYSTEM_PROMPT = `You are a literary analyst specializing in character detection and analysis. Your task is to identify and analyze characters in the provided text.

CRITICAL: You MUST respond with ONLY valid JSON array - no additional text, no markdown formatting, just pure JSON array.

Focus on:
- Character names and aliases
- Character roles and importance
- Character relationships and interactions
- Character development and arcs
- Character motivations and conflicts
- Physical appearance and characteristics
- Character type/classification

Guidelines:
- Return a JSON array of character objects
- Each character should have: name, mentions (count), role, description, type
- Role categories: "Main Character", "Supporting Character", "Minor Character"
- Type categories: "Human", "Animal", "Magical", "Robot", "Alien", "Ghost", "Royal", "Warrior", "Guard", "Lover", "Hero", "Wizard", "Divine", "Nature", "Fairy", "Insect", "Aquatic", "Avian", "Other"
- Provide extremely brief character descriptions (maximum 3 sentences)
- First sentence: Physical appearance and basic characteristics
- Second sentence: Role and importance in story
- Third sentence: Key motivation or conflict
- Use **bold** for character names in descriptions
- Use *italic* for emphasis and literary terms
- Format example: "**John Smith** has *brown hair* and *blue eyes*. He is the *protagonist* who drives the story forward. His main motivation is *finding the truth*."

Return format (ONLY this JSON array, nothing else):
[
  {
    "name": "Character Name",
    "mentions": 5,
    "role": "Main Character",
    "description": "**John Smith** has *brown hair* and *blue eyes*. He is the *protagonist* who drives the story forward. His main motivation is *finding the truth*.",
    "type": "Human"
  }
]

DO NOT include any text before or after the JSON array. DO NOT use markdown code blocks. DO NOT add explanations. Return ONLY the JSON array.`

// Error messages
const ERROR_MESSAGES = {
  INVALID_TEXT: "Invalid text provided. Please provide a valid string.",
  TEXT_TOO_SHORT: `Text too short for analysis. Minimum ${MIN_TEXT_LENGTH} characters required.`,
  API_KEY_MISSING: "OpenAI API key not configured. Please check your environment variables.",
  RATE_LIMIT: "Rate limit exceeded. Please try again later.",
  INVALID_API_KEY: "Invalid API key. Please check your OpenAI configuration.",
  UNEXPECTED_ERROR: "An unexpected error occurred while analyzing characters. Please try again.",
  API_ERROR: "Failed to analyze characters. Please try again."
} as const

// Helper function to estimate token usage
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

// Helper function to optimize input text
function optimizeInputText(text: string, maxTokens: number = 7500): string {
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
  console.error("OpenAI API error:", error)
  
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

// Helper function to parse and validate JSON response
function parseCharacterResponse(response: string): any[] {
  try {
    // Clean the response to ensure it's valid JSON
    const cleanedResponse = response.trim()
    const jsonStart = cleanedResponse.indexOf('[')
    const jsonEnd = cleanedResponse.lastIndexOf(']') + 1
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("Invalid JSON format")
    }
    
    const jsonString = cleanedResponse.substring(jsonStart, jsonEnd)
    const characters = JSON.parse(jsonString)
    
    // Validate that it's an array
    if (!Array.isArray(characters)) {
      throw new Error("Response is not an array")
    }
    
    // Validate each character object
    return characters.filter(char => 
      char && 
      typeof char.name === 'string' && 
      typeof char.mentions === 'number' &&
      typeof char.role === 'string' &&
      typeof char.description === 'string' &&
      typeof char.type === 'string'
    )
  } catch (error) {
    console.error("JSON parsing error:", error)
    return []
  }
}

export async function POST(request: NextRequest) {
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
      console.error("Character analysis - Request body parsing error:", parseError)
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
      console.error("Character analysis - Invalid text parameter:", text)
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_TEXT },
        { status: 400 }
      )
    }

    if (text.length < MIN_TEXT_LENGTH) {
      console.error("Character analysis - Text too short:", text.length, "characters")
      return NextResponse.json(
        { error: ERROR_MESSAGES.TEXT_TOO_SHORT },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error("Character analysis - OpenAI API key not configured")
      return NextResponse.json(
        { error: ERROR_MESSAGES.API_KEY_MISSING },
        { status: 500 }
      )
    }

    // Optimize input text to prevent token limit issues
    const optimizedText = optimizeInputText(text)
    
    // Generate character analysis using OpenAI
    console.log("Character analysis - Calling OpenAI API...")
    const { text: response } = await generateText({
      model: openai("gpt-4o-mini"),
      system: CHARACTER_ANALYST_SYSTEM_PROMPT,
      prompt: `Please analyze the characters in this text and return a JSON array of character objects: "${optimizedText}"`,
      maxTokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    })

    console.log("Character analysis - OpenAI Response received")
    console.log("Character analysis - Response length:", response?.length || 0)

    // Validate response
    if (!response || response.trim().length === 0) {
      console.error("Character analysis - Empty response from OpenAI")
      return NextResponse.json(
        { error: "Generated analysis is empty. Please try again." },
        { status: 500 }
      )
    }

    // Parse the JSON response
    const characters = parseCharacterResponse(response)

    console.log("Character analysis - Returning successful response")
    return NextResponse.json({ 
      characters,
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
    console.error("Character analysis error:", error)
    return NextResponse.json(
      { error: ERROR_MESSAGES.API_ERROR },
      { status: 500 }
    )
  }
} 