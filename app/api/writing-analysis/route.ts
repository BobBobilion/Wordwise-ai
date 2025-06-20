import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        mood: ["neutral"], 
        genre: "General Fiction" 
      })
    }

    const { text: analysis } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are a literary analysis expert. Analyze the provided text and return ONLY a JSON object with this exact structure:
{
  "mood": ["mood1", "mood2"],
  "genre": "Genre Name"
}

For mood, choose 1-3 moods from: happy, sad, angry, mysterious, romantic, adventurous, tense, melancholic, hopeful, dark, peaceful, exciting, nostalgic, neutral.

For genre, choose from: Fantasy, Mystery, Romance, Science Fiction, Horror, Adventure, Thriller, Drama, Comedy, Historical Fiction, Literary Fiction, Young Adult, Children's, General Fiction, Non-Fiction, Biography, Autobiography, Memoir, Academic Paper, Research Paper, Essay, Technical Writing, Self-Help, Business, Travel, Health & Wellness, Politics, Philosophy, Religion & Spirituality, Science & Nature, History, True Crime.

Return ONLY the JSON object, no other text.`,
      prompt: `Analyze this text for mood and genre: "${text}"`,
      maxTokens: 100,
      temperature: 0.3,
    })

    try {
      const parsed = JSON.parse(analysis)
      return NextResponse.json({
        mood: Array.isArray(parsed.mood) ? parsed.mood : [parsed.mood || "neutral"],
        genre: parsed.genre || "General Fiction"
      })
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return NextResponse.json({ 
        mood: ["neutral"], 
        genre: "General Fiction" 
      })
    }
  } catch (error) {
    console.error("Writing analysis error:", error)
    return NextResponse.json({ 
      mood: ["neutral"], 
      genre: "General Fiction" 
    }, { status: 500 })
  }
} 