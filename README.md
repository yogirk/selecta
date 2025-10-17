# Selecta Monorepo

This repository contains the Selecta backend agent (Google ADK) and the redesigned Selecta frontend. The backend exposes the standard ADK REST + SSE contract, and the Next.js/Shadcn frontend consumes that API directly.

## Project Layout

- `backend/` – Google ADK agent, configuration, and tooling. See `backend/README.md` for setup.
- `frontend/` – production Next.js app with the new glassmorphic, layered UI.
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

The new UI is live in `frontend/`:

- Next.js App Router with TypeScript & Shadcn UI
- Zustand store wired to ADK sessions + SSE streaming
- Layered tone system (base → surface → elevated) with coordinated borders and shadows
- Session rail, chat column, and analysis panel built to mirror the three-panel mock
- Theme toggle with persisted preference and dark-mode palette parity

### Quick Start

```bash
cd frontend
npm install
npm run dev
```

Environment variables (`.env.local`) should point to the ADK server (defaults provided in `frontend/.env.local.example`).

## Contributing

- Work from the appropriate workspace (`backend/` or `frontend/`) before installing dependencies or running commands.
- Keep documentation in sync (roadmap, frontend README, API contract).
- When backend payloads change, update the frontend store/hooks and note it in `answers.md`.

## License

Apache 2.0 – see `LICENSE`.
