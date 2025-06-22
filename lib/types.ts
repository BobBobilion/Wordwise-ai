export interface User {
  uid: string
  email: string
  emailVerified: boolean
}

export interface PlotPoint {
  point: string
  tension: number
}

export interface Character {
  name: string
  mentions: number
  role: string
  description: string
  type: string
}

export interface WritingAnalysis {
  mood: string[]
  genre: string
}

export interface PlotSummary {
  plotSummary: PlotPoint[]
  actionableInsights: string[]
  metadata?: {
    inputLength: number
    optimizedLength: number
    estimatedTokens: number
    model: string
  }
}

export interface DocumentAnalysis {
  plotSummary?: PlotSummary
  characters?: Character[]
  writingAnalysis?: WritingAnalysis
  lastAnalyzed?: Date
  plotSuggestions?: string[]
  selectedSuggestions?: number[]
}

export interface Document {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  userId: string
  analysis?: DocumentAnalysis
}

export interface GrammarSuggestion {
  text: string
  suggestion: string
  suggestions: string[]
  start: number
  end: number
  type: "grammar" | "style" | "spelling"
  description?: string
}

export interface HighlightMark {
  from: number
  to: number
  color: 'red' | 'yellow' | 'purple'
  id: string
}
