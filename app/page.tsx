"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, BookOpen, Sparkles, Users, Shield, Lightbulb, Palette, Edit3, BookMarked, MessageSquare, TrendingUp } from "lucide-react"

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      if (user.emailVerified) {
        router.push("/dashboard")
      } else {
        router.push("/verify-email")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Navigation */}
      <nav className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-purple-600" />
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Wordwise AI
          </span>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/login"
            className="px-4 py-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              Transform Your Writing
            </span>
            <br />
            <span className="text-gray-700">with AI-Powered Intelligence</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Enhance your writing with advanced grammar checking, intelligent suggestions, 
            and AI-powered content optimization. Perfect for writers, students, and professionals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Start Writing Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border-2 border-purple-600 text-purple-600 rounded-lg text-lg font-semibold hover:bg-purple-600 hover:text-white transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Novelist Features Section */}
      <div className="px-6 py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-800">
            Designed for Novelists
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            Every feature is crafted to help you overcome writer's block, maintain consistency, 
            and bring your stories to life with confidence.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Plot Continuation */}
            <div className="p-6 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <Lightbulb className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Plot Continuation</h3>
              <p className="text-gray-600 mb-4">
                Get AI-powered plot suggestions when you're stuck, helping you overcome writer's block 
                without breaking your narrative flow.
              </p>
              <div className="text-sm text-purple-600 font-medium">Never lose momentum again</div>
            </div>
            
            {/* Mood & Tone Consistency */}
            <div className="p-6 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <Palette className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Mood & Tone Analysis</h3>
              <p className="text-gray-600 mb-4">
                Maintain consistent emotional atmosphere throughout your chapters, ensuring your story 
                feels cohesive and emotionally aligned.
              </p>
              <div className="text-sm text-purple-600 font-medium">Keep readers engaged</div>
            </div>
            
            {/* Personalized Grammar & Style */}
            <div className="p-6 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <Edit3 className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Voice-Aware Editing</h3>
              <p className="text-gray-600 mb-4">
                Receive personalized grammar and style suggestions that preserve your unique voice 
                while keeping your writing polished and professional.
              </p>
              <div className="text-sm text-purple-600 font-medium">Polish without losing character</div>
            </div>
            
            {/* Literary Inspiration */}
            <div className="p-6 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <BookMarked className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Literary Inspiration</h3>
              <p className="text-gray-600 mb-4">
                Discover curated excerpts from classic and genre-relevant books to draw inspiration 
                and compare stylistic approaches.
              </p>
              <div className="text-sm text-purple-600 font-medium">Learn from the masters</div>
            </div>
            
            {/* Character Dialogue Analysis */}
            <div className="p-6 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <MessageSquare className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Dialogue Consistency</h3>
              <p className="text-gray-600 mb-4">
                Analyze your characters' dialogue for consistency and realism, ensuring each voice 
                feels distinct and true to their personality.
              </p>
              <div className="text-sm text-purple-600 font-medium">Make characters unforgettable</div>
            </div>
            
            {/* Pacing & Tension Tracking */}
            <div className="p-6 rounded-xl bg-white/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
              <TrendingUp className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Pacing & Tension</h3>
              <p className="text-gray-600 mb-4">
                Track narrative structure to identify slow sections or plot gaps before publishing, 
                ensuring your story maintains perfect momentum.
              </p>
              <div className="text-sm text-purple-600 font-medium">Keep readers turning pages</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Ready to Transform Your Writing?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of novelists who are already using Wordwise AI to bring their stories to life.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Start Your Free Trial
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-gray-600">
        <p>&copy; 2024 Wordwise AI. All rights reserved.</p>
      </footer>
    </div>
  )
}
