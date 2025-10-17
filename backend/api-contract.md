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

`POST /run_sse` yields SSE events with JSON payloads identical to ADK `Event` objects. Selecta enriches the `actions.stateDelta` with:

- `latest_result`: `{ sql, rows, columns, rowCount, chart }`
- `results_history`: array of previous results in the same shape

Clients should read these fields from the `stateDelta` increments as they arrive. The final event (when `partial` is `false` or `finishReason` present) mirrors the latest state.

Refer to the [ADK samples](https://github.com/google/adk-samples/tree/main/python/agents) for additional endpoint behaviours (e.g., authentication, plugins). If a bespoke REST façade is required, build it as a thin adapter on top of this contract.***
