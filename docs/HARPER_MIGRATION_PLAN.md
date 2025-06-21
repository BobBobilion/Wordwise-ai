# Harper.js Migration Plan: LLM → Harper.js for Grammar & Spelling

## Overview

This document outlines the complete migration plan from LLM-based grammar and spelling checking to Harper.js, a lightweight, privacy-focused grammar and spelling linter that runs entirely server-side.

## Current State

- **Spelling Check**: `/api/spelling-check/route.ts` - AI-based spelling analysis
- **Grammar Check**: `/api/grammar-check/route.ts` - AI-based grammar analysis
- **Style Check**: `/api/writing-analysis/route.ts` - AI-based writing analysis

## Target State

- **Unified Check**: `/api/harper-check/route.ts` - Harper.js for both spelling & grammar
- **Style Check**: `/api/style-check/route.ts` - AI-based style suggestions (new)
- **Real-time**: Debounced checking with <2 second delay
- **Performance**: <20ms processing time per document
- **Optimization**: Diff-based linting with sentence-level caching

## Harper.js Overview

### Key Features
- **Lightweight**: Under 500kb including all datasets
- **Fast**: Completes analysis in under 10-20ms for large documents
- **Privacy-focused**: Runs entirely server-side using WebAssembly
- **Accurate**: Specifically designed for English grammar and spelling
- **TypeScript Support**: Full TypeScript support with comprehensive API documentation

### Installation
```bash
npm install harper.js
```

### Basic Setup
```typescript
import { LocalLinter, binary } from 'harper.js';

// Initialize the linter for Node.js environment
const linter = new LocalLinter({ binary });
await linter.setup();
```

## Phase 1: API Route Consolidation

### Current Routes to Replace
- `/api/spelling-check/route.ts`
- `/api/grammar-check/route.ts`

### New Unified Route
- `/api/harper-check/route.ts` - Single endpoint for both spelling and grammar

## Phase 2: Harper.js Integration

### Implementation Strategy
1. **Environment**: Server-side Node.js using `LocalLinter`
2. **Configuration**: English-only, no custom dictionaries
3. **Initialization**: Single linter instance per server instance
4. **Response Mapping**: Convert Harper.js `Lint` objects to existing interface

### Harper.js Response Structure
```typescript
// Harper.js returns:
{
  span: { start: number, end: number },
  problem: string,
  suggestions: string[],
  kind: "grammar" | "spelling"
}
```

### Target Interface Mapping
```typescript
// Maps to existing GrammarSuggestion interface:
{
  text: string,
  suggestion: string,
  start: number,
  end: number,
  type: "grammar" | "spelling",
  description: string
}
```

## Phase 3: Response Structure Mapping

### Conversion Logic
```typescript
// Pseudo-code for mapping Harper.js response
const mapHarperResponse = (harperLints: Lint[]): GrammarSuggestion[] => {
  return harperLints.map(lint => ({
    text: getTextFromSpan(lint.span), // Extract text from document
    suggestion: lint.suggestions[0], // Use first suggestion
    start: lint.span.start,
    end: lint.span.end,
    type: lint.kind === "spelling" ? "grammar" : "grammar", // Map to existing types
    description: lint.problem
  }));
};
```

## Phase 4: Real-time Implementation

### Debounced API Strategy
1. **Trigger**: Text changes in rich text editor
2. **Delay**: 1.5 seconds debounce (under 2-second requirement)
3. **Processing**: Harper.js analysis (<20ms)
4. **Response**: Unified suggestions from Harper.js

### Performance Characteristics
- **Processing Time**: <20ms per document
- **Debounce Delay**: 1.5 seconds
- **Total Response Time**: <2 seconds including network latency

## Phase 5: Frontend Updates

### Rich Text Editor Modifications
1. **Single API Call**: Replace dual spelling/grammar calls with `/harper-check`
2. **Unified Suggestions**: Display Harper.js results in existing `WritingSuggestions` component
3. **Real-time Updates**: Implement debounced checking as user types
4. **Highlighting**: Maintain existing highlight system for Harper.js suggestions

### Component Updates Required
- `components/rich-text-editor.tsx`: Update API calls and debouncing
- `components/sidebar/writing-suggestions.tsx`: Handle unified suggestions
- `hooks/use-debounce.ts`: Ensure proper debouncing implementation

## Phase 6: Style Check Separation

### New Style Check Route
- **Route**: `/api/style-check/route.ts`
- **Purpose**: AI-based style and clarity suggestions
- **Trigger**: Separate button or on-demand checking
- **Response**: Style-focused suggestions only
- **Integration**: Combined with Harper.js results in UI

### Style Check Features
- **Clarity**: Improve sentence structure and readability
- **Conciseness**: Remove unnecessary words and phrases
- **Tone**: Adjust writing style for different audiences
- **Flow**: Improve paragraph and section transitions

## Phase 7: Error Handling Strategy

### Graceful Degradation
- **Harper.js Failure**: Return empty suggestions array (no fallback)
- **Setup Issues**: Log errors but don't break the application
- **Timeout Handling**: 2-second timeout for API calls
- **Memory Issues**: Proper cleanup of linter instances

### Error Scenarios
1. **Linter Initialization Failure**: Log error, return empty suggestions
2. **Processing Timeout**: Return empty suggestions after 2 seconds
3. **Memory Exhaustion**: Implement proper cleanup and restart
4. **Invalid Input**: Handle edge cases gracefully

## Phase 8: Performance Optimization

### Implementation Considerations
1. **Linter Reuse**: Initialize Harper.js linter once per server instance
2. **Memory Management**: Proper cleanup of linter instances
3. **Caching**: Consider caching results for identical text chunks
4. **Batch Processing**: Handle multiple simultaneous requests efficiently

### Optimization Strategies
- **Singleton Pattern**: Single linter instance across requests
- **Text Chunking**: Process large documents in manageable chunks
- **Result Caching**: Cache results for identical text inputs
- **Connection Pooling**: Efficient handling of concurrent requests

## Phase 9: Batch & Diff-Based Linting (NEW)

### Diff-Aware Sliding Window Strategy

#### Core Concept
Instead of re-linting the entire document on every change, implement a diff-based approach that:
1. **Tracks document versions** and identifies specific changes
2. **Uses sliding window** around modified regions
3. **Caches results** at sentence level per session
4. **Re-lints only changed regions** for optimal performance

#### Implementation Details

##### Document Version Tracking
```typescript
interface DocumentVersion {
  id: string;
  content: string;
  timestamp: number;
  cachedResults: Map<string, GrammarSuggestion[]>; // sentence -> suggestions
}

interface ChangeSpan {
  type: 'insertion' | 'deletion' | 'modification';
  start: number;
  end: number;
  newText?: string;
  oldText?: string;
}
```

##### Diff Algorithm Integration
```typescript
// Using lightweight diff-match-patch or similar
import { diff_match_patch } from 'diff-match-patch';

const detectChanges = (oldContent: string, newContent: string): ChangeSpan[] => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldContent, newContent);
  dmp.diff_cleanupSemantic(diffs);
  
  return convertDiffsToSpans(diffs);
};
```

##### Sliding Window Strategy
```typescript
const calculateLintWindow = (changeSpan: ChangeSpan, content: string): { start: number, end: number } => {
  const WINDOW_EXPANSION = 200; // ±200 characters
  const start = Math.max(0, changeSpan.start - WINDOW_EXPANSION);
  const end = Math.min(content.length, changeSpan.end + WINDOW_EXPANSION);
  
  // Expand to sentence boundaries
  return expandToSentenceBoundaries(start, end, content);
};
```

##### Sentence-Level Caching
```typescript
interface SentenceCache {
  sentenceHash: string;
  suggestions: GrammarSuggestion[];
  timestamp: number;
}

const getSentenceHash = (sentence: string): string => {
  return crypto.createHash('md5').update(sentence).digest('hex');
};

const isCached = (sentence: string, cache: Map<string, SentenceCache>): boolean => {
  const hash = getSentenceHash(sentence);
  const cached = cache.get(hash);
  return cached && (Date.now() - cached.timestamp) < SESSION_TIMEOUT;
};
```

#### Caching Strategy

##### Cache Storage
- **Location**: In-session memory (per user session)
- **Scope**: Per-document, per-session
- **Granularity**: Sentence-level caching
- **Invalidation**: On document change (cache cleared and rebuilt)

##### Cache Implementation
```typescript
class DocumentCache {
  private cache: Map<string, SentenceCache> = new Map();
  private lastContent: string = '';
  
  updateCache(documentId: string, content: string, suggestions: GrammarSuggestion[]) {
    // Clear cache on content change
    if (content !== this.lastContent) {
      this.cache.clear();
      this.lastContent = content;
    }
    
    // Cache by sentence
    const sentences = splitIntoSentences(content);
    sentences.forEach(sentence => {
      const hash = getSentenceHash(sentence);
      const sentenceSuggestions = filterSuggestionsForSentence(suggestions, sentence);
      this.cache.set(hash, {
        sentenceHash: hash,
        suggestions: sentenceSuggestions,
        timestamp: Date.now()
      });
    });
  }
}
```

#### Diff-Based Processing Flow

##### 1. Change Detection
```typescript
const processDocumentChanges = async (
  oldContent: string, 
  newContent: string, 
  documentId: string
): Promise<GrammarSuggestion[]> => {
  // Detect changes using diff algorithm
  const changes = detectChanges(oldContent, newContent);
  
  if (changes.length === 0) {
    return getCachedResults(documentId);
  }
  
  // Process each change
  const newSuggestions: GrammarSuggestion[] = [];
  
  for (const change of changes) {
    const window = calculateLintWindow(change, newContent);
    const windowText = newContent.substring(window.start, window.end);
    
    // Check cache first
    const cachedSuggestions = getCachedSuggestionsForWindow(window, documentId);
    if (cachedSuggestions.length > 0) {
      newSuggestions.push(...cachedSuggestions);
      continue;
    }
    
    // Lint the window
    const windowSuggestions = await lintText(windowText);
    const adjustedSuggestions = adjustPositions(windowSuggestions, window.start);
    
    newSuggestions.push(...adjustedSuggestions);
    
    // Cache the results
    cacheWindowResults(window, adjustedSuggestions, documentId);
  }
  
  return newSuggestions;
};
```

##### 2. Fallback Strategy
```typescript
const lintWithFallback = async (content: string): Promise<GrammarSuggestion[]> => {
  try {
    // Try diff-based linting first
    const diffResults = await performDiffBasedLinting(content);
    if (diffResults.length > 0 || content.length < DIFF_THRESHOLD) {
      return diffResults;
    }
    
    // Fallback to full document linting
    return await performFullDocumentLinting(content);
  } catch (error) {
    console.error('Diff-based linting failed, falling back to full document:', error);
    return await performFullDocumentLinting(content);
  }
};
```

#### Performance Optimizations

##### 1. Window Size Optimization
```typescript
const calculateOptimalWindowSize = (contentLength: number): number => {
  if (contentLength < 1000) return 100;      // Small documents
  if (contentLength < 5000) return 200;      // Medium documents
  if (contentLength < 20000) return 300;     // Large documents
  return 500;                                // Very large documents
};
```

##### 2. Batch Processing
```typescript
const batchLintWindows = async (windows: string[]): Promise<GrammarSuggestion[][]> => {
  const batchSize = 5; // Process 5 windows at a time
  const results: GrammarSuggestion[][] = [];
  
  for (let i = 0; i < windows.length; i += batchSize) {
    const batch = windows.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(window => lintText(window))
    );
    results.push(...batchResults);
  }
  
  return results;
};
```

##### 3. Memory Management
```typescript
class CacheManager {
  private maxCacheSize = 1000; // Maximum cached sentences per document
  private cleanupInterval = 5 * 60 * 1000; // 5 minutes
  
  cleanup() {
    const now = Date.now();
    for (const [key, cache] of this.cache.entries()) {
      if (now - cache.timestamp > this.cleanupInterval) {
        this.cache.delete(key);
      }
    }
    
    // Limit cache size
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, this.cache.size - this.maxCacheSize)
        .forEach(([key]) => this.cache.delete(key));
    }
  }
}
```

#### API Integration

##### Updated API Route
```typescript
// /api/harper-check/route.ts
export async function POST(request: NextRequest) {
  const { text, documentId, previousContent } = await request.json();
  
  try {
    const suggestions = await processDocumentChanges(
      previousContent || '', 
      text, 
      documentId
    );
    
    return NextResponse.json({ 
      suggestions,
      processingMethod: 'diff-based',
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    // Fallback to full document linting
    const suggestions = await performFullDocumentLinting(text);
    return NextResponse.json({ 
      suggestions,
      processingMethod: 'full-document',
      processingTime: Date.now() - startTime
    });
  }
}
```

#### Frontend Integration

##### Updated Rich Text Editor
```typescript
// In rich-text-editor.tsx
const [previousContent, setPreviousContent] = useState('');
const [documentId] = useState(generateDocumentId());

const checkGrammar = useCallback(
  debounce(async (content: string) => {
    const response = await fetch('/api/harper-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: content,
        documentId,
        previousContent
      })
    });
    
    const { suggestions } = await response.json();
    setSuggestions(suggestions);
    setPreviousContent(content);
  }, 1500),
  [documentId, previousContent]
);
```

### Benefits of Diff-Based Linting

#### Performance Improvements
- **Reduced Processing Time**: Only lint changed regions instead of entire document
- **Faster Response**: Cached results for unchanged sentences
- **Lower Memory Usage**: Efficient caching strategy
- **Better Scalability**: Handles large documents more efficiently

#### User Experience Benefits
- **Real-time Feedback**: Faster suggestions as user types
- **Consistent Performance**: Maintains speed regardless of document size
- **Seamless Experience**: No visible difference in functionality
- **Reliable Fallback**: Full document linting when needed

## Migration Steps

### Step 1: Environment Setup
1. Install Harper.js: `npm install harper.js`
2. Install diff library: `npm install diff-match-patch`
3. Test basic functionality in development environment
4. Verify TypeScript integration and type definitions

### Step 2: API Implementation
1. Create `/api/harper-check/route.ts` with Harper.js integration
2. Implement diff-based linting with caching
3. Add fallback to full document linting
4. Implement response mapping from Harper.js to existing interface
5. Add proper error handling and timeout management
6. Test with various text inputs and edge cases

### Step 3: Frontend Integration
1. Update rich text editor to use single API endpoint
2. Implement document version tracking
3. Add debounced real-time checking with diff support
4. Modify suggestion display to handle unified results
5. Test real-time functionality and performance

### Step 4: Style Check Implementation
1. Create `/api/style-check/route.ts` for AI style suggestions
2. Integrate style suggestions with Harper.js results
3. Update UI to display combined suggestions
4. Test style checking functionality

### Step 5: Testing and Optimization
1. Performance testing with large documents
2. Diff-based linting accuracy validation
3. Cache efficiency testing
4. Error handling validation
5. Memory usage optimization
6. User experience testing

### Step 6: Cleanup
1. Remove old spelling and grammar API routes
2. Update documentation and comments
3. Clean up unused dependencies
4. Final testing and validation

## Benefits of Harper.js Migration

### Performance Benefits
- **Speed**: <20ms processing vs AI API calls (typically 500ms-2s)
- **Reliability**: No external API dependencies
- **Scalability**: Can handle high concurrent usage
- **Efficiency**: Diff-based linting reduces processing overhead

### Cost Benefits
- **Eliminates AI API costs** for grammar/spelling checking
- **Reduces server load** with faster processing
- **Lower bandwidth usage** with local processing
- **Optimized resource usage** with intelligent caching

### Privacy Benefits
- **No text sent to external services** for grammar/spelling
- **Complete data privacy** for sensitive content
- **Compliance** with data protection regulations
- **Session-based caching** maintains privacy

### Quality Benefits
- **Consistent results** across all requests
- **Specialized accuracy** for English grammar/spelling
- **Immediate feedback** with real-time checking
- **Intelligent processing** with diff-based optimization

## Technical Specifications

### Harper.js Configuration
```typescript
const linterConfig = {
  binary: binary, // Harper.js binary
  language: 'en', // English only
  dialect: 'us', // US English dialect
  rules: {
    // Default rules for grammar and spelling
  }
};
```

### API Response Format
```typescript
interface HarperCheckResponse {
  suggestions: GrammarSuggestion[];
  processingTime: number;
  documentLength: number;
  processingMethod: 'diff-based' | 'full-document';
}
```

### Error Response Format
```typescript
interface HarperErrorResponse {
  suggestions: []; // Empty array on error
  error?: string; // Optional error message for logging
  processingMethod: 'fallback';
}
```

### Cache Configuration
```typescript
interface CacheConfig {
  maxCacheSize: number;        // 1000 sentences per document
  cleanupInterval: number;     // 5 minutes
  sessionTimeout: number;      // Until document change
  windowExpansion: number;     // ±200 characters
}
```

## Monitoring and Maintenance

### Performance Monitoring
- Track processing times for different document sizes
- Monitor diff-based vs full-document processing ratios
- Monitor cache hit rates and efficiency
- Monitor memory usage and cleanup efficiency
- Log error rates and types for optimization

### Maintenance Tasks
- Regular updates to Harper.js library
- Performance optimization based on usage patterns
- Cache efficiency tuning based on real-world usage
- Error handling improvements based on real-world usage
- Diff algorithm optimization for better accuracy

## Conclusion

This migration plan provides a comprehensive approach to replacing LLM-based grammar and spelling checking with Harper.js, enhanced with intelligent diff-based linting and caching strategies. The implementation focuses on performance, privacy, and user experience while maintaining compatibility with existing code structure and interfaces.

The phased approach ensures minimal disruption to existing functionality while providing significant improvements in speed, cost, privacy, and efficiency through intelligent processing and caching. 