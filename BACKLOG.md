# Backlog

## Completed
- Implemented AI-Powered Roadmap Generation feature:
  - **Backend:** Express server (port 3001) integrating Google Gemini 2.5 Pro for structured knowledge synthesis.
  - **Frontend:** New `/roadmap` page with natural language query input and collapsible session selection.
  - **Data Handling:** Robust import flow that preserves full conversation history while allowing QA pair selection; fallback mechanism to reconstruct context from QA pairs if raw messages are missing.
  - **Visualization:** Interactive D3.js force-directed graph representing topics, subtopics, actions, and resources.
- Refined knowledge graph visualization with layout presets, session deduplication, and in-graph conversation modals (Nov 10, 2025).
- Added mock data loaders (cooking, car repair) and exposed JSON import flow on dashboard (Nov 10, 2025).
- Switched visualization graph to tag-driven nodes with source/date filters and shared-tag controls (Nov 10, 2025).
- Added automatic catch-up tagging for legacy sessions via `useSessions` hook (Nov 10, 2025).
- Displayed generated tags in dashboard conversation list and conversation modal (Nov 10, 2025).
- Implemented keyword-based automatic tagging pipeline (TF/IDF) and session/tag persistence (Nov 10, 2025).

## Upcoming
- **Roadmap Visualization 2.0:** Upgrade the current D3 graph to match the polished aesthetic of `experiments/roadmap_visualizer.html`.
  - **Visual Polish:** Implement the "glassmorphism" container style and gradient headers (`#667eea` to `#764ba2`).
  - **Enhanced Nodes:** Improve node styling with distinct icons/colors for Topics vs Actions vs Resources.
  - **Stats Dashboard:** Add a summary bar showing total nodes, depth, and resource counts.
  - **Interactivity:** Smoother force simulation and better zoom/pan controls.
- Integrate client-side embeddings pipeline (MiniLM via Web Worker) and store results in Dexie `embeddings` table.
- Enhance visualization with embedding-powered similarity edges and user-defined concept prompts.

## Important Notes
- Completed and upcoming lists provide a short CURRENT status snapshot, entries appear in reverse chronological order (newest first).
- The Implementation Log below captures detailed context, file references, and discussion points. IMPORTANT FOR CONTEXT.
- The Current implementation for auto-tagging is a classical TF/IDF keyword extraction, used now to build a demo chat connection to be able to visualize the graph. it will be changed later on. 

## Implementation Log
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
