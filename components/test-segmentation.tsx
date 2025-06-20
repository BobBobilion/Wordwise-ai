"use client"

import { useState } from 'react'
import { aiGrammarChecker } from '@/lib/ai-grammar-checker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TestSegmentation() {
  const [text, setText] = useState('This is a test sentence with more than five words. Here is another sentence to check.')
  const [segments, setSegments] = useState<any[]>([])

  const testSegmentation = () => {
    // Access the private method via type assertion for testing
    const checker = aiGrammarChecker as any
    const testSegments = checker.segmentText(text)
    setSegments(testSegments)
    console.log('🧪 Test Segmentation - Segments created:', testSegments)
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Text Segmentation Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Text:</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to test segmentation..."
            className="min-h-[100px]"
          />
        </div>
        
        <Button onClick={testSegmentation}>
          Test Segmentation
        </Button>
        
        {segments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Segments ({segments.length}):</h3>
            
            {segments.map((segment, index) => (
              <div key={segment.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Segment {index + 1}:</strong>
                    <div className="mt-1 p-2 bg-white border rounded font-mono text-xs">
                      "{segment.text}"
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div><strong>ID:</strong> {segment.id}</div>
                    <div><strong>Hash:</strong> {segment.hash}</div>
                    <div><strong>Position:</strong> {segment.startIndex}-{segment.endIndex}</div>
                    <div><strong>Length:</strong> {segment.text.length} chars</div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Reconstruction Test:</h4>
              <div className="font-mono text-sm bg-white p-2 border rounded">
                <strong>Original:</strong> "{text}"
              </div>
              <div className="font-mono text-sm bg-white p-2 border rounded mt-2">
                <strong>Reconstructed:</strong> "{segments.map(s => s.text).join('')}"
              </div>
              <div className="mt-2 text-sm">
                <strong>Match:</strong> {text === segments.map(s => s.text).join('') ? '✅ Perfect' : '❌ Mismatch'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// To use this component, add it to a page:
// import { TestSegmentation } from '@/components/test-segmentation'
// <TestSegmentation /> 