# OpenAI GPT-4o-mini API Documentation

## Overview

This documentation covers how to integrate and use OpenAI's GPT-4o-mini model in your Broberlly-Good application. The current implementation uses the Vercel AI SDK for streamlined integration.

## 🚀 Current Implementation

### Using Vercel AI SDK (Recommended)

Your project currently uses the Vercel AI SDK for OpenAI integration, which provides a clean and efficient way to interact with GPT-4o-mini.

#### Setup

1. **Install Dependencies** (already installed):
```bash
npm install ai @ai-sdk/openai
```

2. **Environment Variables** (already configured):
```env
OPENAI_API_KEY=your_openai_api_key_here
```

#### Basic Usage

```typescript
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Simple text generation
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Write a short story about a robot learning to paint.",
})

// With system message
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  system: "You are a helpful writing assistant. Provide concise, creative responses.",
  prompt: "Help me improve this sentence: 'The cat sat on the mat.'",
})
```

#### Current Implementation Example

From your `app/api/plot-summary/route.ts`:

```typescript
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  const { text } = await request.json()
  
  const { text: summary } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are a literary analyst. Create a concise plot summary of the provided text in bullet point format. Focus on:
- Main plot points and story progression
- Key events and turning points
- Character motivations and conflicts
- Overall narrative arc

Format your response as bullet points using • symbols. Keep each bullet point concise (1-2 sentences max).`,
    prompt: `Please provide a bullet-point plot summary for this text: "${text}"`,
  })

  return NextResponse.json({ summary })
}
```

## 🔧 Alternative Implementation Methods

### Method 1: Direct OpenAI API Calls

For more control or when you need specific OpenAI features not available in the AI SDK:

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Chat completion
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: "You are a helpful writing assistant."
    },
    {
      role: "user",
      content: "Write a short story about a robot learning to paint."
    }
  ],
  max_tokens: 500,
  temperature: 0.7,
})

console.log(completion.choices[0].message.content)
```

### Method 2: Using Fetch API

For lightweight implementations without additional dependencies:

```typescript
async function callOpenAI(prompt: string, systemMessage?: string) {
  const messages = []
  
  if (systemMessage) {
    messages.push({ role: "system", content: systemMessage })
  }
  
  messages.push({ role: "user", content: prompt })

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  })

  const data = await response.json()
  return data.choices[0].message.content
}
```

## 📋 API Parameters Reference

### Core Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `model` | string | Model to use | "gpt-4o-mini" |
| `messages` | array | Array of message objects | Required |
| `max_tokens` | integer | Maximum tokens to generate | 4096 |
| `temperature` | float | Randomness (0-2) | 1 |
| `top_p` | float | Nucleus sampling (0-1) | 1 |
| `frequency_penalty` | float | Reduce repetition (-2 to 2) | 0 |
| `presence_penalty` | float | Reduce topic repetition (-2 to 2) | 0 |

### Message Format

```typescript
interface Message {
  role: "system" | "user" | "assistant"
  content: string
  name?: string // Optional name for the message author
}
```

## 🎯 Common Use Cases

### 1. Text Generation

```typescript
// Generate creative content
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  system: "You are a creative writer. Write engaging, vivid prose.",
  prompt: "Describe a sunset over a futuristic city.",
  maxTokens: 200,
  temperature: 0.8,
})
```

### 2. Text Analysis

```typescript
// Analyze text sentiment
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  system: "You are a text analyst. Provide brief, accurate analysis.",
  prompt: `Analyze the mood and tone of this text: "${userText}"`,
  maxTokens: 150,
  temperature: 0.3,
})
```

### 3. Content Summarization

```typescript
// Summarize long text
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  system: "You are a summarization expert. Create concise, accurate summaries.",
  prompt: `Summarize this text in 3 bullet points: "${longText}"`,
  maxTokens: 300,
  temperature: 0.5,
})
```

### 4. Code Generation

```typescript
// Generate code
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  system: "You are a TypeScript expert. Write clean, well-documented code.",
  prompt: "Create a function that validates email addresses in TypeScript.",
  maxTokens: 400,
  temperature: 0.2,
})
```

## 🔒 Error Handling

### Best Practices

```typescript
async function safeOpenAICall(prompt: string) {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    })
    return { success: true, text }
  } catch (error) {
    console.error("OpenAI API error:", error)
    
    if (error.status === 429) {
      return { success: false, error: "Rate limit exceeded. Please try again later." }
    }
    
    if (error.status === 401) {
      return { success: false, error: "Invalid API key. Please check your configuration." }
    }
    
    return { success: false, error: "An unexpected error occurred. Please try again." }
  }
}
```

### Rate Limiting

```typescript
// Implement exponential backoff
async function callWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
      })
      return text
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
}
```

## 💰 Cost Optimization

### Token Management

```typescript
// Estimate token usage
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

// Optimize prompts
function optimizePrompt(userInput: string, maxTokens: number = 1000): string {
  const estimatedTokens = estimateTokens(userInput)
  
  if (estimatedTokens > maxTokens) {
    // Truncate or summarize input
    return userInput.substring(0, maxTokens * 4) + "..."
  }
  
  return userInput
}
```

### Caching Responses

```typescript
// Simple in-memory cache
const responseCache = new Map()

async function cachedOpenAICall(prompt: string) {
  const cacheKey = prompt.toLowerCase().trim()
  
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey)
  }
  
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
  })
  
  responseCache.set(cacheKey, text)
  return text
}
```

## 🧪 Testing

### Unit Tests

```typescript
// Mock OpenAI responses for testing
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({
    text: "Mocked response from OpenAI"
  })
}))

// Test your OpenAI integration
describe('OpenAI Integration', () => {
  it('should generate plot summary', async () => {
    const mockText = "Once upon a time, there was a brave knight..."
    const response = await generatePlotSummary(mockText)
    
    expect(response).toContain("Mocked response")
  })
})
```

### Integration Tests

```typescript
// Test with real API (use sparingly)
describe('OpenAI Integration (Real)', () => {
  it('should call OpenAI API', async () => {
    const response = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: "Say hello",
    })
    
    expect(response.text).toBeDefined()
    expect(response.text.length).toBeGreaterThan(0)
  })
})
```

## 🔧 Advanced Features

### Streaming Responses

```typescript
import { streamText } from "ai"

// Stream text generation
const { textStream } = await streamText({
  model: openai("gpt-4o-mini"),
  prompt: "Write a story about space exploration.",
})

for await (const chunk of textStream) {
  console.log(chunk) // Process each chunk as it arrives
}
```

### Function Calling

```typescript
// Define functions for structured output
const { text, toolResults } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "What's the weather like in New York?",
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get current weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name"
            }
          },
          required: ["location"]
        }
      }
    }
  ]
})
```

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [GPT-4o-mini Model Card](https://platform.openai.com/docs/models/gpt-4o-mini)
- [OpenAI Pricing](https://openai.com/pricing)

## 🚨 Security Considerations

1. **Never expose API keys in client-side code**
2. **Implement proper rate limiting**
3. **Validate and sanitize user inputs**
4. **Use environment variables for configuration**
5. **Monitor API usage and costs**
6. **Implement proper error handling**

## 📝 Best Practices

1. **Use system messages** to define AI behavior
2. **Implement proper error handling** for all API calls
3. **Cache responses** when appropriate
4. **Monitor token usage** to control costs
5. **Test thoroughly** with both mocked and real API calls
6. **Document your prompts** for consistency
7. **Use appropriate temperature** settings for different tasks
8. **Implement retry logic** for transient failures 