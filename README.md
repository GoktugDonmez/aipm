# Memoria

Transform AI conversations and notes into organized, visual, and searchable knowledge that enhances productivity.

## Features

- **Import & Index**: One-click export from ChatGPT and other chatbots into a local-first database
- **Search & Retrieval**: Performant hybrid search with source-grounded results
- **Auto-Tagging**: AI-powered automatic tagging with manual editing capability
- **Visual Navigation**: Graph and timeline views with interactive layouts and in-graph conversation previews
- **AI Roadmap Explorer**: Query-driven knowledge roadmap generation using Gemini File Search API
- **Privacy-First**: Local-first architecture with transparent data controls

## Tech Stack

### Frontend
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Radix UI Themes
- **Routing**: React Router v6
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Local Storage**: Dexie (IndexedDB wrapper)
- **Visualization**: D3 + Visx
- **Icons**: Lucide React

### Backend (for Roadmap feature)
- **Server**: Node.js + Express + TypeScript
- **AI**: Google Gemini 1.5 Pro API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- (Optional) OpenAI API key for auto-tagging
- (Optional) Google Gemini API key for roadmap feature

### Frontend Installation

```bash
# Install frontend dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys (optional)
```

### Backend Setup (for Roadmap feature)

The roadmap feature requires a backend server to communicate with Google Gemini API:

```bash
root directory

npm install 

cp .env.example .env 

# Navigate to server directory

cd server

# Install server dependencies
npm install

# Copy environment template ANOTHER ENV 
cp .env.example .env

# Edit server/.env and add your Gemini API key
# GEMINI_API_KEY=your-gemini-api-key-here
```

### Development

⚠️ **IMPORTANT**: You need to run TWO separate processes simultaneously for the full application to work.

#### Option 1: Two Terminal Windows (Recommended for Development)

**Terminal 1 - Start Frontend:**
```bash
#if any changes,
npm run build

# From project root directory
npm run dev
```
You should see:
```
VITE v5.4.3  ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Terminal 2 - Start Backend (for Roadmap feature):**
```bash
# Open a NEW terminal, then:
cd server
#if any changes
npm run build

npm run dev
```
You should see:
```
🚀 Memoria backend server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
🔑 Gemini API Key: ✓ Set
```

**Keep both terminals running** while you develop. Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Option 2: Using tmux or screen (Optional)

```bash
# Start frontend in background
npm run dev &

# Start backend in background
(cd server && npm run dev) &
```

#### What Runs Where

- **Frontend (port 5173)**: React app, all UI pages (Dashboard, Search, Visualize, Roadmap, Settings)
- **Backend (port 3001)**: Express server, only used by the Roadmap page for Gemini API calls

**Note**: Dashboard, Search, Visualize, and Settings pages work WITHOUT the backend. Only the Roadmap feature requires the backend server to be running.

#### Verifying Both Servers Are Running

1. **Frontend check**: Open http://localhost:5173 → Should show Memoria dashboard
2. **Backend check**: Open http://localhost:3001/health → Should show `{"status":"ok","timestamp":"..."}`
3. If either fails, check the terminal output for error messages

### Build

Run this to show changes

```bash
npm run build
```

### Configure AI Features

#### GPT Auto-Tagging (Optional)

Memoria uses GPT-4o-mini to summarize each conversation and emit canonical tags. To enable it:

1. Create a `.env` file in the project root (same folder as `package.json`).
2. Add your OpenAI API key plus optional overrides:

```
VITE_OPENAI_API_KEY=sk-your-key
# Optional overrides
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_MODEL=gpt-4o-mini
```

The key is stored locally and used directly in the browser. If no key is set, the app falls back to the keyword-based TF-IDF adapter so auto-tagging still works, albeit with less semantically rich results.

#### Gemini Roadmap Generation (Optional)

The AI Roadmap Explorer uses Google Gemini to generate structured knowledge roadmaps from your conversations:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a `.env` file in the `server/` directory
3. Add your Gemini API key:

```
GEMINI_API_KEY=your-gemini-api-key-here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

4. Start the backend server (see Development section above)

The Roadmap page will only work when the backend server is running. All other features work without the backend.

### Testing the Roadmap Feature

For detailed instructions on testing the new AI Roadmap Explorer feature, see **[TESTING_GUIDE.md](TESTING_GUIDE.md)**.

Quick start:
1. Start both frontend (`npm run dev`) and backend (`cd server && npm run dev`)
2. Navigate to the Roadmap page (✨ sparkle icon)
3. Select conversations and enter a query
4. View the AI-generated knowledge roadmap

### Tagging Smoke Test (Node Script)

You can test your API key without running the full UI by using the CLI harness:

```bash
npm run test:tagging -- --text "Discuss protein intake and weekly workouts"
```

Flags:

- `--text "..."` supply a conversation snippet inline.
- `--file path/to/chat.txt` load a longer transcript.
- `--title "Custom session title"` or `--source chatgpt` to mimic different sources.

The script prints whether the GPT pathway is active and streams both normalized tags and the raw tag objects returned by the adapter. If no API key is configured it automatically falls back to the keyword adapter so you can still verify the pipeline wiring.

### Preview Production Build

```bash
npm run preview
```
## AI Agent Workflow and Logging

Each start of a new task or AI-agent chat should include exhaustive context. Attach `docs/PRD.md` and `BACKLOG.md` so the agent understands the product vision and latest status. Use `BACKLOG.md` actively:
- `Completed` / `Upcoming` summarize current status (reverse chronological order).
- `Important Notes` explains how to read the backlog at a glance.
- `Implementation Log` records detailed changes with file references in reverse chronological order.


## Project Structure

```
src/
├── app/          # App shell and routing
├── pages/        # Page components (Dashboard, Search, Visualize, Settings)
├── features/     # Feature modules
│   ├── import/   # Chat import and parsing
│   ├── search/   # Search adapters and ranking
│   ├── tags/     # Auto-tagging logic
│   └── visualization/  # Graph and timeline
├── components/   # Reusable UI components
├── store/        # Zustand state management
├── lib/          # Utilities and database
├── types/        # TypeScript type definitions
└── assets/       # Static assets
```

## Roadmap

- [ ] Project scaffolding
- [ ] Local database schema (Dexie)
- [ ] Chat import flow (ChatGPT JSON)
- [ ] Basic keyword search
- [ ] Auto-tagging with AI
- [ ] Graph visualization
- [ ] Timeline view
- [ ] Hybrid search (BM25 + embeddings)
- [ ] Chrome extension for data capture

## License

MIT

## Team

Vittoria Meroni, Ching-Chi Chou, Gyoktu Dyonmez, Ilias Merigh
