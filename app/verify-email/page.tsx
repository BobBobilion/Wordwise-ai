"use client"

import { useAuth } from "@/contexts/auth-context"
import { Mail, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function VerifyEmailPage() {
  const { user, sendVerificationEmail, logout } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (user?.emailVerified) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleResendEmail = async () => {
    setLoading(true)
    setMessage("")
    try {
      await sendVerificationEmail()
      setMessage("Verification email has been sent to your inbox.")
    } catch (error: any) {
      setMessage("Failed to send verification email: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="text-gray-600 mt-2">
            We've sent a verification email to <strong>{user?.email}</strong>. Please check your inbox and click the
            verification link.
          </p>
        </div>

        {message && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">{message}</div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleResendEmail}
            disabled={loading}
            className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
