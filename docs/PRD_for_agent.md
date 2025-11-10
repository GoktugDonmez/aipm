# Memoria Product Requirements Document (PRD)

**Authors:** Vittoria Meroni, Ching-Chi Chou, Gyoktu Dyonmez, Ilias Merigh  
**Date:** November 10, 2025

---

## 1. Product Name
Memoria

## 2. Problem Statement
Frequent LLM users lose valuable AI insights because raw chat logs are hard to organize and revisit. Memoria captures, structures, and visualizes AI conversations so users can rediscover knowledge quickly.

## 3. Stakeholders
- **Team:** Vittoria Meroni, Ching-Chi Chou, Gyoktu Dyonmez, Ilias Merigh
- **Customers:** Students, researchers, consultants, and knowledge workers who rely on AI assistants (ChatGPT, Claude, Gemini, etc.) and struggle to re-find prior answers.

## 4. Product Vision
- **Vision:** Transform AI conversations and notes into organized, visual, searchable knowledge that enhances productivity.
- **Why it Matters:** Without organization, users repeat work, lose insights, and distrust AI-generated knowledge.
- **Who Benefits:**
  - Individuals: Quickly retrieve previous conversations and references.
  - Organizations: Preserve institutional knowledge with a transparent, local-first corpus.
- **Strategy & Roadmap:** Focus on must-have workflows (import, search, tagging, visualization), then improve performance, and finally deliver delighter features (extensions, collaboration).

## 5. Functional Requirements
1. **Import & Index:** One-click ingest from ChatGPT/other chatbots into a local-first database with message-level fidelity.
2. **Search & Retrieval:** Fast, ranked search that links directly to the original message with highlight/context.
3. **Filters:** Filter by date, source, and tag across the corpus.
4. **Auto-Tagging:** Generate 2–3 tags per conversation with user override/merge capabilities.
5. **Visual Navigation:** Provide graph and timeline views with zoom/pan; selecting a node shows the underlying conversation.

## 6. Non-Functional Requirements
- **Security & Privacy:** Local-first storage by default; clear controls for data handling.
- **Usability:** Import, search, filter, open, and visualize should feel responsive for typical workloads.
- **Reliability:** High success rates on representative imports; clear recovery paths on failure.
- **UX Quality:** Auto-tags should require minimal edits; users should confidently re-find work.

## 7. Assumptions & Hypotheses
- **H1:** Heavy LLM users need better retrieval than native chat UIs provide.
- **H2:** Users accept AI-generated organization if it remains editable and grounded in source content.
- **H3:** A freemium model is viable; some users will pay for advanced features.

## 8. Minimum Success Criteria
- Import succeeds for target chat exports.
- Search returns relevant results within 3 seconds.
- Auto-tagging achieves ≥70% user-label acceptance.
- Graph visualization renders in under 5 seconds and meets usability expectations.

## 9. MVP Definition
- **Chrome Extension (Single Feature):** Validate seamless data capture from OpenAI with minimal friction.
- **Main UI Prototype:** Run interviews with a working demo to evaluate visualization approaches.

## 10. Constraints
- **Primary:** Time and team expertise limit MVP scope.
- **Technical:** Quality/latency of chosen models; enforcing local-first architecture.

## 11. Dependencies
- **Data Acquisition:** Browser extension scraping where legally permitted.
- **Distribution:** Extension store approvals.
- **Models:** Open-source embedding/generation models considered available.
- **Scalability Plan:** Follow Kano model—ship must-haves, improve performance, add delighters.

## 12. Risks & Mitigations
- **Data Availability:** Restrict scraping to permitted content.
- **Search Quality:** Iterate on ranking (keyword, semantic, hybrid).
- **Performance:** Favor lightweight models and background processing.
- **Privacy:** Maintain local-first defaults and transparent source grounding.

## 13. Glossary
- **Local-first DB:** Data stored/processed on-device by default.
- **Embedding model:** Converts text to vectors for semantic similarity.
- **BM25:** Lexical ranking algorithm for keyword search.
- **Hybrid search:** Combination of embeddings and BM25.
- **Source-grounded result:** Links back to the original message.
- **Auto-tagging:** AI-suggested tags for each item.
- **Graph view:** Node/edge visualization of relationships.
- **Timeline view:** Chronological visualization of activity.
- **Gold Set:** Curated dataset for evaluation.
- **Top-3 hit rate:** % of queries with correct result in top three.
- **p95 latency:** 95th percentile response time.
- **MVP:** Minimum Viable Product.
- **LLM:** Large Language Model.
- **Corpus:** All imported chats/notes.
- **Indexing:** Preparing corpus for search.
- **Labeling acceptance rate:** % of AI tags kept by users.
- **Export/backup:** User-initiated data export for portability.

---

For implementation status, see `BACKLOG.md`. For quickstart and feature overview, refer to `README.md`.
