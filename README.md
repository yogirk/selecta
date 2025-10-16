# Selecta Service

Backend-only deployment of the Selecta (Google ADK-powered) BigQuery agent. The repository now focuses on the Selecta Python agent and a lightweight FastAPI wrapper, ready to be consumed by a custom Next.js frontend or the ADK web UI.

## Key Capabilities
- Selecta ADK `Agent` (`selecta/agent.py`) for converting natural-language questions into BigQuery SQL.
- FastAPI service (`service/api.py`) exposing a simple `/api/chat` endpoint with CORS enabled for browser clients.
- Streaming `POST /api/chat/stream` endpoint (Server-Sent Events) to surface ADK events as they arrive.
- Session persistence backed by SQLite (`selecta.db`) with REST endpoints for session history and stored query results.
- Container-ready setup using `uv` for dependency management and `uvicorn` for serving.

## Prerequisites
- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/) installed locally (e.g., `pip install uv`).
- Google Cloud SDK (`gcloud`) configured with access to BigQuery and Dataplex.
- Google Generative AI API key (Gemini) available as `GOOGLE_API_KEY`.

## Configuration
The agent loads its dataset-specific context from descriptor files in `selecta/datasets/`.

1. Copy `selecta/datasets/thelook.yaml` and adjust the BigQuery settings (billing project, data project, dataset, tables, optional data profile table).
2. Update or replace `selecta/instructions.yaml` if the schema-specific guidance or few-shot examples need to change.
3. Point the service to your descriptor:
   ```bash
   export DATA_AGENT_DATASET_CONFIG=/absolute/path/to/your_dataset.yaml
   ```
4. Optionally override the model:
   ```bash
   export DATA_AGENT_MODEL="gemini-2.0-pro"
   ```

Secrets such as `GOOGLE_API_KEY` should be provided via environment variables or Secret Manager when running in production.

## Local Development Workflow
1. Create an isolated environment and install dependencies with `uv`:
   ```bash
   uv venv
   source .venv/bin/activate
   uv pip install -e .
   ```
2. Export required Google credentials:
   ```bash
   gcloud auth application-default login
   export GOOGLE_API_KEY="YOUR_GEMINI_KEY"
   export GOOGLE_GENAI_USE_VERTEXAI=0
   ```
3. Launch the lightweight ADK web experience to interact with the agent:
   ```bash
   uv run adk web --agent selecta.agent:selecta_agent
   ```

## Running the FastAPI Service During Development
```bash
uv run uvicorn service.api:app --reload --host 0.0.0.0 --port 8080
```
Endpoints:
- `GET /healthz` – liveness probe.
- `POST /api/chat` – chat with the agent (returns structured response with latest results).
- `POST /api/chat/stream` – SSE endpoint that emits messages/results incrementally.
- `GET /api/sessions` – recent sessions summary.
- `GET /api/sessions/{id}/messages` – ordered transcript for a session.
- `GET /api/sessions/{id}/results` – stored result sets per session.
- `GET /api/results/{resultId}` – retrieve a specific query payload.

## Container Image
Build the backend-only image with Cloud Build or Docker:
```bash
docker build -t selecta-backend .
```
Run the container:
```bash
docker run \
  -e GOOGLE_API_KEY=... \
  -e GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
  -e SELECTA_DATASET_CONFIG=/app/selecta/datasets/thelook.yaml \
  -e SELECTA_DB_PATH=/app/data/selecta.db \
  -p 8080:8080 \
  selecta-backend
```
The SQLite database (`selecta.db` by default) is created automatically; mount a persistent volume in production.

## Cloud Build Deployment
`cloudbuild.yaml` builds the single Docker image. Ensure the substituted image name (`_IMAGE_NAME`) and Cloud Run configuration in `scripts/deploy.sh` match your project when you are ready to automate deployments.

## Repository Layout
```
.
├── selecta/           # ADK agent definition, configuration, persistence helpers
│   └── datasets/      # Dataset descriptors (select via SELECTA_DATASET_CONFIG)
├── service/           # FastAPI wrapper around the agent
├── entrypoint.sh      # Production entrypoint (Uvicorn)
├── Dockerfile         # Container image using uv + uvicorn
├── pyproject.toml     # Dependency and script configuration
└── cloudbuild.yaml    # Cloud Build configuration
```

## Next Steps
- Add authentication/authorization in front of `/api/chat` before exposing the API externally.
- Expand the FastAPI surface (metadata endpoints, analytics) as the Next.js frontend evolves.
- Enable request/response logging and metrics for observability in production.
