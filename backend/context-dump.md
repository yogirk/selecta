# Selecta Project Context Dump (2025-10-16)

## Repository Overview
- Branch: `dev-ui` (tracks `origin/dev`)
- Monorepo layout with `backend/` (this directory) and `frontend/` (UI workspace under reconstruction) at the repository root.
- Backend core packages:
  - `app/agent.py` & `app/__init__.py`: expose `root_agent` for `adk api_server`.
  - `selecta/`: agent configuration, custom tools, instructions, datasets, visualization heuristics.
- Removed legacy FastAPI wrapper, persistence layer, and Docker assets.

## Backend Capabilities
- `selecta.agent`: loads `.env` if present and constructs the Selecta ADK agent; exported via `app/__init__.py`.
- `selecta.custom_tools.execute_bigquery_query`: runs BigQuery queries, normalises rows, infers chart specs, and writes results into the ADK tool context state (`latest_result`, `results_history`) for streaming clients.
- The ADK HTTP server (`uv run adk api_server app`) now handles all REST + SSE traffic; no custom FastAPI layer remains.

## Configuration & Dataset Handling
- `selecta/config_loader`: reads dataset YAML (defaults to `selecta/datasets/thelook.yaml`), caches BigQuery + prompt settings.
- Environment variables: `SELECTA_DATASET_CONFIG`, `SELECTA_MODEL`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, etc.
- Legacy `.env.example`, Docker, and Cloud Build assets have been removed; deployments call `adk api_server app`.

## Current Response Shape
- Agent instructions enforce Markdown with headings (`Summary`, `Results`, `Business Insights`); parsed sections and chart metadata are attached to ADK session state for consumption via SSE events.
- Structured result history is maintained in-memory within the ADK invocation context; persistence layer to be revisited if long-term storage is required.

## Outstanding Work (per roadmap)
- Drill-down suggestion generator.
- Rebuild frontend aligned with ADK contract.
- QA, tests, CI, documentation of new flags.

## Miscellaneous
- Repository cleaned (legacy FastAPI implementation removed; frontend rebuild pending).
- Initial commit pushed to GitHub (`yogirk/selecta.git`, branch `dev`).
- Current working branch `dev-ui` intended for UI & visualization enhancements.
