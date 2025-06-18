"use client"

import { useMemo } from "react"
import { BookOpen, Hash, Palette, TrendingUp } from "lucide-react"

interface WritingOverviewProps {
  content: string
}

export function WritingOverview({ content }: WritingOverviewProps) {
  const analysis = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, "").trim()
    const words = text.split(/\s+/).filter((word) => word.length > 0)
    const wordCount = words.length

    // Simple mood analysis based on keywords
    const moodKeywords = {
      happy: ["happy", "joy", "excited", "wonderful", "amazing", "great", "fantastic", "love", "smile", "laugh"],
      sad: ["sad", "cry", "tears", "sorrow", "grief", "depressed", "lonely", "hurt", "pain", "loss"],
      angry: ["angry", "mad", "furious", "rage", "hate", "annoyed", "frustrated", "irritated"],
      mysterious: ["mystery", "secret", "hidden", "unknown", "strange", "mysterious", "dark", "shadow"],
      romantic: ["love", "romance", "heart", "kiss", "passion", "romantic", "beautiful", "together"],
      adventurous: ["adventure", "journey", "quest", "explore", "discover", "travel", "exciting"],
    }

    const detectedMoods: string[] = []
    const lowerText = text.toLowerCase()

    Object.entries(moodKeywords).forEach(([mood, keywords]) => {
      const matches = keywords.filter((keyword) => lowerText.includes(keyword))
      if (matches.length > 0) {
        detectedMoods.push(mood)
      }
    })

    // Simple genre detection
    const genreKeywords = {
      fantasy: ["magic", "wizard", "dragon", "spell", "kingdom", "quest", "sword", "castle"],
      mystery: ["detective", "murder", "clue", "investigate", "suspect", "crime", "mystery"],
      romance: ["love", "heart", "kiss", "relationship", "wedding", "romantic", "passion"],
      scifi: ["space", "robot", "alien", "future", "technology", "spaceship", "planet"],
      horror: ["ghost", "monster", "scary", "fear", "nightmare", "haunted", "terror"],
      adventure: ["journey", "explore", "treasure", "map", "adventure", "quest", "travel"],
    }

    let detectedGenre = "General Fiction"
    let maxMatches = 0

    Object.entries(genreKeywords).forEach(([genre, keywords]) => {
      const matches = keywords.filter((keyword) => lowerText.includes(keyword)).length
      if (matches > maxMatches) {
        maxMatches = matches
        detectedGenre = genre.charAt(0).toUpperCase() + genre.slice(1)
      }
    })

    return {
      wordCount,
      moods: detectedMoods.length > 0 ? detectedMoods : ["neutral"],
      genre: detectedGenre,
    }
  }, [content])

  const getMoodColor = (mood: string) => {
    const colors: Record<string, string> = {
      happy: "bg-yellow-100 text-yellow-800",
      sad: "bg-blue-100 text-blue-800",
      angry: "bg-red-100 text-red-800",
      mysterious: "bg-purple-100 text-purple-800",
      romantic: "bg-pink-100 text-pink-800",
      adventurous: "bg-green-100 text-green-800",
      neutral: "bg-gray-100 text-gray-800",
    }
    return colors[mood] || colors.neutral
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Writing Overview</h3>
      </div>

      {/* Word Count */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Hash className="h-5 w-5 text-gray-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Word Count</p>
            <p className="text-2xl font-bold text-blue-600">{analysis.wordCount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Mood Tokens */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Palette className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Detected Mood</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis.moods.map((mood, index) => (
            <span key={index} className={`px-3 py-1 rounded-full text-xs font-medium ${getMoodColor(mood)}`}>
              {mood.charAt(0).toUpperCase() + mood.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Genre */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Perceived Genre</h4>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3">
          <span className="text-indigo-800 font-medium">{analysis.genre}</span>
        </div>
      </div>

      {/* Reading Time Estimate */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Reading Time</h4>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <span className="text-green-800 font-medium">~{Math.ceil(analysis.wordCount / 200)} min read</span>
        </div>
      </div>
    </div>
  )
}
