import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text provided" }, { status: 400 })
    }

    if (text.length < 100) {
      return NextResponse.json({ error: "Text too short for summary" }, { status: 400 })
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const { text: summary } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are a literary analyst. Create a concise plot summary of the provided text in bullet point format. Focus on:
- Main plot points and story progression
- Key events and turning points
- Character motivations and conflicts
- Overall narrative arc

Format your response as bullet points using • symbols. Keep each bullet point concise (1-2 sentences max). If the text appears incomplete, note what has happened so far.`,
      prompt: `Please provide a bullet-point plot summary for this text: "${text}"`,
    })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Plot summary error:", error)
    return NextResponse.json({ error: "Failed to generate plot summary" }, { status: 500 })
  }
}
