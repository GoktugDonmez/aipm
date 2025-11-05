# Memoria

Transform AI conversations and notes into organized, visual, and searchable knowledge that enhances productivity.

## Features

- **Import & Index**: One-click export from ChatGPT and other chatbots into a local-first database
- **Search & Retrieval**: Performant hybrid search with source-grounded results
- **Auto-Tagging**: AI-powered automatic tagging with manual editing capability
- **Visual Navigation**: Graph and timeline views for exploring your knowledge base
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

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

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
