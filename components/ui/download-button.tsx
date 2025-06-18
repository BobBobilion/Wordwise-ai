"use client"

import React, { useState } from "react"
import { Download, FileText, FileType, File, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadDocument } from "@/lib/utils"
import type { Document } from "@/lib/types"

interface DownloadButtonProps {
  document: Document
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function DownloadButton({ 
  document, 
  variant = "outline", 
  size = "sm",
  className 
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (format: 'txt' | 'docx' | 'pdf') => {
    setIsDownloading(true)
    try {
      await downloadDocument(document, format)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={isDownloading}>
          {isDownloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload('txt')} disabled={isDownloading}>
          <FileText className="h-4 w-4 mr-2" />
          Download as TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('docx')} disabled={isDownloading}>
          <FileType className="h-4 w-4 mr-2" />
          Download as DOCX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('pdf')} disabled={isDownloading}>
          <File className="h-4 w-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 