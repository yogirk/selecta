# Selecta Frontend

Modern AI Analytics Platform built with Next.js 14, TypeScript, and Shadcn UI.

## Features

- ✨ Real-time chat interface with streaming responses
- 📊 Interactive data visualizations using Vega-Lite
- 🔄 Session management with persistent state
- 🎨 Beautiful dark mode UI with Tailwind CSS
- 🚀 Server-Sent Events (SSE) for live updates
- 📱 Responsive 3-column layout

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.local.example .env.local
   # Edit .env.local with your backend URL
   \`\`\`

3. Run development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000)

## Backend Setup

This frontend requires the Selecta ADK backend running at port 8080.

\`\`\`bash
cd ../backend
uv run adk api_server app --allow_origins "*" --port 8080
\`\`\`

## Project Structure

\`\`\`
src/
├── app/                  # Next.js 14 app directory
├── components/           # React components
│   ├── chat/            # Chat interface
│   ├── sessions/        # Session management
│   ├── results/         # Results visualization
│   └── layout/          # Layout components
├── lib/                 # Utilities and API client
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
└── config/              # Configuration
\`\`\`

## Technologies

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand
- **Charts**: Vega-Lite + React-Vega
- **Icons**: Lucide React

## Environment Variables

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=app
\`\`\`

## Development

\`\`\`bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
\`\`\`

## License

MIT
