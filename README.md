# Selecta

> Natural-language analytics for BigQuery, powered by Google’s ADK and a streaming Next.js experience.

Selecta ships two tightly-integrated pieces:

- **Backend (`backend/`)** – a Google ADK agent that parses English questions, generates GoogleSQL, executes BigQuery jobs, and streams structured results (rows, charts, summaries, meta).
- **Frontend (`frontend/`)** – a Shadcn-flavoured Next.js 14 client that renders the conversation, reasoning trace, data visualisation, SQL, and a Meta tab with execution telemetry.

Together they deliver a “Gemini + BigQuery” workflow that feels immediate: ask a question, watch the reasoning stream, see the Vega-Lite chart materialise, and browse job details without reloading.

---

## Highlights

- **Structured answers** – every response arrives with `Summary`, `Results`, and `Business Insights` sections plus a generated Vega-Lite spec.
- **Meta-aware streaming** – the UI separates reasoning from the final answer and exposes execution metrics (job id, latency, dataset provenance) in a dedicated tab.
- **Drop-in backend** – runs on top of the official ADK HTTP server; no custom FastAPI layer or bespoke protocol to maintain.
- **Modern frontend** – Next.js App Router, TypeScript, Zustand, Shadcn UI, and Tailwind 4 powering a responsive glassmorphic layout.

---

## Architecture at a glance

```
[User] → [Next.js Frontend (SSE client)]
                │
                ▼
      [Google ADK HTTP Server]
                │
                ▼
        [BigQuery + Gemini]
```

1. The frontend posts a question to `POST /run_sse`.
2. The ADK agent streams intermediate reasoning followed by a structured payload:
   - rows + columns + row count
   - Vega-Lite chart suggestion
   - markdown summary/results/insights
   - BigQuery job metadata (`executionMs`, `jobId`, dataset info)
3. The frontend normalises those increments into the chat bubble, a hidden “View reasoning” accordion, and the Chart / Table / SQL / Meta tabs.

See [`backend/api-contract.md`](backend/api-contract.md) for the exact event schema.

---

## Getting started

### Prerequisites

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/) for backend dependency management
- Node.js 22+ and npm for the frontend
- A Google Cloud project with BigQuery access (the repo ships with the public `thelook_ecommerce` dataset configured)
- A Gemini API key (or Vertex AI credentials) for ADK

### 1. Boot the backend

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -e .

# Configure credentials
export GOOGLE_API_KEY="YOUR_GEMINI_KEY"            # or set Vertex AI env vars
export SELECTA_DATASET_CONFIG="$(pwd)/selecta/datasets/thelook.yaml"

# Run the ADK server
uv run adk api_server app --allow_origins "*" --port 8080
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and ask a question like “What are the top products by revenue in the last 150 days?”.

---

## Deploy to Cloud Run

Use the helper script to build the container and roll out the ADK + Next.js stack:

```bash
./deploy-cloud-run.sh \
  --project PROJECT_ID \
  --region us-central1 \
  --service selecta \
  --service-account PROJECT_ID-compute@developer.gserviceaccount.com \
  --secret GOOGLE_API_KEY=selecta-gemini-key:latest \
  --allow-unauthenticated
```

- The script mirrors the verified manual command. The ADK backend listens on `8081`, the Next.js frontend on `8080`, and the default dataset config comes from `/opt/venv/lib/python3.12/site-packages/selecta/datasets/thelook.yaml` inside the image.
- Ensure the chosen service account has `roles/secretmanager.secretAccessor` on the Gemini key secret (or pass `--env GOOGLE_API_KEY=...` if you prefer a literal env var).
- To swap datasets, include `--env SELECTA_DATASET_CONFIG=/app/path/to/custom.yaml`.

Once deployed, the service URL printed by gcloud (or the script) becomes the base for the frontend; no additional proxy configuration is required.

---

## Project layout

```
backend/    # Google ADK agent, dataset config, tooling
frontend/   # Next.js + Shadcn UI client
roadmap.md  # Upcoming workstreams
```

- **Backend docs** – [`backend/README.md`](backend/README.md) (setup, configuration, payload reference)
- **API contract** – [`backend/api-contract.md`](backend/api-contract.md) (endpoints + streaming schema)
- **Frontend docs** – [`frontend/README.md`](frontend/README.md) (app structure, dev commands)

---

## Result metadata

Every streamed result includes:

| Field | Description |
| --- | --- |
| `summary`, `resultsMarkdown`, `businessInsights` | Markdown sections rendered in the chat bubble. |
| `rows`, `columns`, `rowCount` | Lightweight preview of the BigQuery result set. |
| `chart` | Vega-Lite spec used by the Chart tab. |
| `executionMs`, `jobId` | BigQuery latency + job identifier (shown in the Meta tab). |
| `dataset` | Active dataset descriptor (project, billing project, location, table allowlist). |

Use these fields to build your own client, persist history, or trigger follow-up analyses.

---

## Contributing

We welcome issues and pull requests! A few guidelines:

- Keep docs and contracts up to date (`README.md`, `backend/README.md`, `backend/api-contract.md`, `frontend/README.md`).
- When changing backend payloads, update the frontend store/hooks and Meta tab.
- Run `npm run lint` (frontend) and `uv pip check` / `python -m compileall` (backend) before opening a PR.

See [`roadmap.md`](roadmap.md) for active workstreams and ideas.

---

## License

Apache 2.0 – see [`LICENSE`](LICENSE).
