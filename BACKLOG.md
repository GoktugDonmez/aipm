# Backlog

## Completed
- **Chrome Extension Multi-Platform Support (Nov 26, 2025):**
  - Extended support to Claude and Gemini platforms in addition to ChatGPT
  - Implemented source tracking to automatically tag conversations by platform
  - Enhanced search functionality to index conversations across all three platforms
- Implemented AI-Powered Roadmap Generation feature:
  - **Backend:** Express server (port 3001) integrating Google Gemini 2.5 Pro for structured knowledge synthesis.
  - **Frontend:** New `/roadmap` page with natural language query input and collapsible session selection.
  - **Data Handling:** Robust import flow that preserves full conversation history while allowing QA pair selection; fallback mechanism to reconstruct context from QA pairs if raw messages are missing.
- Refined knowledge graph visualization with layout presets, session deduplication, and in-graph conversation modals (Nov 10, 2025).

## Upcoming
- **Roadmap UX Improvements:**
  - Fix scrolling scale issues in the roadmap visualization.
  - Ensure true fullscreen behavior and responsive layout adjustments.
- Integrate client-side embeddings pipeline (MiniLM via Web Worker) and store results in Dexie `embeddings` table.
- Enhance visualization with embedding-powered similarity edges and user-defined concept prompts.

## Important Notes
- Completed and upcoming lists provide a short CURRENT status snapshot, entries appear in reverse chronological order (newest first).
- The Implementation Log below captures detailed context, file references, and discussion points. IMPORTANT FOR CONTEXT.
- The Current implementation for auto-tagging is a classical TF/IDF keyword extraction, used now to build a demo chat connection to be able to visualize the graph. it will be changed later on. 

## Implementation Log
- **2025-11-26 – Chrome Extension Multi-Platform Support** *(chrome-extension/content.js)* – Extended extension to support Claude and Gemini platforms.
  - **Platform Expansion:** Implemented platform-agnostic architecture supporting ChatGPT, Claude, and Gemini
  - **Source Tracking:** Added automatic tagging system to identify and store conversation origin
  - **Search Enhancement:** Updated search indexing to work seamlessly across all supported platforms
- **2025-11-18 - Roadmap visualization remake** - Reimplemented Roadmap Visualization (Roadmap 2.0):
 Replaced D3 force graph with a static tree based approach
- **2025-11-18 – AI Roadmap Feature** *(server/, src/pages/Roadmap.tsx, src/features/roadmap/)* – Implemented end-to-end roadmap generation.
  - **Backend:** Created a lightweight Express server to proxy requests to Google Gemini 2.5 Pro, handling API key management and CORS.
  - **Frontend:** Built a dedicated Roadmap page where users can select conversations (auto-selecting all by default) and ask questions like "how do I fix my brakes?".
  - **Resilience:** Fixed a critical data regression where mock imports skipped message storage; added a fallback layer in `roadmapService.ts` to reconstruct conversation transcripts from QA pairs if raw messages are unavailable, ensuring the feature works even with legacy data.
  - **UX:** Added "Advanced" collapsible section for session selection to keep the UI clean while retaining control.
- **2025-11-10 – Project context & PRD** *(README.md, docs/PRD.md)* – Captured product vision, requirements, and stakeholder context for quick onboarding.
- **2025-11-10 – Mock data + import UX** *(src/pages/Dashboard.tsx, src/features/import/ImportUpload.tsx, src/mocks/*.json)* – Introduced `ImportUpload` panel to dashboard with file upload support plus instant cooking/car-repair datasets, reusing QA selection workflow for curated imports.
- **2025-11-10 – Visualization modification** *(src/features/visualization/visualizationService.ts, src/pages/Visualize.tsx)* – Replaced title-keyword graph with tag-based nodes, added configurable shared-tag edges, and built filters for tags, sources, timeframes, and edge density; refreshed graph sizing/color logic for readability.
- **2025-11-10 – Visualization interactivity refresh** *(src/features/visualization/NetworkGraph.tsx, src/features/visualization/visualizationService.ts, src/pages/Visualize.tsx)* – Introduced selectable layout strategies, conversation node click-through to detailed modal, deduped sessions prior to graph generation, and prioritized filtered relevance to avoid duplicate chats in the network.
- **2025-11-10 – Legacy session backfill** *(src/lib/hooks.ts)* – Extended `useSessions` to enqueue auto-tag runs for sessions lacking tags, ensuring existing IndexedDB data gets annotated without manual intervention.
- **2025-11-10 – Auto-tagging pipeline** *(src/features/tags/taggingService.ts, src/features/import/importService.ts, src/features/qa/qaService.ts)* – Replaced placeholder service with TF/IDF keyword extraction, merged results into session/tag tables, and wired into both import flow and QA save path; dashboard and modal UIs now surface tags.
