import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Wordwise AI - Transform Your Writing with AI-Powered Intelligence",
    template: "%s | Wordwise AI"
  },
  description: "Enhance your writing with advanced grammar checking, intelligent suggestions, and AI-powered content optimization. Perfect for writers, students, and professionals.",
  keywords: ["AI writing assistant", "grammar checker", "writing tool", "content optimization", "writing suggestions", "document editor"],
  authors: [{ name: "Wordwise AI Team" }],
  creator: "Wordwise AI",
  publisher: "Wordwise AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://wordwise-ai.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Wordwise AI - Transform Your Writing with AI-Powered Intelligence",
    description: "Enhance your writing with advanced grammar checking, intelligent suggestions, and AI-powered content optimization.",
    url: 'https://wordwise-ai.vercel.app',
    siteName: 'Wordwise AI',
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: 'Wordwise AI Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Wordwise AI - Transform Your Writing with AI-Powered Intelligence",
    description: "Enhance your writing with advanced grammar checking, intelligent suggestions, and AI-powered content optimization.",
    images: ['/icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#8B5CF6" />
        <meta name="msapplication-TileColor" content="#8B5CF6" />
      </head>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
