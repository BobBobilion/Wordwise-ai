import { type NextRequest, NextResponse } from "next/server"

// Constants for configuration
const MIN_DESCRIPTION_LENGTH = 10
const MAX_PROMPT_LENGTH = 500

// Error messages
const ERROR_MESSAGES = {
  INVALID_CHARACTER: "Invalid character data provided. Please provide valid character information.",
  DESCRIPTION_TOO_SHORT: `Description too short for image generation. Minimum ${MIN_DESCRIPTION_LENGTH} characters required.`,
  API_KEY_MISSING: "OpenAI API key not configured. Please check your environment variables.",
  RATE_LIMIT: "Rate limit exceeded. Please try again later.",
  INVALID_API_KEY: "Invalid API key. Please check your OpenAI configuration.",
  UNEXPECTED_ERROR: "An unexpected error occurred while generating character image. Please try again.",
  API_ERROR: "Failed to generate character image. Please try again."
} as const

// Helper function to clean character description for image generation
function cleanCharacterDescription(description: string): string {
  // Remove markdown formatting but keep the content
  const cleanDescription = description
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove code
  
  return cleanDescription.trim()
}

// Helper function to create image generation prompt
function createImagePrompt(characterName: string, characterDescription: string): string {
  const basePrompt = `A Character representation of ${characterName}, ${characterDescription}, high resolution, realistic, realism, real life, detailed facial features, natural skin texture, clean background, 8K quality, cinematic lighting, realistic image, include all mentioned physical features`
  
  // Limit prompt length
  if (basePrompt.length > MAX_PROMPT_LENGTH) {
    return basePrompt.substring(0, MAX_PROMPT_LENGTH - 3) + "..."
  }
  
  return basePrompt
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
  console.log("Character image API called")
  
  try {
    // Parse and validate request body
    const body = await request.json()
    const { characterName, characterDescription } = body

    // Input validation - now expecting characterDescription from analysis
    if (!characterDescription || typeof characterDescription !== "string") {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_CHARACTER },
        { status: 400 }
      )
    }

    if (characterDescription.length < MIN_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.DESCRIPTION_TOO_SHORT },
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

    // Clean the character description for image generation
    const cleanedDescription = cleanCharacterDescription(characterDescription)
    const imagePrompt = createImagePrompt(characterName || "Character", cleanedDescription)
    
    // Generate image using OpenAI DALL-E
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural"
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle specific OpenAI API errors
      if (data.error) {
        const { status, message } = handleOpenAIError(data.error)
        return NextResponse.json({ error: message }, { status })
      }
      
      throw new Error(data.error?.message || "Failed to generate image")
    }

    // Validate response
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return NextResponse.json(
        { error: "Generated image data is invalid. Please try again." },
        { status: 500 }
      )
    }

    const imageUrl = data.data[0].url

    return NextResponse.json({ 
      imageUrl,
      prompt: imagePrompt,
      metadata: {
        characterName: characterName || "Character",
        physicalDescription: cleanedDescription,
        model: "dall-e-3",
        size: "256x256"
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