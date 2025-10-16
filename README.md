# Selecta Service

Backend-only deployment of the Selecta (Google ADK-powered) BigQuery agent. The repository now focuses on the Selecta Python agent and a lightweight FastAPI wrapper, ready to be consumed by a custom Next.js frontend or the ADK web UI.

## Key Capabilities
- Selecta ADK `Agent` (`selecta/agent.py`) for converting natural-language questions into BigQuery SQL.
- FastAPI service (`service/api.py`) exposing a simple `/api/chat` endpoint with CORS enabled for browser clients.
- Streaming `POST /api/chat/stream` endpoint (Server-Sent Events) to surface ADK events as they arrive.
- Session persistence backed by SQLite (`selecta.db`) with REST endpoints for session history and stored query results.
- Structured parsing of assistant Markdown into Summary / Results / Business Insights sections stored with each query result.
- Rich SSE taxonomy (`session`, `message`, `visualization`, `insights`, `suggestions`, `complete`) aligned with synchronous responses.
- Container-ready setup using `uv` for dependency management and `uvicorn` for serving.

## Prerequisites
- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/) installed locally (e.g., `pip install uv`).
- Google Cloud SDK (`gcloud`) configured with access to BigQuery and Dataplex.
- Google Generative AI API key (Gemini) available as `GOOGLE_API_KEY`.

## Configuration
The agent loads its dataset-specific context from descriptor files in `selecta/datasets/`.

Start by copying the sample environment file and filling in the placeholders:
```bash
cp .env.example .env
```
Key variables:
- `GOOGLE_GENAI_USE_VERTEXAI`: `0` to use the Gemini API (default), `1` to use Vertex AI.
- `GOOGLE_API_KEY`: required when using the Gemini API.
- `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION`: required when using Vertex AI.
- `SELECTA_DATASET_CONFIG`: points to the dataset descriptor.
- `SELECTA_DB_PATH`: location for the SQLite persistence database.
- `SELECTA_AUTOVISUALIZE`: enable/disable server-side chart heuristics (default `true`).
- `SELECTA_VIZ_MAX_ROWS`: max rows considered for auto visualisation (default `500`).
- `SELECTA_VIZ_MAX_DISTINCT`: max distinct category values for bar charts (default `20`).

1. Copy `selecta/datasets/thelook.yaml` and adjust the BigQuery settings (billing project, data project, dataset, tables, optional data profile table).
2. Update or replace `selecta/instructions.yaml` if the schema-specific guidance or few-shot examples need to change.
3. Point the service to your descriptor:
   ```bash
   export SELECTA_DATASET_CONFIG=/absolute/path/to/your_dataset.yaml
   ```
   (Legacy deployments can continue using `DATA_AGENT_DATASET_CONFIG`; both are supported.)
4. Optionally override the model:
   ```bash
   export SELECTA_MODEL="gemini-2.5-pro"
   ```
5. At runtime, use `POST /api/config/dataset` to switch between descriptors located in `selecta/datasets/` without restarting the service.

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
- `GET /healthz` – liveness probe with active dataset metadata.
- `POST /api/chat` – chat with the agent (returns structured response, results, and dataset metadata).
- `POST /api/chat/stream` – SSE endpoint emitting `session`, `message`, `visualization`, `insights`, `suggestions`, and `complete` events.
- `GET /api/sessions` – recent sessions summary with `lastQuestion`, `lastMessagePreview`, `messageCount`, `updatedAt`, and dataset info.
- `GET /api/sessions/{id}/messages` – ordered transcript for a session.
- `GET /api/sessions/{id}/results` – stored result sets per session (including `summary`, `resultsMarkdown`, `businessInsights`, and `suggestions`).
- `GET /api/results/{resultId}` – retrieve a specific query payload with structured summary fields and suggestions metadata.
- `GET /api/datasets` – list available dataset descriptors with active selection.
- `POST /api/config/dataset` – switch the running agent to a different dataset descriptor.

### Streaming Event Schema
- `session`: `{ "session_id": "uuid" }`
- `message`: `{ "role": "assistant", "content": "..." }`
- `visualization`: `{ "resultId": "uuid", "chart": { ...vega-lite spec... } }`
- `insights`: `{ "resultId": "uuid", "summary": "...", "resultsMarkdown": "...", "businessInsights": "..." }`
- `suggestions`: `{ "resultId": "uuid", "suggestions": [ ... ] }` (empty until drill-down suggestions ship)
- `complete`: `{ "session_id": "uuid", "dataset": {...}, "results": [...], "visualizations": [...], "insights": [...], "suggestions": [...] }`

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
