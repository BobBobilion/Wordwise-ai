"use client"

import { useState, useRef, useCallback } from "react"
import { WritingOverview } from "./writing-overview"
import { WritingSuggestions } from "./writing-suggestions"
import { CharacterNotebook } from "./character-notebook"
import { PlotSummary } from "./plot-summary"
import type { GrammarSuggestion } from "@/lib/types"

interface WritingSidebarProps {
  content: string
  suggestions?: GrammarSuggestion[]
  onApplySuggestion?: (suggestion: GrammarSuggestion) => void
  onDismissSuggestion?: (suggestion: GrammarSuggestion) => void
}

type TabType = "overview" | "suggestions" | "characters" | "plot"

export function WritingSidebar({ 
  content, 
  suggestions = [], 
  onApplySuggestion = () => {}, 
  onDismissSuggestion = () => {} 
}: WritingSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  
  // Keep references to persist component state across tab switches
  const charactersRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)

  const tabs = [
    { id: "overview" as TabType, label: "Writing Overview" },
    { id: "suggestions" as TabType, label: "Writing Suggestions" },
    { id: "characters" as TabType, label: "Characters Notebook" },
    { id: "plot" as TabType, label: "Plot Summary" },
  ]

  return (
    <div className="w-96 bg-white/70 backdrop-blur-sm border-l border-purple-100 flex flex-col h-full shadow-lg">
      {/* Tab Headers */}
      <div className="border-b border-purple-100 bg-white/50">
        <nav className="flex flex-nowrap overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-3 text-xs font-medium text-center border-b-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? "border-purple-500 text-purple-600 bg-purple-50/70"
                  : "border-transparent text-gray-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/30"
              }`}
            >
              {tab.label}
              {tab.id === "suggestions" && suggestions.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {suggestions.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content - Keep all components mounted but show/hide them */}
      <div className="flex-1 overflow-y-auto bg-white/30 relative">
        <div className={`${activeTab === "overview" ? "block" : "hidden"} h-full`}>
          <WritingOverview content={content} />
        </div>
        
        <div className={`${activeTab === "suggestions" ? "block" : "hidden"} h-full`}>
          <WritingSuggestions
            suggestions={suggestions}
            onApplySuggestion={onApplySuggestion}
            onDismissSuggestion={onDismissSuggestion}
          />
        </div>
        
        <div 
          ref={charactersRef}
          className={`${activeTab === "characters" ? "block" : "hidden"} h-full`}
        >
          <CharacterNotebook content={content} />
        </div>
        
        <div 
          ref={plotRef}
          className={`${activeTab === "plot" ? "block" : "hidden"} h-full`}
        >
          <PlotSummary content={content} />
        </div>
      </div>
    </div>
  )
}
