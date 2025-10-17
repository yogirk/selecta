# Selecta UI & Visualization Roadmap

## ✅ 1. Server-side Auto Visualization *(complete)*
- Implemented deterministic column-role inference and chart heuristics.
- Generated Vega-Lite specs for eligible result sets and stored them alongside query records.
- Added environment flags (`SELECTA_AUTOVISUALIZE`, `SELECTA_VIZ_MAX_ROWS`, `SELECTA_VIZ_MAX_DISTINCT`).
- Auto-visualisation is skipped gracefully when heuristics do not produce a confident suggestion.

## 2. Drill-down Suggestions
- Implement template-based follow-up question generator leveraging result schema and original prompt.
- Persist suggestions (`suggestions_json`) with each query result and include in API/SSE payloads.
- Guard with `SELECTA_SUGGESTIONS` flag; reserve optional LLM refinement hook.

## ✅ 3. Session Metadata Enrichment
- Extend SQLite schema to include `last_question`, `last_message_preview`, `message_count`, and `updated_at` fields.
- Update persistence helpers to maintain metadata automatically.
- Return enriched session summaries from `/api/sessions`.
- Handle migrations for existing databases.

## ✅ 4. Dataset Catalogue & Switching *(complete)*
- Added `/api/datasets` catalogue endpoint listing descriptors from `selecta/datasets/` with active-state markers.
- Implemented `/api/config/dataset` to rebuild the agent/runner on demand and switch datasets without restarting the service.
- Surfaced active dataset metadata in `/healthz`, `/api/chat`, streaming payloads, and session summaries.

## ✅ 5. Structured Summary & Insights *(complete)*
- Added a Markdown parser to extract `Summary`, `Results`, and `Business Insights` sections from assistant replies.
- Persist structured fields (`summary`, `resultsMarkdown`, `businessInsights`) with each query result while retaining the original chat message.
- Surfaced structured fields in `/api/chat`, `/api/chat/stream`, `/api/sessions/{id}/results`, and `/api/results/{resultId}` responses, with accompanying unit tests.

## ✅ 6. SSE Event Taxonomy *(complete)*
- Updated `/api/chat/stream` to emit `session`, `message`, `visualization`, `insights`, `suggestions`, and `complete` events with structured payloads.
- Ensured `/api/chat` aggregates the same visualization/insight/suggestion data for parity with streaming clients.
- Documented the event schema and payload examples in the README and API contract.

## 7. Frontend Implementation (Shadcn + Next.js)
- Rebuild UI from scratch on top of the ADK API server.
- Design new three-panel (or improved) layout with streaming updates and dataset controls.
- Integrate structured insights/visualizations surfaced via ADK `stateDelta`.
- Add smoke/e2e coverage once the new UI stabilises.

## 8. QA & Polish
- Add unit tests for heuristics, suggestions, and Markdown parser.
- Add API/SSE integration tests.
- Measure latency overhead (<1–2 s per query step).
- Document new configuration flags in README and `.env.example`.
- Set up CI for lint/tests if not already in place.
