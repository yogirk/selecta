# Selecta API Contract (2025-10-16)

## Authentication & Base URL
Current deployment exposes all endpoints without authentication. The FastAPI server runs on `HOST:PORT` configured via `.env`/environment variables (defaults: `0.0.0.0:8080`).

## Endpoints

### `GET /healthz`
- **Description**: Basic liveness probe. Returns status along with the active dataset metadata.
- **Response** (`200 OK`):
  ```json
  {
    "status": "ok",
    "dataset": {
      "id": "thelook",
      "displayName": "The Look E-commerce",
      "description": "Sample retail analytics dataset sourced from bigquery-public-data.thelook_ecommerce.",
      "model": "gemini-2.5-pro-preview-03-25",
      "configPath": "/app/selecta/datasets/thelook.yaml"
    }
  }
  ```

### `POST /api/chat`
- **Description**: Execute a chat turn synchronously. Returns aggregated assistant messages plus any stored results for the session.
- **Request Body** (`application/json`):
  ```json
  {
    "user_id": "optional string",
    "session_id": "optional string",
    "message": {
      "role": "user",
      "message": "natural language question"
    }
  }
  ```
  - `user_id`: defaults to `user_1` if omitted.
  - `session_id`: when omitted, a new session is created.
- **Response Body** (`200 OK`):
  ```json
  {
    "session_id": "uuid",
    "messages": [
      {"role": "assistant", "content": "..."},
      ...
    ],
    "results": [
      {
        "resultId": "uuid",
        "sql": "SELECT ...",
        "rowCount": 52,
        "columns": ["col1", "col2"],
        "rows": [{"col1": "...", "col2": 123}, ...],
        "chart": {"$schema": "https://vega.github.io/schema/vega-lite/v5.json", ...},
        "summary": "Top-line performance improved month over month.",
        "resultsMarkdown": "| metric | value |",
        "businessInsights": "- Consider expanding retargeting budgets.",
        "createdAt": "2025-10-16T17:23:00"
      },
      ...
    ],
    "dataset": {
      "id": "thelook",
      "displayName": "The Look E-commerce",
      "description": "Sample retail analytics dataset sourced from bigquery-public-data.thelook_ecommerce.",
      "model": "gemini-2.5-pro-preview-03-25",
      "configPath": "/app/selecta/datasets/thelook.yaml"
    },
    "visualizations": [
      {
        "resultId": "uuid",
        "chart": {"$schema": "https://vega.github.io/schema/vega-lite/v5.json", ...}
      }
    ],
    "insights": [
      {
        "resultId": "uuid",
        "summary": "Top-line performance improved month over month.",
        "resultsMarkdown": "| metric | value |",
        "businessInsights": "- Consider expanding retargeting budgets."
      }
    ],
    "suggestions": [
      {
        "resultId": "uuid",
        "suggestions": []
      }
    ]
  }
  ```
  - `results` contains the persisted query outputs for the session (latest query first), including structured summary blocks parsed from the assistant Markdown response.
  - `visualizations`, `insights`, and `suggestions` mirror the SSE event payloads so non-streaming clients can consume the same structured information.
- **Errors**: `400` if message missing, `500` on internal errors.

### `POST /api/chat/stream`
- **Description**: Server-Sent Events (SSE) endpoint for streaming responses. Useful for live chat UI.
- **Request Body**: same JSON schema as `/api/chat`.
- **Response**: `text/event-stream` stream with events in chronological order. Event types:
  - `event: session` → `{"session_id": "uuid"}` emitted once at start.
  - `event: message` → incremental assistant message chunks (`{"role": "assistant", "content": "..."}`).
  - `event: visualization` → `{"resultId": "uuid", "chart": {...}}` for each result that produced a Vega-Lite spec.
  - `event: insights` → `{"resultId": "uuid", "summary": "...", "resultsMarkdown": "...", "businessInsights": "..."}` for extracted narrative sections.
  - `event: suggestions` → `{"resultId": "uuid", "suggestions": [...]}` (currently empty until drill-down logic is implemented).
  - `event: complete` → `{"session_id": "uuid", "dataset": {...}, "results": [...], "visualizations": [...], "insights": [...], "suggestions": [...]}` mirroring the structure from `/api/chat`.
  - `event: error` in case of exceptions.

### `GET /api/sessions`
- **Description**: Returns recent sessions (default limit 50) enriched with last question, assistant preview, message count, last update timestamp, and dataset identifiers.
- **Query Params**: `limit` (optional integer).
- **Response**:
  ```json
  [
    {
      "sessionId": "uuid",
      "userId": "user_1",
      "createdAt": "2025-10-16T16:55:12",
      "lastQuestion": "What were sales last month?",
      "lastMessagePreview": "Summary of the latest query…",
      "messageCount": 4,
      "updatedAt": "2025-10-16T17:05:41",
      "datasetId": "thelook",
      "datasetDisplayName": "The Look E-commerce"
    },
    ...
  ]
  ```
- Notes: `lastMessagePreview` remains null until the assistant responds within the session.

### `GET /api/sessions/{session_id}/messages`
- **Description**: Fetch the chronological transcript for a given session.
- **Response**:
  ```json
  [
    {"role": "user", "content": "...", "createdAt": "..."},
    {"role": "assistant", "content": "...", "createdAt": "..."},
    ...
  ]
  ```
- Returns empty list if session exists but has no messages.

### `GET /api/sessions/{session_id}/results`
- **Description**: Retrieve all stored query results for a session (most recent first).
- **Response**: identical objects to `results` returned by `/api/chat` (including structured summary fields, charts, and suggestions placeholder).

### `GET /api/results/{result_id}`
- **Description**: Retrieve a single persisted query result by `resultId`.
- **Response**:
  ```json
  {
    "resultId": "uuid",
    "sessionId": "uuid",
    "sql": "SELECT ...",
    "rowCount": 52,
    "columns": [...],
    "rows": [...],
    "chart": {...},
    "summary": "...",
    "resultsMarkdown": "...",
    "businessInsights": "...",
    "suggestions": [],
    "createdAt": "2025-10-16T16:58:00"
  }
  ```
- Errors: `404` if the result does not exist.

### `GET /api/datasets`
- **Description**: List dataset descriptors discovered in `selecta/datasets/` and identify the active dataset.
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "thelook",
      "displayName": "The Look E-commerce",
      "description": "Sample retail analytics dataset sourced from bigquery-public-data.thelook_ecommerce.",
      "model": "gemini-2.5-pro-preview-03-25",
      "configPath": "/app/selecta/datasets/thelook.yaml",
      "isActive": true
    },
    ...
  ]
  ```
- Notes: The active dataset is always included (even if its descriptor resides outside the default directory).

### `POST /api/config/dataset`
- **Description**: Switch the running agent to a different dataset descriptor.
- **Request Body**:
  ```json
  {
    "datasetId": "thelook"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "dataset": {
      "id": "thelook",
      "displayName": "The Look E-commerce",
      "description": "Sample retail analytics dataset sourced from bigquery-public-data.thelook_ecommerce.",
      "model": "gemini-2.5-pro-preview-03-25",
      "configPath": "/app/selecta/datasets/thelook.yaml"
    }
  }
  ```
- Errors: `404` if the dataset identifier does not match a known descriptor.

## Notes & Future Enhancements
- Drill-down suggestion generator will populate the `suggestions` payloads once implemented (see `roadmap.md`).
- All payloads currently return JSON with UTF-8 encoding; tables are limited to the rows captured during execution (default 50). Future configs may expose row limits.
- Authentication/authorization is not yet implemented; add middleware or API gateway as needed for production.
