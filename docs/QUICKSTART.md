# Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you set up and run Broberlly-Good locally for development.

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Firebase Account** ([Sign up](https://firebase.google.com/))
- **OpenAI API Key** ([Get one](https://platform.openai.com/api-keys))

## 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Broberlly-Good.git
cd Broberlly-Good
```

## 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

## 3. Set Up Firebase

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Follow the setup wizard

2. **Enable Authentication**:
   - In Firebase Console, go to "Authentication"
   - Click "Get started"
   - Enable "Email/Password" provider

3. **Set Up Firestore**:
   - Go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in test mode" for development

4. **Get Firebase Config**:
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps"
   - Click "Add app" → "Web"
   - Copy the config object

## 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 6. Test the Application

1. **Sign Up**: Create a new account
2. **Verify Email**: Check your inbox and click the verification link
3. **Create Document**: Click "New Document" on the dashboard
4. **Start Writing**: Use the rich text editor
5. **Test AI Features**: Check the sidebar for grammar suggestions and plot analysis

## 🛠️ Development Workflow

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing (when implemented)
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run end-to-end tests
```

### Code Structure

```
app/                 # Next.js pages and API routes
├── api/            # Backend API endpoints
├── dashboard/      # Document management
├── editor/         # Rich text editor
└── auth/           # Authentication pages

components/          # Reusable UI components
├── ui/             # Base components (shadcn/ui)
└── sidebar/        # Writing assistant sidebar

lib/                # Utilities and configurations
├── firebase.ts     # Firebase setup
├── firestore.ts    # Database operations
└── types.ts        # TypeScript definitions
```

### Key Files to Know

- **`app/layout.tsx`**: Root layout and providers
- **`components/rich-text-editor.tsx`**: Main text editor
- **`components/sidebar/writing-sidebar.tsx`**: AI features sidebar
- **`contexts/auth-context.tsx`**: Authentication state
- **`lib/firestore.ts`**: Database operations

## 🔧 Common Development Tasks

### Adding a New Component

1. Create the component file:
```tsx
// components/my-component.tsx
interface MyComponentProps {
  title: string
}

export function MyComponent({ title }: MyComponentProps) {
  return <div>{title}</div>
}
```

2. Import and use it:
```tsx
import { MyComponent } from "@/components/my-component"

<MyComponent title="Hello World" />
```

### Adding a New API Route

1. Create the API file:
```typescript
// app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const data = await request.json()
  return NextResponse.json({ message: "Success" })
}
```

### Adding a New Page

1. Create the page file:
```tsx
// app/my-page/page.tsx
export default function MyPage() {
  return <div>My New Page</div>
}
```

## 🐛 Troubleshooting

### Common Issues

**Firebase Connection Error**:
- Check your Firebase config in `.env.local`
- Ensure Firestore is enabled
- Verify authentication is set up

**OpenAI API Error**:
- Check your API key in `.env.local`
- Ensure you have credits in your OpenAI account
- Verify the API key has the correct permissions

**Build Errors**:
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `npm install`
- Check TypeScript errors: `npm run lint`

**Authentication Issues**:
- Check Firebase authentication settings
- Verify email verification is working
- Check browser console for errors

### Getting Help

1. **Check the Documentation**:
   - [Architecture Guide](ARCHITECTURE.md)
   - [Component Documentation](COMPONENTS.md)

2. **Search Issues**: Look for similar issues in the GitHub repository

3. **Create an Issue**: If you can't find a solution, create a new issue with:
   - Description of the problem
   - Steps to reproduce
   - Error messages
   - Environment details

## 🚀 Next Steps

Once you're comfortable with the codebase:

1. **Read the Documentation**:
   - [Architecture Guide](ARCHITECTURE.md)
   - [Component Documentation](COMPONENTS.md)

2. **Explore the Code**:
   - Start with the main components
   - Understand the data flow
   - Check out the AI integration

3. **Make Changes**:
   - Add new features
   - Improve existing functionality
   - Fix bugs

4. **Contribute**:
   - Fork the repository
   - Create a feature branch
   - Submit a pull request

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

Happy coding! 🎉 