"use client"

import { useState, useEffect, useRef } from "react"
import { User, Users, Loader2, RefreshCw, AlertCircle, Info, Image, Download, Dog, Cat, Sparkles, Zap, Rocket, Ghost, Crown, Sword, Shield, Heart, Star, Moon, Sun, Cloud, Trees, Flower, Bug, Fish, Bird, Edit3, X, AlertTriangle } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface CharacterNotebookProps {
  content: string
  onCharacterNameChange?: (oldName: string, newName: string) => void
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
  let result = text
  
  // First pass: Convert **bold** to <strong> tags
  // Use a simple but effective approach
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Second pass: Convert *italic* to <em> tags
  // Only match single asterisks that aren't part of HTML tags
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  
  // Convert `code` to <code> tags
  result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
  
  // Convert line breaks to <br> tags
  result = result.replace(/\n/g, '<br>')
  
  return result
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

export function CharacterNotebook({ content, onCharacterNameChange }: CharacterNotebookProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [metadata, setMetadata] = useState<CharacterAnalysisResponse['metadata'] | null>(null)
  
  // Image generation states
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({})
  const [characterImages, setCharacterImages] = useState<Record<string, CharacterImageResponse>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})
  
  // Full picture mode state
  const [expandedImage, setExpandedImage] = useState<{url: string, characterName: string} | null>(null)
  
  // Character name editing states
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [newCharacterName, setNewCharacterName] = useState("")
  const [showNameChangeModal, setShowNameChangeModal] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [nameChangePreview, setNameChangePreview] = useState<{oldName: string, newName: string, replacements: number, preview: string, descriptionPreview: string} | null>(null)
  const [isProcessingNameChange, setIsProcessingNameChange] = useState(false)

  // Constants
  const MIN_TEXT_LENGTH = 50

  // Function to sort characters by importance and mention count
  const sortCharacters = (characters: Character[]): Character[] => {
    const rolePriority: Record<string, number> = {
      "Main Character": 3,
      "Supporting Character": 2,
      "Minor Character": 1,
    }

    return [...characters].sort((a, b) => {
      // First sort by role importance
      const aPriority = rolePriority[a.role] || 0
      const bPriority = rolePriority[b.role] || 0
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority // Higher priority first
      }
      
      // Then sort by mention count (descending)
      return b.mentions - a.mentions
    })
  }

  const analyzeCharacters = async () => {
    const text = content.replace(/<[^>]*>/g, "").trim()

    if (!text || text.length < MIN_TEXT_LENGTH) {
      setCharacters([])
      setError("")
      setMetadata(null)
      return
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

      setCharacters(sortCharacters(successData.characters))
      setMetadata(successData.metadata || null)
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
    analyzeCharacters()
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

  // Character name replacement functions
  const findCharacterNameReferences = (characterName: string, content: string) => {
    const references: Array<{text: string, start: number, end: number, type: 'first' | 'last' | 'full'}> = []
    const nameVariations = generateNameVariations(characterName)
    
    nameVariations.forEach(variation => {
      const regex = new RegExp(`\\b${escapeRegExp(variation.text)}\\b`, 'gi')
      let match
      
      while ((match = regex.exec(content)) !== null) {
        references.push({
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          type: variation.type
        })
      }
    })
    
    return references
  }

  const generateNameVariations = (fullName: string) => {
    const variations: Array<{text: string, type: 'first' | 'last' | 'full'}> = []
    const nameParts = fullName.trim().split(/\s+/)
    
    if (nameParts.length === 0) return variations
    
    // Always add full name
    variations.push({ text: fullName, type: 'full' })
    
    if (nameParts.length === 1) {
      // Single name - treat as both first and last name
      variations.push({ text: nameParts[0], type: 'first' })
      variations.push({ text: nameParts[0], type: 'last' })
    } else {
      // Multiple names
      // First name: everything except the last term
      const firstName = nameParts.slice(0, -1).join(' ')
      variations.push({ text: firstName, type: 'first' })
      
      // Last name: only the last term
      const lastName = nameParts[nameParts.length - 1]
      variations.push({ text: lastName, type: 'last' })
    }
    
    return variations
  }

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const replaceCharacterName = (oldName: string, newName: string, content: string) => {
    let newContent = content
    const oldVariations = generateNameVariations(oldName)
    const newVariations = generateNameVariations(newName)
    let totalReplacements = 0
    
    // Create a map of old variation types to new names
    const replacementMap = new Map<string, string>()
    
    // Map each type to the appropriate new name
    oldVariations.forEach(oldVar => {
      if (oldVar.type === 'full') {
        replacementMap.set(oldVar.text, newName)
      } else if (oldVar.type === 'first') {
        // Find the new first name
        const newFirstName = newVariations.find(v => v.type === 'first')
        replacementMap.set(oldVar.text, newFirstName?.text || newName)
      } else if (oldVar.type === 'last') {
        // Find the new last name
        const newLastName = newVariations.find(v => v.type === 'last')
        replacementMap.set(oldVar.text, newLastName?.text || newName)
      }
    })
    
    // Perform replacements
    replacementMap.forEach((newText, oldText) => {
      const regex = new RegExp(`\\b${escapeRegExp(oldText)}\\b`, 'gi')
      const matches = newContent.match(regex)
      if (matches) {
        totalReplacements += matches.length
      }
      newContent = newContent.replace(regex, newText)
    })
    
    return { newContent, totalReplacements }
  }

  const handleEditCharacterName = (character: Character) => {
    setEditingCharacter(character)
    setNewCharacterName(character.name)
    setShowNameChangeModal(true)
  }

  const handleNameChangeSubmit = () => {
    if (!editingCharacter || !newCharacterName.trim()) return
    
    const oldName = editingCharacter.name
    const newName = newCharacterName.trim()
    
    if (oldName === newName) {
      setShowNameChangeModal(false)
      setEditingCharacter(null)
      setNewCharacterName("")
      return
    }
    
    // Generate preview for document content
    const references = findCharacterNameReferences(oldName, content)
    const { newContent, totalReplacements } = replaceCharacterName(oldName, newName, content)
    
    // Create preview text (first 200 characters around first occurrence)
    let preview = ""
    if (references.length > 0) {
      const firstRef = references[0]
      const start = Math.max(0, firstRef.start - 50)
      const end = Math.min(content.length, firstRef.end + 50)
      preview = content.substring(start, end)
      if (start > 0) preview = "..." + preview
      if (end < content.length) preview = preview + "..."
    }
    
    // Generate preview for character description changes
    let descriptionPreview = ""
    if (editingCharacter.description) {
      const oldVariations = generateNameVariations(oldName)
      const newVariations = generateNameVariations(newName)
      let updatedDescription = editingCharacter.description
      
      // Create a map of old variation types to new names
      const replacementMap = new Map<string, string>()
      
      // Map each type to the appropriate new name
      oldVariations.forEach(oldVar => {
        if (oldVar.type === 'full') {
          replacementMap.set(oldVar.text, newName)
        } else if (oldVar.type === 'first') {
          // Find the new first name
          const newFirstName = newVariations.find(v => v.type === 'first')
          replacementMap.set(oldVar.text, newFirstName?.text || newName)
        } else if (oldVar.type === 'last') {
          // Find the new last name
          const newLastName = newVariations.find(v => v.type === 'last')
          replacementMap.set(oldVar.text, newLastName?.text || newName)
        }
      })
      
      // Perform replacements in the description
      replacementMap.forEach((newText, oldText) => {
        // Handle both regular text and bold text (**name**)
        const regex = new RegExp(`\\*\\*${escapeRegExp(oldText)}\\*\\*|\\b${escapeRegExp(oldText)}\\b`, 'gi')
        updatedDescription = updatedDescription.replace(regex, (match) => {
          // If it's bold text (**name**), keep the bold formatting
          if (match.startsWith('**') && match.endsWith('**')) {
            return `**${newText}**`
          }
          // Otherwise, just replace the text
          return newText
        })
      })
      
      descriptionPreview = updatedDescription
    }
    
    setNameChangePreview({
      oldName,
      newName,
      replacements: totalReplacements,
      preview,
      descriptionPreview
    })
    
    setShowNameChangeModal(false)
    setShowConfirmationModal(true)
  }

  const handleConfirmNameChange = async () => {
    if (!nameChangePreview || !onCharacterNameChange) return
    
    setIsProcessingNameChange(true)
    
    try {
      await onCharacterNameChange(nameChangePreview.oldName, nameChangePreview.newName)
      
      // Update local character list and their descriptions
      setCharacters(prev => {
        const updatedCharacters = prev.map(char => {
          if (char.name === nameChangePreview.oldName) {
            // Update the character name
            const updatedChar = { ...char, name: nameChangePreview.newName }
            
            // Also update the description if it contains the old name
            if (char.description) {
              const oldVariations = generateNameVariations(nameChangePreview.oldName)
              const newVariations = generateNameVariations(nameChangePreview.newName)
              let updatedDescription = char.description
              
              // Create a map of old variation types to new names
              const replacementMap = new Map<string, string>()
              
              // Map each type to the appropriate new name
              oldVariations.forEach(oldVar => {
                if (oldVar.type === 'full') {
                  replacementMap.set(oldVar.text, nameChangePreview.newName)
                } else if (oldVar.type === 'first') {
                  // Find the new first name
                  const newFirstName = newVariations.find(v => v.type === 'first')
                  replacementMap.set(oldVar.text, newFirstName?.text || nameChangePreview.newName)
                } else if (oldVar.type === 'last') {
                  // Find the new last name
                  const newLastName = newVariations.find(v => v.type === 'last')
                  replacementMap.set(oldVar.text, newLastName?.text || nameChangePreview.newName)
                }
              })
              
              // Perform replacements in the description
              replacementMap.forEach((newText, oldText) => {
                // Handle both regular text and bold text (**name**)
                const regex = new RegExp(`\\*\\*${escapeRegExp(oldText)}\\*\\*|\\b${escapeRegExp(oldText)}\\b`, 'gi')
                updatedDescription = updatedDescription.replace(regex, (match) => {
                  // If it's bold text (**name**), keep the bold formatting
                  if (match.startsWith('**') && match.endsWith('**')) {
                    return `**${newText}**`
                  }
                  // Otherwise, just replace the text
                  return newText
                })
              })
              
              updatedChar.description = updatedDescription
            }
            
            return updatedChar
          }
          return char
        })
        
        // Sort the updated characters to maintain proper order
        return sortCharacters(updatedCharacters)
      })
      
      // Update character images mapping
      if (characterImages[nameChangePreview.oldName]) {
        setCharacterImages(prev => ({
          ...prev,
          [nameChangePreview.newName]: prev[nameChangePreview.oldName]
        }))
        setCharacterImages(prev => {
          const newImages = { ...prev }
          delete newImages[nameChangePreview.oldName]
          return newImages
        })
      }
      
      // Update generating images mapping
      if (generatingImages[nameChangePreview.oldName]) {
        setGeneratingImages(prev => ({
          ...prev,
          [nameChangePreview.newName]: prev[nameChangePreview.oldName]
        }))
        setGeneratingImages(prev => {
          const newGenerating = { ...prev }
          delete newGenerating[nameChangePreview.oldName]
          return newGenerating
        })
      }
      
      // Update image errors mapping
      if (imageErrors[nameChangePreview.oldName]) {
        setImageErrors(prev => ({
          ...prev,
          [nameChangePreview.newName]: prev[nameChangePreview.oldName]
        }))
        setImageErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[nameChangePreview.oldName]
          return newErrors
        })
      }
      
    } catch (error) {
      console.error("Failed to update character name:", error)
    } finally {
      setIsProcessingNameChange(false)
      setShowConfirmationModal(false)
      setEditingCharacter(null)
      setNewCharacterName("")
      setNameChangePreview(null)
    }
  }

  const handleCancelNameChange = () => {
    setShowNameChangeModal(false)
    setShowConfirmationModal(false)
    setEditingCharacter(null)
    setNewCharacterName("")
    setNameChangePreview(null)
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      "Main Character": "bg-blue-100 text-blue-800",
      "Supporting Character": "bg-green-100 text-green-800",
      "Minor Character": "bg-gray-100 text-gray-800",
    }
    return colors[role] || colors["Minor Character"]
  }

  // Sort characters for display
  const sortedCharacters = sortCharacters(characters)

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
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mt-2">
          <Users className="h-4 w-4" />
          <span>{sortedCharacters.length} characters detected</span>
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
      ) : sortedCharacters.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No characters detected yet.</p>
          <p className="text-xs text-gray-500 mt-1">Characters will appear as you write.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto border-2 border-gray-300 rounded-lg bg-gray-50 p-3 shadow-inner">
          {sortedCharacters.map((character, index) => (
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
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-lg text-gray-900 break-words leading-tight">{character.name}</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditCharacterName(character)
                        }}
                        className="flex-shrink-0 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 bg-gray-100 border border-gray-300 rounded transition-colors"
                        title="Edit character name"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </div>
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

      {sortedCharacters.length > 0 && !loading && !error && (
        <div className="text-xs text-gray-500 text-center">
          Character analysis by AI • Manual refresh only
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

      {/* Character Name Edit Modal */}
      {showNameChangeModal && editingCharacter && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleCancelNameChange}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Character Name</h3>
              <button
                onClick={handleCancelNameChange}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Name
                </label>
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border">
                  {editingCharacter.name}
                </div>
              </div>
              
              <div>
                <label htmlFor="newCharacterName" className="block text-sm font-medium text-gray-700 mb-2">
                  New Name
                </label>
                <input
                  id="newCharacterName"
                  type="text"
                  value={newCharacterName}
                  onChange={(e) => setNewCharacterName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new character name..."
                  autoFocus
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important Note:</p>
                    <p className="mt-1">This will replace all references to "{editingCharacter.name}" throughout your document, including first names, last names, and full names. Character descriptions generated by AI will also be updated. Some nicknames or variations might not be automatically replaced.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelNameChange}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNameChangeSubmit}
                disabled={!newCharacterName.trim() || newCharacterName.trim() === editingCharacter.name}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Name Change Confirmation Modal */}
      {showConfirmationModal && nameChangePreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleCancelNameChange}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Character Name Change</h3>
              <button
                onClick={handleCancelNameChange}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Change Summary</span>
                </div>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><span className="font-medium">From:</span> "{nameChangePreview.oldName}"</p>
                  <p><span className="font-medium">To:</span> "{nameChangePreview.newName}"</p>
                  <p><span className="font-medium">Replacements:</span> {nameChangePreview.replacements} occurrences</p>
                </div>
              </div>
              
              {nameChangePreview.preview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview (first occurrence)
                  </label>
                  <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border max-h-20 overflow-y-auto">
                    {nameChangePreview.preview}
                  </div>
                </div>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Warning:</p>
                    <p className="mt-1">This action cannot be undone. Some nicknames, abbreviations, or character references that don't exactly match the original name might not be automatically replaced. Character descriptions generated by AI will also be updated to reflect the new name.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelNameChange}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNameChange}
                disabled={isProcessingNameChange}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors flex items-center space-x-2"
              >
                {isProcessingNameChange ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Change</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
