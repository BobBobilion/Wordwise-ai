"use client"

import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react"
import { WritingOverview } from "./writing-overview"
import { WritingSuggestions } from "./writing-suggestions"
import { CharacterNotebook } from "./character-notebook"
import { PlotSummary } from "./plot-summary"
import type { GrammarSuggestion, PlotSummary as PlotSummaryType, Character, WritingAnalysis } from "@/lib/types"
import React from "react"

interface WritingSidebarProps {
  content: string
  suggestions?: GrammarSuggestion[]
  onApplySuggestion?: (suggestion: GrammarSuggestion) => void
  onDismissSuggestion?: (suggestion: GrammarSuggestion) => void
  activeTab?: 'overview' | 'suggestions' | 'characters' | 'plot'
  onTabChange?: (tab: 'overview' | 'suggestions' | 'characters' | 'plot') => void
  highlightedSuggestionId?: string
  onCardClick?: (suggestion: GrammarSuggestion | null) => void
  selectedCardId?: string | null
  onCharacterNameChange?: (oldName: string, newName: string) => void
  loadedAnalysisData?: {
    writingAnalysis?: any
    characters?: any[]
    plotSummary?: any
    plotSuggestions?: string[]
    selectedSuggestions?: Set<number>
  }
  isCheckingGrammar?: boolean
  isCheckingStyle?: boolean
}

type TabType = "overview" | "suggestions" | "characters" | "plot"

export interface WritingSidebarRef {
  switchToSuggestions: () => void
  scrollToSuggestion: (suggestion: GrammarSuggestion) => void
  getActiveTab: () => TabType
  getAnalysisData: () => {
    plotSummary: PlotSummaryType | null
    characters: Character[] | null
    writingAnalysis: WritingAnalysis | null
  }
  getPlotSuggestionsData: () => {
    suggestions: string[]
    selectedSuggestions: Set<number>
  } | null
}

export const WritingSidebar = forwardRef<WritingSidebarRef, WritingSidebarProps>(
  ({ 
    content, 
    suggestions = [], 
    onApplySuggestion = () => {}, 
    onDismissSuggestion = () => {},
    activeTab,
    onTabChange,
    highlightedSuggestionId,
    onCardClick,
    selectedCardId,
    onCharacterNameChange,
    loadedAnalysisData,
    isCheckingGrammar,
    isCheckingStyle
  }, ref) => {
    const [internalActiveTab, setInternalActiveTab] = useState<TabType>("overview")
    
    // Use external activeTab if provided, otherwise use internal state
    const currentActiveTab = activeTab || internalActiveTab
    
    // Keep references to persist component state across tab switches
    const charactersRef = useRef<HTMLDivElement>(null)
    const plotRef = useRef<HTMLDivElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    // Refs to child components to access their data
    const overviewRef = useRef<{ getAnalysisData: () => WritingAnalysis | null }>(null)
    const charactersRefChild = useRef<{ getAnalysisData: () => Character[] | null }>(null)
    const plotRefChild = useRef<{ 
      getAnalysisData: () => PlotSummaryType | null
      getSuggestionsData: () => { suggestions: string[]; selectedSuggestions: Set<number> } | null 
    }>(null)

    const handleTabChange = (tab: TabType) => {
      if (onTabChange) {
        onTabChange(tab)
      } else {
        setInternalActiveTab(tab)
      }
    }

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      switchToSuggestions: () => {
        handleTabChange("suggestions")
      },
      scrollToSuggestion: (suggestion: GrammarSuggestion) => {
        handleTabChange("suggestions")
        setTimeout(() => {
          if (suggestionsRef.current) {
            const suggestionElements = suggestionsRef.current.querySelectorAll('[data-suggestion-id]')
            const targetElement = Array.from(suggestionElements).find(el => {
              const elSuggestion = el.getAttribute('data-suggestion-id')
              return elSuggestion === `${suggestion.start}-${suggestion.end}-${suggestion.text}`
            }) as HTMLElement
            
            if (targetElement) {
              targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              })
              targetElement.classList.add('bg-yellow-100', 'border-yellow-300')
              setTimeout(() => {
                targetElement.classList.remove('bg-yellow-100', 'border-yellow-300')
              }, 2000)
            }
          }
        }, 100)
      },
      getActiveTab: () => currentActiveTab,
      getAnalysisData: () => ({
        plotSummary: plotRefChild.current?.getAnalysisData() || null,
        characters: charactersRefChild.current?.getAnalysisData() || null,
        writingAnalysis: overviewRef.current?.getAnalysisData() || null,
      }),
      getPlotSuggestionsData: () => plotRefChild.current?.getSuggestionsData() || null
    }), [currentActiveTab, handleTabChange])

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
            {tabs.map((tab, index) => (
              <React.Fragment key={tab.id}>
                <button
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 px-3 py-3 text-xs font-medium text-center border-b-2 transition-all duration-200 relative ${
                    currentActiveTab === tab.id
                      ? "border-purple-500 text-purple-600 bg-purple-50/70"
                      : tab.id === "suggestions" && suggestions.length > 0
                      ? "border-transparent text-gray-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/30 bg-red-50/50 border-2 border-red-200/50"
                      : "border-transparent text-gray-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/30"
                  }`}
                >
                  {tab.label}
                  {tab.id === "suggestions" && suggestions.length > 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 rounded-full w-[9px] h-[9px]" />
                  )}
                </button>
                {index < tabs.length - 1 && (
                  <div className="w-px h-6 bg-gray-200 self-center" />
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Tab Content - Keep all components mounted but show/hide them */}
        <div className="flex-1 overflow-y-auto bg-white/30 relative">
          <div className={`${currentActiveTab === "overview" ? "block" : "hidden"} h-full`}>
            <WritingOverview 
              content={content} 
              ref={overviewRef}
              loadedAnalysisData={loadedAnalysisData?.writingAnalysis}
            />
          </div>
          
          <div 
            ref={suggestionsRef}
            className={`${currentActiveTab === "suggestions" ? "block" : "hidden"} h-full`}
          >
            <WritingSuggestions
              suggestions={suggestions}
              onApplySuggestion={onApplySuggestion}
              onDismissSuggestion={onDismissSuggestion}
              highlightedSuggestionId={highlightedSuggestionId}
              onCardClick={onCardClick}
              selectedCardId={selectedCardId}
              isCheckingGrammar={isCheckingGrammar}
              isCheckingStyle={isCheckingStyle}
            />
          </div>
          
          <div 
            ref={charactersRef}
            className={`${currentActiveTab === "characters" ? "block" : "hidden"} h-full`}
          >
            <CharacterNotebook 
              content={content} 
              onCharacterNameChange={onCharacterNameChange} 
              ref={charactersRefChild}
              loadedAnalysisData={loadedAnalysisData?.characters}
            />
          </div>
          
          <div 
            ref={plotRef}
            className={`${currentActiveTab === "plot" ? "block" : "hidden"} h-full`}
          >
            <PlotSummary 
              content={content} 
              ref={plotRefChild}
              loadedAnalysisData={loadedAnalysisData?.plotSummary}
              loadedPlotSuggestions={loadedAnalysisData?.plotSuggestions}
              loadedSelectedSuggestions={loadedAnalysisData?.selectedSuggestions}
            />
          </div>
        </div>
      </div>
    )
  }
)

WritingSidebar.displayName = "WritingSidebar"
