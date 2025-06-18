import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clean text content by removing HTML entities and tags
 */
export function cleanTextContent(content: string): string {
  // First decode HTML entities
  const textarea = document.createElement('textarea')
  textarea.innerHTML = content
  let cleanedContent = textarea.value
  
  // Remove HTML tags
  cleanedContent = cleanedContent.replace(/<[^>]*>/g, '')
  
  // Replace common HTML entities with their actual characters
  cleanedContent = cleanedContent
    .replace(/&nbsp;/g, ' ') // non-breaking space
    .replace(/&amp;/g, '&') // ampersand
    .replace(/&lt;/g, '<') // less than
    .replace(/&gt;/g, '>') // greater than
    .replace(/&quot;/g, '"') // quotation mark
    .replace(/&#39;/g, "'") // apostrophe
    .replace(/&apos;/g, "'") // apostrophe (alternative)
  
  return cleanedContent
}

/**
 * Download a document in various formats
 */
export async function downloadDocument(document: { title: string; content: string }, format: 'txt' | 'docx' | 'pdf' = 'txt') {
  const cleanTitle = document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  
  switch (format) {
    case 'txt':
      downloadAsText(document.content, `${cleanTitle}.txt`)
      break
    case 'docx':
      await downloadAsDocx(document.title, document.content, `${cleanTitle}.docx`)
      break
    case 'pdf':
      await downloadAsPdf(document.title, document.content, `${cleanTitle}.pdf`)
      break
  }
}

function downloadAsText(content: string, filename: string) {
  // Clean content to remove HTML entities and tags
  const plainText = cleanTextContent(content)
  const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, filename)
}

async function downloadAsDocx(title: string, content: string, filename: string) {
  try {
    // Dynamic import to avoid SSR issues
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
    
    // Clean content to remove HTML entities and tags
    const plainText = cleanTextContent(content)
    const paragraphs = plainText.split('\n').filter(p => p.trim().length > 0)
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: {
              after: 200,
            },
          }),
          ...paragraphs.map(text => 
            new Paragraph({
              children: [
                new TextRun({
                  text: text.trim(),
                  size: 24,
                }),
              ],
              spacing: {
                after: 120,
              },
            })
          ),
        ],
      }],
    })

    const blob = await Packer.toBlob(doc)
    downloadBlob(blob, filename)
  } catch (error) {
    console.error('Error generating DOCX:', error)
    // Fallback to text download
    downloadAsText(content, filename.replace('.docx', '.txt'))
  }
}

async function downloadAsPdf(title: string, content: string, filename: string) {
  try {
    // Dynamic import to avoid SSR issues
    const { jsPDF } = await import('jspdf')
    
    // Clean content to remove HTML entities and tags
    const plainText = cleanTextContent(content)
    
    const pdf = new jsPDF()
    
    // Set font and add title
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, 20, 20)
    
    // Add content
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    
    const splitText = pdf.splitTextToSize(plainText, 170) // 170 is the max width
    pdf.text(splitText, 20, 40)
    
    const blob = pdf.output('blob')
    downloadBlob(blob, filename)
  } catch (error) {
    console.error('Error generating PDF:', error)
    // Fallback to text download
    downloadAsText(content, filename.replace('.pdf', '.txt'))
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
