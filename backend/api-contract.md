# Selecta API Contract (ADK Server)

Selecta now runs the Google ADK HTTP server directly:

```bash
uv run adk api_server app --allow_origins "*" --port 8080
```

All endpoints are rooted at `/` (there is no `/api` prefix). Key routes:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/docs` | Swagger UI for the ADK server. |
| `POST` | `/apps/{app}/users/{user}/sessions/{session}` | Create or resume a session. Body can be `{}`. |
| `GET` | `/apps/{app}/users/{user}/sessions` | List sessions for a user. |
| `GET` | `/apps/{app}/users/{user}/sessions/{session}` | Fetch session details (state + events). |
| `POST` | `/run` | Execute a synchronous run (non-streaming). |
| `POST` | `/run_sse` | Stream agent events via Server‑Sent Events. |

### Streaming payloads

`POST /run_sse` yields SSE events with JSON payloads identical to ADK `Event` objects. Selecta enriches the `actions.stateDelta` with structured result metadata so clients can render charts, summaries, and execution details without extra requests.

Each increment may include:

- `latest_result` – the newest query result (see schema below).
- `results_history` – array of previous results in the same session (most recent last).
- `summary`, `resultsMarkdown`, `businessInsights` – optional legacy fields maintained for compatibility; the same values are now part of `latest_result`.

#### Result schema

```jsonc
{
  "id": "uuid",                        // stable per execution
  "sql": "SELECT ...",
  "rows": [{ "column": "value" }],
  "columns": ["column"],
  "rowCount": 10,
  "chart": { "$schema": "https://vega.github.io/schema/vega-lite/v5.json", "..." : "..." },
  "chartOptions": [
    {
      "id": "bar-horizontal",
      "label": "Bar (Horizontal)",
      "spec": { "...": "..." }
    },
    {
      "id": "bar-vertical",
      "label": "Bar (Vertical)",
      "spec": { "...": "..." }
    }
  ],
  "defaultChartId": "bar-horizontal",
  "summary": "### Summary ...",
  "resultsMarkdown": "| column | ...",
  "businessInsights": [
    "Insight bullet",
    "Another insight"
  ],
  "createdAt": 1760949425760,          // epoch millis
  "executionMs": 2840,                 // BigQuery run time
  "jobId": "bquxjob_123",
  "dataset": {
    "id": "thelook_ecommerce",
    "projectId": "bigquery-public-data",
    "billingProjectId": "cloudside-academy",
    "location": "US",
    "tables": ["orders", "order_items", "products", "users"]
  }
}
```

The final event (where `partial === false` or `finishReason` is present) repeats the latest state so clients can rely on the final payload for persistence.

Refer to the [ADK samples](https://github.com/google/adk-samples/tree/main/python/agents) for additional endpoint behaviours (e.g. authentication, plugins). If a bespoke REST façade is required, build it as a thin adapter on top of this contract.
