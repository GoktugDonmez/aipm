# Memoria

Transform AI conversations and notes into organized, visual, and searchable knowledge that enhances productivity.

## Features

- **Import & Index**: One-click export from ChatGPT and other chatbots into a local-first database
- **Search & Retrieval**: Performant hybrid search with source-grounded results
- **Auto-Tagging**: AI-powered automatic tagging with manual editing capability
- **Visual Navigation**: Graph and timeline views with interactive layouts and in-graph conversation previews
- **Privacy-First**: Local-first architecture with transparent data controls

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Radix UI Themes
- **Routing**: React Router v6
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Local Storage**: Dexie (IndexedDB wrapper)
- **Visualization**: D3 + Visx
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```


### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

Run this to show changes

```bash
npm run build
```

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

- [x] Project scaffolding
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
