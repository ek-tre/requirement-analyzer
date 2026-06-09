# Design Task Manager

A comprehensive React application for managing design and requirement analysis tasks with structured workflows, AI-powered insights, and flexible security controls.

## Features

### Core Functionality
- 📝 **Structured Analysis Workflow** - Multi-section requirement analysis (Overview, Problem, Users, Assumptions, Edge Cases, Scope, Questions, Summary)
- 🎯 **Multi-Task Management** - Work on multiple analyses simultaneously with organized sidebar navigation
- 💾 **Auto-save** - Changes persist automatically to browser localStorage
- 🛡️ **Per-Task Security Mode** - Choose between secure (local-only, encrypted) or standard mode for each task
- 🌍 **Per-Task Language** - Choose task language (English, Danish, Swedish) for section titles and field labels
- 📊 **Progress Tracking** - Monitor completion status across all sections

### AI-Powered Analysis (Standard Mode)
- 🎤 **Audio Analysis** - Record meetings and automatically extract requirements, problem statements, and action items
- 📋 **Text Analysis** - Paste content from Jira, emails, or documents and AI extracts structured fields
- 📄 **PDF Analysis** - Upload PDF documents for automatic text extraction and AI-powered analysis
- 🤖 **Powered by Azure OpenAI** (GPT-4o via GitHub Models API)

### Collaboration & Sync
- 🔗 **Share Active Task** - Generate URL links to share task copies with colleagues
- ☁️ **GitHub Gist Sync** - Cloud backup and restore of individual tasks via private GitHub gists
- 🎨 **Figma/FigJam Embedding** - Display design boards directly in the Mapping tab

### Export & Import
- 📤 **Export Formats** - Markdown and JSON export options
- 📥 **Import Markdown** - Bring in existing documentation

### Security & Privacy
- 🔒 **AES-256-GCM Encryption** - Automatic encryption when secure tasks exist (PBKDF2 key derivation, 100k iterations)
- 🛡️ **Conditional Features** - AI and cloud sync automatically hidden for secure tasks
- 🔐 **SSO Protected Deployment** - Access is controlled by Vercel SSO/deployment protection
- 🏢 **Approved Services** - Uses only organizationally approved platforms (GitHub, Microsoft Copilot infrastructure, Figma)

## Collaboration

### Share Active Task (Quick Sharing)
1. Click **"Share active task"** in the sidebar Sync section
2. Get a shareable URL with your task data encoded
3. Send to colleagues via Slack, email, etc.
4. They import it as an independent copy to edit

**Note:** Shared tasks are independent copies - changes don't sync automatically.

### GitHub Gist Sync (Cloud Backup)
1. Click **"GitHub Sync"** to expand options
2. [Create a GitHub token](https://github.com/settings/tokens/new?description=Design%20Task%20Manager&scopes=gist) with `gist` scope
3. **Save to Gist** - Backs up your active task to GitHub (private gist)
4. Share the Gist ID with colleagues to let them import your task
5. **Load from Gist** - Restore a task from any Gist ID

**Note:** Each save/load creates an independent snapshot. For real-time collaboration, consider Firebase/Supabase integration (architecture supports this).

### Secure Mode
Enable secure mode for sensitive analyses:
- ✅ No external API calls (no AI, no GitHub sync)
- ✅ Data encrypted in localStorage
- ✅ Green shield badge 🛡️ for easy identification
- ✅ Only local features available

### Language Selection
Choose your preferred language per task:
- **English** - Default language
- **Danish (Dansk)** - Danish section titles and field labels
- **Swedish (Svenska)** - Swedish section titles and field labels

The language selector is in the Overview section. Each task can have its own language while the general site interface stays in English. This is perfect for multinational teams or documentation requirements.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Quick Start

### Creating Your First Task
1. Click **"+ New design task"** in the sidebar
2. Toggle **Secure Mode** in Overview section if handling sensitive data
3. Fill in sections: Problem, Users, Assumptions, Edge Cases, Scope, Questions, Summary
4. Use **AI Analysis** (standard mode) or **Audio Recording** for automated field extraction
5. Embed Figma boards in the **Mapping** tab
6. Track progress - green checkmarks show completed sections

### Using AI Features (Standard Mode Only)
- **Audio Analysis**: Click microphone icon, speak your requirements, stop recording → AI extracts structured data
- **Text Analysis**: Click "Paste & Analyze", paste text from tickets/emails → AI populates fields with suggestions (click ✓ to accept or ✗ to delete)

### Managing Tasks
- Switch between tasks via sidebar (shows 🛡️ badge for secure tasks)
- Rename by clicking task name
- Delete via "Delete this analysis" button (bottom of page)
- Changes auto-save to localStorage

## Technology Stack

- **React 18** - UI framework
- **Vite 5** - Build tool and dev server
- **Tailwind CSS 3** - Utility-first styling
- **Web Crypto API** - AES-256-GCM encryption
- **Azure OpenAI** - GPT-4o via GitHub Models API
- **GitHub Gist API** - Cloud backup/sync
- **Web Speech API** - Browser-native speech recognition

## Security

See **[SECURITY_REVIEW.md](SECURITY_REVIEW.md)** for comprehensive security assessment including:
- Per-task security architecture
- Encryption implementation details
- External service usage (all organizationally approved)
- Compliance considerations
- Deployment recommendations

See **[SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md)** for technical implementation details of the security model.

## Documentation

- **[Security Review](SECURITY_REVIEW.md)** - Complete security assessment for telco/enterprise deployment
- **[Security Implementation](SECURITY_IMPLEMENTATION.md)** - Technical security architecture details
- **[Analysis Guidelines](ANALYSIS_GUIDELINES.md)** - Best practices for analyzing requirements
- **[UI Guidelines](UI_GUIDELINES.md)** - Design system and development standards

## Deployment

Deploy to Vercel:

```bash
npm run deploy
```

Preview deployment:

```bash
npm run deploy:preview
```

Project: https://vercel.com/hi3g/discovery-and-design-planning

