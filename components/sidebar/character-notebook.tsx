"use client"

import { useMemo } from "react"
import { User, Users } from "lucide-react"

interface CharacterNotebookProps {
  content: string
}

export function CharacterNotebook({ content }: CharacterNotebookProps) {
  const characters = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, "").trim()

    // Extract potential character names (capitalized words that appear multiple times)
    const words = text.split(/\s+/)
    const capitalizedWords = words.filter(
      (word) =>
        /^[A-Z][a-z]+$/.test(word) &&
        word.length > 2 &&
        ![
          "The",
          "This",
          "That",
          "They",
          "Then",
          "There",
          "These",
          "Those",
          "When",
          "Where",
          "What",
          "Who",
          "Why",
          "How",
        ].includes(word),
    )

    // Count occurrences
    const wordCounts: Record<string, number> = {}
    capitalizedWords.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    })

    // Filter to get likely character names (appear more than once)
    const likelyCharacters = Object.entries(wordCounts)
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10) // Limit to top 10
      .map(([name, count]) => ({ name, mentions: count }))

    return likelyCharacters
  }, [content])

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Character Notebook</h3>
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{characters.length} characters detected</span>
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No characters detected yet.</p>
          <p className="text-xs text-gray-500 mt-1">Characters will appear as you write.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {characters.map((character, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">{character.name}</h4>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {character.mentions} mentions
                </span>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>• First appearance: Early in text</p>
                <p>• Role: {character.mentions > 5 ? "Main character" : "Supporting character"}</p>
              </div>

              {/* Placeholder for future character details */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic">
                  Character details will be analyzed as the story develops...
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
