# Selecta Project Context Dump (2025-10-16)

## Repository Overview
- Branch: `dev-ui` (tracks `origin/dev`)
- Core packages:
  - `selecta/`: agent definition (`agent.py`), config loader, BigQuery tools, instructions, datasets, SQLite storage, utilities.
  - `service/`: FastAPI backend exposing REST and SSE endpoints (`api.py`).
  - `scripts/`: deployment helpers.
  - `.env.example`: configuration template supporting Gemini API and Vertex AI.
  - `entrypoint.sh`: Uvicorn starter.
  - `Dockerfile`: builds Python + uvicorn image with `selecta` package.
- Removed legacy `data_agent/` and React frontend.

## Backend Capabilities
- `selecta.agent`: loads `.env`, initialises SQLite, exposes helpers to rebuild `selecta_agent`/`root_agent` after dataset switches.
- `selecta.custom_tools.execute_bigquery_query`: runs BigQuery queries, normalises rows, infers chart specs, persists results (session_id, sql, rows, chart) into SQLite, stores `latest_query_result_id` in tool context.
- `selecta.storage`: manages SQLite tables (`sessions`, `messages`, `query_results`) and now stores structured summary/results/insights parsed from assistant replies.
- `service/api.py`:
  - `POST /api/chat` for synchronous turns; returns messages, stored results, structured summary blocks, and active dataset metadata.
  - `POST /api/chat/stream` (SSE) emits `session`, `message`, `visualization`, `insights`, `suggestions`, and `complete` events so the UI can respond incrementally to charts and narratives.
  - Session history endpoints (`/api/sessions`, `/api/sessions/{id}/messages`, `/api/sessions/{id}/results`, `/api/results/{resultId}`) now surface dataset info and enriched session metadata.
  - Configuration endpoints (`GET /api/datasets`, `POST /api/config/dataset`) list descriptors and switch the active dataset, rebuilding the ADK runner on demand.
  - Startup initialises storage and ADK runner, plus CORS for frontend.

## Configuration & Dataset Handling
- `selecta/config_loader`: reads dataset YAML (defaults to `selecta/datasets/thelook.yaml`), caches BigQuery + prompt settings, and exposes runtime overrides/listing utilities.
- Environment variables: `SELECTA_DATASET_CONFIG` (or legacy `DATA_AGENT_DATASET_CONFIG`), `SELECTA_MODEL`, `SELECTA_DB_PATH`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, etc.
- `.env.example` documents these with toggles for Gemini API vs Vertex.

## Current Response Shape
- Agent instructions enforce Markdown with headings (`Summary`, `Results`, `Business Insights`); the backend parses these into structured fields stored alongside each query result while retaining the full Markdown message.
- Query results persisted with `columns`, `rows`, `sql`, `rowCount`, optional `chart` spec, and structured summary fields; drill-down suggestions still pending.
- REST/SSE payloads include enriched session metadata, structured summaries per result, visualization events, and the active dataset descriptor.

## Outstanding Work (per roadmap)
- Drill-down suggestion generator.
- Next.js + shadcn UI build (three-panel layout, dataset dropdown).
- QA, tests, CI, documentation of new flags.

## Miscellaneous
- Repository cleaned (no frontend or legacy backend files).
- Initial commit pushed to GitHub (`yogirk/selecta.git`, branch `dev`).
- Current working branch `dev-ui` intended for UI & visualization enhancements.
