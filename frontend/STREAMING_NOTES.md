# Streaming UX Notes

These notes capture the current streaming pipeline between the ADK backend and the Next.js client.

## Prompt & response contract

- The agent acknowledges the request once, then emits the generated GoogleSQL, tool call responses, and the final markdown sections (`### Summary`, `### Results`, `### Business Insights`).
- The backend attaches structured metadata (`rows`, `columns`, `rowCount`, `chart`, `summary`, `resultsMarkdown`, `businessInsights`, `executionMs`, `jobId`, `dataset`) to `actions.stateDelta.latest_result`.

See `backend/selecta/instructions.yaml` and `backend/api-contract.md` for full details.

## Client streaming model

- `src/hooks/useSSE.ts` maintains two buffers: one for intermediate reasoning, one for the final message. SQL/tool chatter stays in the reasoning buffer and collapses into the “View reasoning” accordion rendered by `ChatMessage`.
- When the final chunk arrives, the hook merges any structured fields delivered via `latest_result` and falls back to the streamed markdown only if needed.
- Result history is cached in Zustand (`lib/store.ts`) so the Chart/Table/SQL/Meta tabs can switch between runs instantly.

## Rendering highlights

- Markdown headings are styled via `styles/design-system.css` so the summary/results/insights sections read like native UI.
- Vega-Lite specs are rendered in `components/results/VisualizationTab.tsx`; table and SQL views use the same `activeResult`.
- The Meta tab combines `executionMs`, `jobId`, `rowCount`, and dataset metadata to make debugging easier.

This document should be a quick reference when tuning the streaming contract or extending the UI.
