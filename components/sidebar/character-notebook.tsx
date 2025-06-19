"use client"

import { useState, useEffect, useRef } from "react"
import { User, Users, Loader2, RefreshCw, AlertCircle, Info, Image, Download, Dog, Cat, Sparkles, Zap, Rocket, Ghost, Crown, Sword, Shield, Heart, Star, Moon, Sun, Cloud, Trees, Flower, Bug, Fish, Bird } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface CharacterNotebookProps {
  content: string
}

interface Character {
  name: string
  mentions: number
  role: string
  description: string
  type: string
}

interface CharacterAnalysisResponse {
  characters: Character[]
  metadata?: {
    inputLength: number
    optimizedLength: number
    estimatedTokens: number
    model: string
  }
}

interface CharacterAnalysisError {
  error: string
}

interface CharacterImageResponse {
  imageUrl: string
  prompt: string
  metadata: {
    characterName: string
    physicalDescription: string
    model: string
    size: string
  }
}

interface CharacterImageError {
  error: string
}

// Function to convert markdown to HTML safely
function markdownToHtml(text: string): string {
  return text
    // Convert **bold** to <strong> tags
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em> tags
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert `code` to <code> tags
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
    // Convert line breaks to <br> tags
    .replace(/\n/g, '<br>')
}

// Function to safely render HTML content
function createMarkup(htmlContent: string) {
  return { __html: htmlContent }
}

// Function to get appropriate icon based on AI-determined character type
function getCharacterIcon(characterType: string) {
  switch (characterType.toLowerCase()) {
    case 'animal':
      return Dog
    case 'magical':
      return Sparkles
    case 'robot':
      return Zap
    case 'alien':
      return Rocket
    case 'ghost':
    case 'spirit':
      return Ghost
    case 'royal':
    case 'noble':
    case 'king':
    case 'queen':
    case 'prince':
    case 'princess':
      return Crown
    case 'warrior':
    case 'knight':
    case 'soldier':
      return Sword
    case 'guard':
    case 'protector':
      return Shield
    case 'lover':
    case 'romantic':
      return Heart
    case 'hero':
    case 'champion':
      return Star
    case 'wizard':
    case 'witch':
    case 'mage':
      return Moon
    case 'divine':
    case 'angel':
    case 'deity':
      return Sun
    case 'nature':
    case 'druid':
    case 'ranger':
      return Trees
    case 'fairy':
    case 'sprite':
      return Flower
    case 'insect':
    case 'spider':
      return Bug
    case 'aquatic':
    case 'fish':
    case 'mermaid':
      return Fish
    case 'avian':
    case 'bird':
    case 'eagle':
      return Bird
    case 'other':
      return Cloud
    case 'human':
    default:
      return User
  }
}

export function CharacterNotebook({ content }: CharacterNotebookProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState("")
  const [metadata, setMetadata] = useState<CharacterAnalysisResponse['metadata'] | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [timeUntilNextUpdate, setTimeUntilNextUpdate] = useState<number>(0)
  
  // Image generation states
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({})
  const [characterImages, setCharacterImages] = useState<Record<string, CharacterImageResponse>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})
  
  // Full picture mode state
  const [expandedImage, setExpandedImage] = useState<{url: string, characterName: string} | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastContentRef = useRef<string>("")

  // Constants
  const UPDATE_INTERVAL = 300000 // 5 minutes in milliseconds
  const MIN_TEXT_LENGTH = 50
  const CONTENT_CHANGE_THRESHOLD = 20 // Only reset countdown if content changes by more than 20 characters

  const analyzeCharacters = async (forceUpdate: boolean = false) => {
    const text = content.replace(/<[^>]*>/g, "").trim()

    if (!text || text.length < MIN_TEXT_LENGTH) {
      setCharacters([])
      setError("")
      setMetadata(null)
      return
    }

    // Check if we should update
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTime
    
    // Calculate character difference from last analyzed content
    const characterDifference = Math.abs(text.length - lastAnalyzedContent.length)
    const contentChanged = text !== lastAnalyzedContent
    
    if (!forceUpdate && !contentChanged) {
      return // Don't update if content hasn't changed
    }

    // Only reset countdown if content changed significantly or if forced update
    const shouldResetCountdown = forceUpdate || characterDifference > CONTENT_CHANGE_THRESHOLD
    
    if (!forceUpdate && timeSinceLastUpdate < UPDATE_INTERVAL && !shouldResetCountdown) {
      return // Don't update if not enough time has passed and change is minor
    }

    setLoading(true)
    setError("")
    setMetadata(null)
    
    try {
      const response = await fetch("/api/character-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      const data: CharacterAnalysisResponse | CharacterAnalysisError = await response.json()

      if (!response.ok) {
        // Handle API errors with specific messages
        const errorData = data as CharacterAnalysisError
        throw new Error(errorData.error || "Failed to analyze characters")
      }

      const successData = data as CharacterAnalysisResponse
      
      if (!successData.characters || !Array.isArray(successData.characters)) {
        throw new Error("Invalid character analysis response. Please try again.")
      }

      setCharacters(successData.characters)
      setMetadata(successData.metadata || null)
      setLastAnalyzedContent(text)
      
      // Only update last update time if we're resetting the countdown
      if (shouldResetCountdown) {
        setLastUpdateTime(now)
      }
      
      lastContentRef.current = text
    } catch (error) {
      console.error("Character analysis error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unable to analyze characters. Please try again."
      setError(errorMessage)
      setCharacters([])
      setMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  // Handle manual refresh
  const handleManualRefresh = () => {
    analyzeCharacters(true)
  }

  // Generate character image
  const generateCharacterImage = async (character: Character) => {
    if (generatingImages[character.name]) return

    setGeneratingImages(prev => ({ ...prev, [character.name]: true }))
    setImageErrors(prev => ({ ...prev, [character.name]: "" }))
    
    try {
      const response = await fetch("/api/character-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          characterName: character.name, 
          characterDescription: character.description 
        }),
      })

      const data: CharacterImageResponse | CharacterImageError = await response.json()

      if (!response.ok) {
        const errorData = data as CharacterImageError
        throw new Error(errorData.error || "Failed to generate character image")
      }

      const successData = data as CharacterImageResponse
      setCharacterImages(prev => ({ ...prev, [character.name]: successData }))
    } catch (error) {
      console.error("Character image generation error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unable to generate character image. Please try again."
      setImageErrors(prev => ({ ...prev, [character.name]: errorMessage }))
    } finally {
      setGeneratingImages(prev => ({ ...prev, [character.name]: false }))
    }
  }

  // Download character image
  const downloadCharacterImage = async (characterName: string, imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${characterName}-portrait.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  // Open full picture mode
  const openFullPicture = (imageUrl: string, characterName: string) => {
    setExpandedImage({ url: imageUrl, characterName })
  }

  // Close full picture mode
  const closeFullPicture = () => {
    setExpandedImage(null)
  }

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeFullPicture()
    }
  }

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTime
      const remaining = Math.max(0, UPDATE_INTERVAL - timeSinceLastUpdate)
      setTimeUntilNextUpdate(remaining)
    }

    // Update countdown every second
    intervalRef.current = setInterval(updateCountdown, 1000)
    updateCountdown() // Initial update

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [lastUpdateTime])

  // Initial analysis when component loads with content
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, "").trim()
    if (text.length >= MIN_TEXT_LENGTH && characters.length === 0 && !loading) {
      analyzeCharacters()
    }
  }, []) // Only run once on mount

  // Check for content changes and auto-update every 5 minutes
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, "").trim()
    
    // Only run analysis if we have enough content and haven't analyzed this content before
    if (text.length >= MIN_TEXT_LENGTH && text !== lastAnalyzedContent) {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTime
      
      // Only auto-update if 5 minutes have passed since last update
      if (timeSinceLastUpdate >= UPDATE_INTERVAL) {
        analyzeCharacters()
      }
    }
  }, [content, lastUpdateTime, lastAnalyzedContent])

  // Format countdown timer
  const formatCountdown = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      "Main Character": "bg-blue-100 text-blue-800",
      "Supporting Character": "bg-green-100 text-green-800",
      "Minor Character": "bg-gray-100 text-gray-800",
    }
    return colors[role] || colors["Minor Character"]
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Character Notebook</h3>
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Analysis
              </>
            )}
          </button>
          {!loading && characters.length > 0 && (
            <span className="text-xs text-gray-500">
              Next update in {formatCountdown(timeUntilNextUpdate)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mt-2">
          <Users className="h-4 w-4" />
          <span>{characters.length} characters detected</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Analyzing characters...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8">
          <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
          <div className="text-sm text-red-600 text-center">
            <p className="font-medium">Analysis Failed</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : characters.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No characters detected yet.</p>
          <p className="text-xs text-gray-500 mt-1">Characters will appear as you write.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto border-2 border-gray-300 rounded-lg bg-gray-50 p-3 shadow-inner">
          {characters.map((character, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const IconComponent = getCharacterIcon(character.type)
                      return <IconComponent className="h-4 w-4 text-blue-600" />
                    })()}
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h4 className="font-semibold text-lg text-gray-900 break-words leading-tight">{character.name}</h4>
                    <span className={`mt-0.5 text-xs px-2 py-1 rounded font-medium block w-fit ${getRoleColor(character.role)}`}>{character.role}</span>
                  </div>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded self-start ml-2">
                  {character.mentions} mentions
                </span>
              </div>

              <div className="text-xs text-gray-700 leading-relaxed prose prose-sm max-w-none mb-3">
                <div 
                  dangerouslySetInnerHTML={createMarkup(markdownToHtml(character.description))}
                />
              </div>

              {/* Character Image Section */}
              <div className="border-t border-gray-100 pt-3">
                {characterImages[character.name] ? (
                  <div className="space-y-2">
                    <div className="relative group">
                      <div className="w-full aspect-square rounded-lg border border-gray-200 overflow-hidden relative">
                        <img 
                          src={characterImages[character.name].imageUrl} 
                          alt={`Portrait of ${character.name}`}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity duration-200"
                          onClick={() => openFullPicture(characterImages[character.name].imageUrl, character.name)}
                        />
                        {/* Full Screen Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openFullPicture(characterImages[character.name].imageUrl, character.name)
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1.5 shadow-lg z-10"
                        >
                          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadCharacterImage(character.name, characterImages[character.name].imageUrl)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 italic">
                        AI-generated portrait based on physical description
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          generateCharacterImage(character)
                        }}
                        disabled={generatingImages[character.name]}
                        className="inline-flex items-center px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
                      >
                        {generatingImages[character.name] ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Redrawing...
                          </>
                        ) : (
                          <>
                            <Image className="h-3 w-3 mr-1" />
                            Redraw Portrait
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Image Generation Prompt */}
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 flex items-center">
                        <span className="mr-1">📝</span>
                        Show generation prompt
                      </summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-700 font-mono leading-relaxed">
                          {characterImages[character.name].prompt}
                        </p>
                      </div>
                    </details>
                  </div>
                ) : imageErrors[character.name] ? (
                  <div className="text-center py-2">
                    <p className="text-xs text-red-600 mb-2">{imageErrors[character.name]}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        generateCharacterImage(character)
                      }}
                      disabled={generatingImages[character.name]}
                      className="inline-flex items-center px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                    >
                      {generatingImages[character.name] ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <Image className="h-3 w-3 mr-1" />
                          Retry Image
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        generateCharacterImage(character)
                      }}
                      disabled={generatingImages[character.name]}
                      className="inline-flex items-center px-3 py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
                    >
                      {generatingImages[character.name] ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Image className="h-3 w-3 mr-1" />
                          Generate Portrait
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Create AI portrait from physical description
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metadata display */}
      {metadata && !loading && !error && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Analysis Details</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
            <div>
              <span className="font-medium">Input:</span> {metadata.inputLength} chars
            </div>
            <div>
              <span className="font-medium">Processed:</span> {metadata.optimizedLength} chars
            </div>
            <div>
              <span className="font-medium">Tokens:</span> ~{metadata.estimatedTokens}
            </div>
            <div>
              <span className="font-medium">Model:</span> {metadata.model}
            </div>
          </div>
        </div>
      )}

      {characters.length > 0 && !loading && !error && (
        <div className="text-xs text-gray-500 text-center">
          Character analysis by AI • Updates every 5 minutes or on manual refresh
        </div>
      )}

      {/* Full Picture Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleBackdropClick}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeFullPicture}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold z-10"
            >
              ×
            </button>
            <img 
              src={expandedImage.url} 
              alt={`Portrait of ${expandedImage.characterName}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
