# Component Documentation

## Overview

This document provides detailed information about each component in the Broberlly-Good application, including their purpose, props, usage examples, and implementation details.

## 🧩 Core Components

### RichTextEditor

**Location**: `components/rich-text-editor.tsx`

**Purpose**: Main text editing interface with AI-powered grammar checking and rich text formatting.

**Key Features**:
- ContentEditable div for rich text editing
- Toolbar with formatting options (bold, italic, underline, alignment)
- Font selection (serif, sans-serif, monospace)
- Grammar checking with inline suggestions
- Auto-save functionality
- Word count tracking

**Props**:
```typescript
interface RichTextEditorProps {
  content: string                    // Current document content
  onChange: (content: string) => void // Content change handler
  onTitleChange: (title: string) => void // Title change handler
  title: string                     // Document title
  onSuggestionsChange?: (suggestions: GrammarSuggestion[]) => void // Grammar suggestions
}
```

**Usage Example**:
```tsx
<RichTextEditor
  content={document.content}
  onChange={handleContentChange}
  title={document.title}
  onTitleChange={handleTitleChange}
  onSuggestionsChange={setSuggestions}
/>
```

**Key Methods**:
- `handleInput()`: Processes content changes
- `execCommand()`: Executes formatting commands
- `handleGrammarCheck()`: Triggers grammar analysis
- `applySuggestion()`: Applies grammar suggestions

### AuthGuard

**Location**: `components/auth-guard.tsx`

**Purpose**: Route protection component that ensures users are authenticated and verified.

**Features**:
- Redirects unauthenticated users to login
- Handles email verification requirements
- Loading states during authentication checks
- Automatic session management

**Props**:
```typescript
interface AuthGuardProps {
  children: React.ReactNode        // Protected content
  requireVerification?: boolean    // Whether email verification is required
}
```

**Usage Example**:
```tsx
<AuthGuard requireVerification>
  <Dashboard />
</AuthGuard>
```

**Behavior**:
- Shows loading spinner while checking authentication
- Redirects to `/login` if not authenticated
- Redirects to `/verify-email` if email not verified
- Renders children if authentication passes

## 📊 Sidebar Components

### WritingSidebar

**Location**: `components/sidebar/writing-sidebar.tsx`

**Purpose**: Main sidebar container with tab-based navigation for writing assistance features.

**Features**:
- Tab-based navigation between features
- Responsive design
- Scrollable content areas
- Active tab highlighting

**Props**:
```typescript
interface WritingSidebarProps {
  content: string                                    // Document content
  suggestions: GrammarSuggestion[]                   // Grammar suggestions
  onApplySuggestion: (suggestion: GrammarSuggestion) => void
  onDismissSuggestion: (suggestion: GrammarSuggestion) => void
}
```

**Tab Structure**:
1. **Writing Overview**: Statistics and analysis
2. **Writing Suggestions**: Grammar corrections
3. **Characters Notebook**: Character tracking
4. **Plot Summary**: AI-generated plot analysis

**Usage Example**:
```tsx
<WritingSidebar
  content={document.content}
  suggestions={grammarSuggestions}
  onApplySuggestion={handleApplySuggestion}
  onDismissSuggestion={handleDismissSuggestion}
/>
```

### WritingOverview

**Location**: `components/sidebar/writing-overview.tsx`

**Purpose**: Real-time writing statistics and analysis panel.

**Features**:
- Word count calculation
- Mood detection using keyword analysis
- Genre classification
- Reading time estimation
- Visual mood indicators

**Props**:
```typescript
interface WritingOverviewProps {
  content: string    // Document content to analyze
}
```

**Analysis Features**:
- **Word Count**: Real-time word counting
- **Mood Detection**: Analyzes text for emotional tone
- **Genre Classification**: Identifies likely genre based on keywords
- **Reading Time**: Estimates reading time (200 words/minute)

**Mood Keywords**:
```typescript
const moodKeywords = {
  happy: ["happy", "joy", "excited", "wonderful", "amazing"],
  sad: ["sad", "cry", "tears", "sorrow", "grief"],
  angry: ["angry", "mad", "furious", "rage", "hate"],
  mysterious: ["mystery", "secret", "hidden", "unknown"],
  romantic: ["love", "romance", "heart", "kiss", "passion"],
  adventurous: ["adventure", "journey", "quest", "explore"]
}
```

### WritingSuggestions

**Location**: `components/sidebar/writing-suggestions.tsx`

**Purpose**: Displays and manages grammar and style suggestions.

**Features**:
- Lists all grammar suggestions
- Apply/dismiss individual suggestions
- Suggestion categorization (spelling, grammar, style)
- Visual feedback for suggestion types

**Props**:
```typescript
interface WritingSuggestionsProps {
  suggestions: GrammarSuggestion[]
  onApplySuggestion: (suggestion: GrammarSuggestion) => void
  onDismissSuggestion: (suggestion: GrammarSuggestion) => void
}
```

**Suggestion Types**:
- **Spelling**: Common misspellings and corrections
- **Grammar**: Grammar rule violations
- **Style**: Writing style improvements

### CharacterNotebook

**Location**: `components/sidebar/character-notebook.tsx`

**Purpose**: Character detection and tracking interface.

**Features**:
- Automatic character name detection
- Character mention counting
- Basic character role classification
- Character appearance tracking

**Props**:
```typescript
interface CharacterNotebookProps {
  content: string    // Document content to analyze
}
```

**Character Detection Logic**:
```typescript
// Detects capitalized words that appear multiple times
const capitalizedWords = words.filter(
  (word) =>
    /^[A-Z][a-z]+$/.test(word) &&
    word.length > 2 &&
    !commonWords.includes(word)
)
```

**Character Classification**:
- **Main Character**: 5+ mentions
- **Supporting Character**: 2-4 mentions
- **Minor Character**: 1 mention

### PlotSummary

**Location**: `components/sidebar/plot-summary.tsx`

**Purpose**: AI-powered plot analysis and summarization.

**Features**:
- OpenAI GPT-4o-mini integration
- Automatic plot summary generation
- Bullet-point formatting
- Auto-refresh on content changes
- Loading and error states

**Props**:
```typescript
interface PlotSummaryProps {
  content: string    // Document content to analyze
}
```

**API Integration**:
- **Endpoint**: `/api/plot-summary`
- **Model**: GPT-4o-mini
- **Auto-trigger**: After 3 seconds of no changes
- **Minimum content**: 100 words required

**Summary Format**:
- Bullet-point structure
- Focus on main plot points
- Character motivations
- Story progression
- Narrative arc analysis

## 🔐 Authentication Components

### AuthContext

**Location**: `contexts/auth-context.tsx`

**Purpose**: Global authentication state management using React Context.

**Features**:
- User authentication state
- Login/logout functionality
- Email verification handling
- Session persistence
- Loading states

**Context Value**:
```typescript
interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  sendVerificationEmail: () => Promise<void>
}
```

**Usage Example**:
```tsx
const { user, signIn, logout } = useAuth()

// Login
await signIn(email, password)

// Logout
await logout()
```

## 🎨 UI Components

### Base UI Components

**Location**: `components/ui/`

**Purpose**: Reusable UI components built with shadcn/ui and Radix UI.

**Available Components**:
- `Button`: Various button styles and variants
- `Input`: Form input fields
- `Dialog`: Modal dialogs
- `Toast`: Notification system
- `Card`: Content containers
- `Badge`: Status indicators
- `Avatar`: User profile images
- `Dropdown`: Context menus
- `Tabs`: Tab navigation
- `Accordion`: Collapsible content
- `Form`: Form components with validation
- `Select`: Dropdown selections
- `Textarea`: Multi-line text input
- `Switch`: Toggle switches
- `Slider`: Range inputs
- `Progress`: Progress indicators
- `Skeleton`: Loading placeholders

**Usage Pattern**:
```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

<Button variant="default" size="sm">
  Click me
</Button>

<Input placeholder="Enter text..." />
```

## 🪝 Custom Hooks

### useDebounce

**Location**: `hooks/use-debounce.ts`

**Purpose**: Debounces values to prevent excessive function calls.

**Usage**:
```tsx
const debouncedValue = useDebounce(value, 1000)
```

### useToast

**Location**: `hooks/use-toast.ts`

**Purpose**: Toast notification system for user feedback.

**Usage**:
```tsx
const { toast } = useToast()

toast({
  title: "Success",
  description: "Operation completed successfully",
  variant: "default"
})
```

### useMobile

**Location**: `hooks/use-mobile.tsx`

**Purpose**: Detects mobile devices for responsive behavior.

**Usage**:
```tsx
const isMobile = useMobile()
```

## 📄 Page Components

### Dashboard Page

**Location**: `app/dashboard/page.tsx`

**Purpose**: Document management and overview page.

**Features**:
- Document listing with metadata
- Create new document functionality
- Document search and filtering
- User authentication status
- Logout functionality

**Key Functions**:
- `loadDocuments()`: Fetches user documents
- `handleCreateDocument()`: Creates new document
- `handleLogout()`: User logout

### Editor Page

**Location**: `app/editor/[id]/page.tsx`

**Purpose**: Main document editing interface.

**Features**:
- Rich text editor integration
- Auto-save functionality
- Document title editing
- Grammar suggestions
- Writing sidebar
- Navigation controls

**Key Functions**:
- `loadDocument()`: Loads document data
- `saveDocument()`: Saves document changes
- `handleContentChange()`: Processes content updates

### Authentication Pages

**Login Page** (`app/login/page.tsx`):
- Email/password login form
- Error handling
- Navigation to signup
- Loading states

**Signup Page** (`app/signup/page.tsx`):
- Email/password registration
- Password confirmation
- Email verification flow
- Form validation

**Verify Email Page** (`app/verify-email/page.tsx`):
- Email verification status
- Resend verification email
- Logout functionality

## 🔧 Utility Components

### ThemeProvider

**Location**: `components/theme-provider.tsx`

**Purpose**: Theme management with dark/light mode support.

**Features**:
- Theme switching
- System theme detection
- Persistent theme storage
- CSS variable management

## 📊 Data Flow Components

### API Routes

**Plot Summary API** (`app/api/plot-summary/route.ts`):
- OpenAI GPT-4o-mini integration
- Text analysis and summarization
- Error handling and validation
- Rate limiting protection

**Features**:
- POST endpoint for text analysis
- Input validation (minimum 100 words)
- OpenAI API integration
- Structured response format

## 🎯 Component Best Practices

### 1. Props Interface
Always define TypeScript interfaces for component props:
```typescript
interface ComponentProps {
  required: string
  optional?: number
  children?: React.ReactNode
}
```

### 2. Error Boundaries
Implement error boundaries for critical components:
```typescript
class ErrorBoundary extends React.Component {
  // Error handling logic
}
```

### 3. Loading States
Provide loading states for async operations:
```typescript
{loading ? <Spinner /> : <Content />}
```

### 4. Accessibility
Include proper ARIA labels and keyboard navigation:
```typescript
<button aria-label="Save document" onKeyDown={handleKeyDown}>
  Save
</button>
```

### 5. Performance Optimization
Use React.memo for expensive components:
```typescript
export const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
})
```

## 🔄 Component Communication

### Parent-Child Communication
- Props for data passing
- Callback functions for events
- Context for global state

### Sibling Communication
- Shared parent state
- Context API
- Event emitters

### Cross-Component Communication
- Context API for global state
- Custom hooks for shared logic
- Event system for loose coupling

---

This component documentation provides a comprehensive guide to understanding and working with the Broberlly-Good component architecture. 