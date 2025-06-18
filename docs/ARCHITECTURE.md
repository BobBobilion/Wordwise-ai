# Architecture Documentation

## Overview

Broberlly-Good is a modern web application built with Next.js 15, React 18, and TypeScript. It follows a component-based architecture with clear separation of concerns, using Firebase as the backend and OpenAI for AI-powered features.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (Firebase)    │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
│                      │                      │
├─ React Components    ├─ Authentication      ├─ OpenAI API
├─ TypeScript          ├─ Firestore DB        ├─ Google Books API
├─ Tailwind CSS        ├─ Real-time Updates   └─ Email Service
└─ Context API         └─ File Storage
```

## 📁 Directory Structure

### `/app` - Next.js App Router
```
app/
├── api/                    # API Routes
│   └── plot-summary/       # AI plot analysis endpoint
├── dashboard/              # Document management page
├── editor/                 # Rich text editor
│   └── [id]/              # Dynamic document editing
├── login/                  # Authentication pages
├── signup/
├── verify-email/
├── globals.css            # Global styles
├── layout.tsx             # Root layout
└── page.tsx               # Landing page
```

**Purpose**: Contains all page components and API routes using Next.js 13+ App Router pattern.

### `/components` - Reusable UI Components
```
components/
├── ui/                    # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ... (40+ components)
├── sidebar/               # Writing assistant sidebar
│   ├── writing-sidebar.tsx
│   ├── writing-overview.tsx
│   ├── writing-suggestions.tsx
│   ├── character-notebook.tsx
│   └── plot-summary.tsx
├── auth-guard.tsx         # Authentication wrapper
├── rich-text-editor.tsx   # Main text editor
└── theme-provider.tsx     # Theme context
```

**Purpose**: Modular, reusable components following the single responsibility principle.

### `/contexts` - React Context Providers
```
contexts/
└── auth-context.tsx       # Authentication state management
```

**Purpose**: Global state management using React Context API for cross-component data sharing.

### `/hooks` - Custom React Hooks
```
hooks/
├── use-debounce.ts        # Debounce utility hook
├── use-mobile.tsx         # Mobile detection hook
└── use-toast.ts           # Toast notification hook
```

**Purpose**: Reusable logic extraction and custom hook patterns.

### `/lib` - Utility Functions & Configurations
```
lib/
├── firebase.ts            # Firebase configuration
├── firestore.ts           # Firestore database operations
├── grammar-checker.ts     # Grammar checking logic
├── types.ts               # TypeScript type definitions
└── utils.ts               # Utility functions
```

**Purpose**: Core business logic, configurations, and type definitions.

## 🔄 Data Flow

### 1. Authentication Flow
```
User Input → Auth Context → Firebase Auth → User State → Protected Routes
```

**Components Involved**:
- `AuthGuard` - Route protection
- `AuthContext` - State management
- `login/page.tsx` & `signup/page.tsx` - User input
- `lib/firebase.ts` - Firebase configuration

### 2. Document Management Flow
```
Dashboard → Firestore → Document List → Editor → Auto-save → Firestore
```

**Components Involved**:
- `dashboard/page.tsx` - Document listing
- `editor/[id]/page.tsx` - Document editing
- `lib/firestore.ts` - Database operations
- `RichTextEditor` - Text editing interface

### 3. AI Features Flow
```
Text Input → Grammar Checker → OpenAI API → Suggestions → UI Display
```

**Components Involved**:
- `RichTextEditor` - Text input
- `lib/grammar-checker.ts` - Grammar analysis
- `app/api/plot-summary/route.ts` - AI endpoint
- `WritingSidebar` - Feature display

## 🧩 Component Architecture

### Core Components

#### 1. RichTextEditor (`components/rich-text-editor.tsx`)
**Purpose**: Main text editing interface with AI integration

**Key Features**:
- ContentEditable div for rich text editing
- Toolbar with formatting options
- Grammar checking integration
- Auto-save functionality
- Font selection

**Props**:
```typescript
interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onTitleChange: (title: string) => void
  title: string
  onSuggestionsChange?: (suggestions: GrammarSuggestion[]) => void
}
```

#### 2. WritingSidebar (`components/sidebar/writing-sidebar.tsx`)
**Purpose**: AI-powered writing assistance panel

**Features**:
- Tab-based navigation
- Writing overview with statistics
- Grammar suggestions
- Character tracking
- Plot analysis

**Tab Structure**:
- **Overview**: Word count, mood analysis, genre detection
- **Suggestions**: Grammar and style corrections
- **Characters**: Character detection and management
- **Plot**: AI-generated plot summaries

#### 3. AuthGuard (`components/auth-guard.tsx`)
**Purpose**: Route protection and authentication state management

**Functionality**:
- Redirects unauthenticated users to login
- Handles email verification requirements
- Loading states during authentication checks

### Sidebar Components

#### WritingOverview (`components/sidebar/writing-overview.tsx`)
**Purpose**: Real-time writing statistics and analysis

**Features**:
- Word count calculation
- Mood detection using keyword analysis
- Genre classification
- Reading time estimation

#### CharacterNotebook (`components/sidebar/character-notebook.tsx`)
**Purpose**: Character detection and tracking

**Features**:
- Automatic character name detection
- Character mention counting
- Basic character role classification
- Placeholder for future character details

#### PlotSummary (`components/sidebar/plot-summary.tsx`)
**Purpose**: AI-powered plot analysis

**Features**:
- OpenAI GPT-4o-mini integration
- Automatic plot summary generation
- Bullet-point formatting
- Auto-refresh on content changes

## 🔐 Authentication Architecture

### Firebase Authentication
- **Provider**: Email/Password authentication
- **Security**: Email verification required
- **State Management**: React Context API
- **Route Protection**: AuthGuard component

### User Flow
1. **Registration**: Email/password signup
2. **Verification**: Email verification required
3. **Login**: Authenticated access to dashboard
4. **Session Management**: Automatic session persistence

## 🗄️ Database Architecture

### Firestore Collections

#### `documents`
```typescript
interface Document {
  id: string
  title: string
  content: string
  userId: string
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `userId` (for user-specific queries)
- `updatedAt` (for sorting by modification date)

### Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{documentId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 🤖 AI Integration

### OpenAI Integration
- **Model**: GPT-4o-mini
- **Endpoint**: `/api/plot-summary`
- **Purpose**: Plot analysis and story summarization
- **Rate Limiting**: Built-in Next.js API route protection

### Grammar Checking
- **Implementation**: Local rule-based system
- **Features**: Spelling correction, grammar rules, style suggestions
- **Integration**: Real-time checking with debouncing

## 🎨 Styling Architecture

### Design System
- **Framework**: Tailwind CSS
- **Components**: shadcn/ui component library
- **Theme**: Custom color scheme with dark mode support
- **Responsive**: Mobile-first design approach

### CSS Architecture
```
styles/
├── globals.css           # Global styles and CSS variables
└── tailwind.config.ts    # Tailwind configuration
```

## 🔧 Development Patterns

### 1. TypeScript Usage
- **Strict Mode**: Enabled for better type safety
- **Interfaces**: Preferred over types for object definitions
- **Generic Types**: Used for reusable components
- **Type Guards**: Implemented for runtime type checking

### 2. State Management
- **Local State**: useState for component-specific state
- **Global State**: Context API for cross-component data
- **Server State**: Direct Firebase integration
- **Form State**: React Hook Form with Zod validation

### 3. Error Handling
- **Try-Catch**: Comprehensive error boundaries
- **User Feedback**: Toast notifications for errors
- **Graceful Degradation**: Fallback UI for failed features
- **Logging**: Console logging for debugging

### 4. Performance Optimization
- **Debouncing**: Input and API call debouncing
- **Memoization**: React.memo and useMemo for expensive operations
- **Lazy Loading**: Dynamic imports for code splitting
- **Image Optimization**: Next.js built-in image optimization

## 🚀 Deployment Architecture

### Build Process
1. **TypeScript Compilation**: Strict type checking
2. **Next.js Build**: Static and server-side generation
3. **Asset Optimization**: CSS and JavaScript bundling
4. **Environment Configuration**: Production environment setup

### Hosting
- **Platform**: Firebase Hosting
- **CDN**: Global content delivery network
- **HTTPS**: Automatic SSL certificate management
- **Custom Domain**: Support for custom domain configuration

## 🔍 Testing Strategy

### Test Types
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API route and database testing
- **E2E Tests**: User flow and interaction testing
- **Performance Tests**: Load and stress testing

### Testing Tools
- **Jest**: Unit and integration testing
- **React Testing Library**: Component testing
- **Playwright**: End-to-end testing
- **Lighthouse**: Performance testing

## 📊 Monitoring & Analytics

### Performance Monitoring
- **Core Web Vitals**: LCP, FID, CLS tracking
- **Error Tracking**: Sentry integration for error monitoring
- **User Analytics**: Anonymous usage statistics
- **Performance Metrics**: Real-time performance monitoring

## 🔮 Future Architecture Considerations

### Scalability
- **Microservices**: Potential migration to microservices architecture
- **Caching**: Redis integration for improved performance
- **CDN**: Advanced content delivery optimization
- **Database**: Potential migration to more scalable database solutions

### Feature Extensions
- **Real-time Collaboration**: WebSocket integration for live editing
- **Version Control**: Document versioning and history
- **Advanced AI**: More sophisticated AI features and integrations
- **Mobile App**: React Native mobile application

---

This architecture documentation provides a comprehensive overview of the Broberlly-Good application structure, helping developers understand the codebase organization, data flow, and development patterns. 