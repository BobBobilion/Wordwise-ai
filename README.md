# Broberlly-Good - AI-Powered Writing Assistant

A modern, AI-enhanced writing platform that helps authors create, edit, and improve their documents with intelligent grammar checking, plot analysis, and character tracking.

## 🚀 Features

### ✍️ Rich Text Editor
- **Real-time editing** with autosave functionality
- **Rich text formatting** (bold, italic, underline, alignment)
- **Word count tracking** and reading time estimates
- **Multiple font options** (serif, sans-serif, monospace)

### 🤖 AI-Powered Writing Assistance
- **Grammar & Style Correction**: Inline suggestions for grammar, spelling, and style improvements
- **Mood Analysis**: Automatic detection of text mood and tone
- **Plot Analysis**: AI-generated plot summaries and story progression analysis
- **Character Detection**: Automatic identification and tracking of characters in your text

### 📊 Writing Overview Dashboard
- **Document Management**: Create, edit, and organize your writing projects
- **Writing Statistics**: Word count, reading time, and genre detection
- **Progress Tracking**: Visual indicators of writing progress

### 🔐 User Authentication
- **Secure Authentication**: Email/password registration and login
- **Email Verification**: Required email verification for account security
- **User-specific Documents**: Private document storage per user

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Backend**: Firebase (Authentication, Firestore)
- **AI Integration**: OpenAI GPT-4o-mini for plot analysis
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation

## 📁 Project Structure

```
Broberlly-Good/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Document dashboard
│   ├── editor/           # Rich text editor
│   ├── login/            # Authentication pages
│   └── signup/
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (shadcn/ui)
│   └── sidebar/          # Writing assistant sidebar
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and configurations
└── styles/               # Global styles
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Firebase project with Authentication and Firestore enabled
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Broberlly-Good.git
   cd Broberlly-Good
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### 1. Getting Started
1. **Sign Up**: Create a new account with email verification
2. **Verify Email**: Check your inbox and click the verification link
3. **Access Dashboard**: View and manage your documents

### 2. Creating Documents
1. **New Document**: Click "New Document" on the dashboard
2. **Start Writing**: Use the rich text editor to write your content
3. **Auto-save**: Your work is automatically saved as you type

### 3. Using AI Features
1. **Grammar Check**: Enable auto-check or manually check grammar
2. **Plot Analysis**: View AI-generated plot summaries in the sidebar
3. **Character Tracking**: Monitor detected characters in your text
4. **Writing Overview**: Get insights about mood, genre, and statistics

### 4. Document Management
- **Dashboard**: View all your documents with metadata
- **Editor**: Full-featured writing environment with AI assistance
- **Organization**: Documents are sorted by last modified date

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Conventional commits for version control

## 🧪 Testing

The application includes:
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API route testing
- **E2E Tests**: User flow testing

Run tests with:
```bash
npm test
```

## 🚀 Deployment

### Firebase Hosting
1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

### Environment Setup
- Configure Firebase project settings
- Set up production environment variables
- Enable HTTPS and CDN

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: See [docs/](docs/) for detailed documentation
- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/yourusername/Broberlly-Good/issues)
- **Discussions**: Join the community on [GitHub Discussions](https://github.com/yourusername/Broberlly-Good/discussions)

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Project setup and authentication
- [x] Basic document management
- [x] Rich text editor

### Phase 2: AI Enhancement 🚧
- [x] Grammar checking
- [x] Plot analysis
- [ ] Advanced character management
- [ ] Pacing analysis

### Phase 3: Advanced Features 📋
- [ ] File upload support
- [ ] Export functionality
- [ ] Search and sort features
- [ ] Google Books integration

### Phase 4: Polish & Deploy 📋
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Production deployment
- [ ] User testing

---

**Built with ❤️ using Next.js, Firebase, and OpenAI** 