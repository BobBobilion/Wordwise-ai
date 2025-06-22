"use client"

import { useMemo, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import { BookOpen, Hash, Palette, TrendingUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WritingAnalysis } from "@/lib/types"

interface WritingOverviewProps {
  content: string
  loadedAnalysisData?: any
}

export interface WritingOverviewRef {
  getAnalysisData: () => WritingAnalysis | null
}

export const WritingOverview = forwardRef<WritingOverviewRef, WritingOverviewProps>(
  ({ content, loadedAnalysisData }, ref) => {
    const [aiAnalysis, setAiAnalysis] = useState<WritingAnalysis>({
      mood: ["neutral"],
      genre: "General Fiction"
    })
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Load saved analysis data if available
    useEffect(() => {
      if (loadedAnalysisData) {
        setAiAnalysis(loadedAnalysisData)
      }
    }, [loadedAnalysisData])

    // Expose analysis data through ref
    useImperativeHandle(ref, () => ({
      getAnalysisData: () => aiAnalysis
    }))

    const basicAnalysis = useMemo(() => {
      const text = content.replace(/<[^>]*>/g, "").trim()
      const words = text.split(/\s+/).filter((word) => word.length > 0)
      const wordCount = words.length

      return {
        wordCount,
        textLength: text.length,
      }
    }, [content])

    const analyzeWithAI = useCallback(async () => {
      const text = content.replace(/<[^>]*>/g, "").trim()
      
      if (text.length < 50) {
        // Don't analyze very short text
        setAiAnalysis({
          mood: ["neutral"],
          genre: "General Fiction"
        })
        return
      }

      setIsAnalyzing(true)
      try {
        const response = await fetch("/api/writing-analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        })

        if (response.ok) {
          const result = await response.json()
          setAiAnalysis(result)
        }
      } catch (error) {
        console.error("Failed to analyze writing:", error)
      } finally {
        setIsAnalyzing(false)
      }
    }, [content])

    // Handle manual analysis
    const handleManualAnalysis = () => {
      analyzeWithAI()
    }

    const getMoodColor = (mood: string) => {
      const colors: Record<string, string> = {
        happy: "bg-yellow-100 text-yellow-800",
        sad: "bg-blue-100 text-blue-800",
        angry: "bg-red-100 text-red-800",
        mysterious: "bg-purple-100 text-purple-800",
        romantic: "bg-pink-100 text-pink-800",
        adventurous: "bg-green-100 text-green-800",
        tense: "bg-orange-100 text-orange-800",
        melancholic: "bg-indigo-100 text-indigo-800",
        hopeful: "bg-emerald-100 text-emerald-800",
        dark: "bg-gray-800 text-gray-100",
        peaceful: "bg-teal-100 text-teal-800",
        exciting: "bg-red-100 text-red-800",
        nostalgic: "bg-amber-100 text-amber-800",
        neutral: "bg-gray-100 text-gray-800",
      }
      return colors[mood.toLowerCase()] || colors.neutral
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
              <p className="text-2xl font-bold text-blue-600">{basicAnalysis.wordCount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* AI-Detected Mood */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4 text-gray-600" />
              <h4 className="text-sm font-medium text-gray-900">AI-Detected Mood</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualAnalysis}
              disabled={isAnalyzing}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAnalyzing ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 animate-pulse">
                Analyzing...
              </span>
            ) : (
              aiAnalysis.mood.map((mood, index) => (
                <span key={index} className={`px-3 py-1 rounded-full text-xs font-medium ${getMoodColor(mood)}`}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </span>
              ))
            )}
          </div>
        </div>

        {/* AI-Detected Genre */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-900">AI-Detected Genre</h4>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3">
            {isAnalyzing ? (
              <span className="text-indigo-500 font-medium animate-pulse">Analyzing...</span>
            ) : (
              <span className="text-indigo-800 font-medium">{aiAnalysis.genre}</span>
            )}
          </div>
        </div>

        {/* Reading Time Estimate */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-900">Reading Time</h4>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <span className="text-green-800 font-medium">~{Math.ceil(basicAnalysis.wordCount / 200)} min read</span>
          </div>
        </div>
      </div>
    )
  }
)
