export interface User {
  uid: string
  email: string
  emailVerified: boolean
}

export interface Document {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface GrammarSuggestion {
  text: string
  suggestion: string
  start: number
  end: number
  type: "grammar" | "style"
  description?: string
}

export interface HighlightMark {
  from: number
  to: number
  color: 'red' | 'yellow' | 'purple'
  id: string
}
