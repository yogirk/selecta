# Selecta Monorepo

This repository contains the Selecta backend agent (Google ADK) and frontend work-in-progress. The backend now exposes the standard ADK API server, so clients integrate directly with ADK’s REST + SSE contract. The existing Next.js frontend is being retired; a fresh UI will be built on top of the new contract.

## Project Layout

- `backend/` – Google ADK agent, configuration, and tooling. See `backend/README.md` for setup.
- `frontend/` – placeholder workspace for the new UI (to be rebuilt).
- `roadmap.md` – shared roadmap across backend and frontend workstreams.
- `selecta-3col-layout.html` – visual reference for the desired three-panel UI layout.

## Backend Quick Start

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -e .

# configure credentials
export GOOGLE_API_KEY=...                # or Vertex AI env vars
export SELECTA_DATASET_CONFIG="$(pwd)/selecta/datasets/thelook.yaml"

# run the ADK server
uv run adk api_server app --allow_origins "*" --port 8080
```

Refer to `backend/README.md` for more details (dataset configuration, optional playground, deployment notes).

## Frontend Status

We are rebuilding the frontend from scratch to align with the ADK server contract. The `frontend/` directory currently serves as a staging area; no commands are provided yet.

## Contributing

- Work from the appropriate workspace (`backend/` or `frontend/`) before installing dependencies or running commands.
- Keep shared documentation up to date (roadmap, architectural notes).
- When backend changes adjust ADK payloads, notify the frontend team and update integration code accordingly.

## License

Apache 2.0 – see `LICENSE`.
