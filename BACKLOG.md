# Backlog

## Completed
- Added mock data loaders (cooking, car repair) and exposed JSON import flow on dashboard (Nov 10, 2025).
- Switched visualization graph to tag-driven nodes with source/date filters and shared-tag controls (Nov 10, 2025).
- Added automatic catch-up tagging for legacy sessions via `useSessions` hook (Nov 10, 2025).
- Displayed generated tags in dashboard conversation list and conversation modal (Nov 10, 2025).
- Implemented keyword-based automatic tagging pipeline (TF/IDF) and session/tag persistence (Nov 10, 2025).

## Upcoming
- Integrate client-side embeddings pipeline (MiniLM via Web Worker) and store results in Dexie `embeddings` table.
- Enhance visualization with embedding-powered similarity edges and user-defined concept prompts.

## Important Notes
- Completed and upcoming lists provide a short CURRENT status snapshot, entries appear in reverse chronological order (newest first).
- The Implementation Log below captures detailed context, file references, and discussion points. IMPORTANT FOR CONTEXT.

## Implementation Log
- **2025-11-10 – Project context & PRD** *(README.md, docs/PRD.md)* – Captured product vision, requirements, and stakeholder context for quick onboarding.
- **2025-11-10 – Mock data + import UX** *(src/pages/Dashboard.tsx, src/features/import/ImportUpload.tsx, src/mocks/*.json)* – Introduced `ImportUpload` panel to dashboard with file upload support plus instant cooking/car-repair datasets, reusing QA selection workflow for curated imports.
- **2025-11-10 – Visualization modification** *(src/features/visualization/visualizationService.ts, src/pages/Visualize.tsx)* – Replaced title-keyword graph with tag-based nodes, added configurable shared-tag edges, and built filters for tags, sources, timeframes, and edge density; refreshed graph sizing/color logic for readability.
- **2025-11-10 – Legacy session backfill** *(src/lib/hooks.ts)* – Extended `useSessions` to enqueue auto-tag runs for sessions lacking tags, ensuring existing IndexedDB data gets annotated without manual intervention.
- **2025-11-10 – Auto-tagging pipeline** *(src/features/tags/taggingService.ts, src/features/import/importService.ts, src/features/qa/qaService.ts)* – Replaced placeholder service with TF/IDF keyword extraction, merged results into session/tag tables, and wired into both import flow and QA save path; dashboard and modal UIs now surface tags.
