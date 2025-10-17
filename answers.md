# Frontend ↔ ADK Integration Notes

## 1. Sending a User Message

- Use `POST /run_sse` for streaming (recommended) or `POST /run` for one-shot responses.
- Payload shape:
  ```json
  {
    "appName": "app",
    "userId": "web_user",
    "sessionId": "YOUR_SESSION_ID",
    "newMessage": {
      "role": "user",
      "parts": [
        { "text": "Show me revenue trends" }
      ]
    },
    "streaming": true
  }
  ```
- `sessionId` is required; create it via `POST /apps/app/users/{user}/sessions/{session}` before sending messages.

## 2. SSE Event Structure

- Each `data:` chunk is an ADK `Event` JSON with at least:
  ```json
  {
    "content": {
      "parts": [
        { "text": "... assistant text ..." }
      ],
      "role": "model"
    },
    "author": "selecta",
    "partial": true,
    "actions": {
      "stateDelta": {
        "latest_result": {
          "sql": "...",
          "rows": [...],
          "columns": [...],
          "rowCount": 123,
          "chart": { ... Vega-Lite spec ... }
        },
        "results_history": [ ...same shape as latest_result... ]
      }
    }
  }
  ```
- User messages (`role: "user"`) only appear when you replay session history; streaming emits AI responses.
- When `partial` becomes `false` or `finishReason` is present, the turn is complete.

## 3. Session Initialization

- Call `POST /apps/{app}/users/{user}/sessions/{session}` as soon as the UI loads (or when starting a conversation).
  - `app`: the directory name exposed to ADK (`"app"` in our repo).
  - `user`: any ID you manage (e.g., authenticated user or anonymous UUID).
  - `session`: UUID you generate client-side.
- Body can be `{}`; server returns metadata including the canonical IDs.

## 4. Chart Data Format

- `latest_result.chart` is a Vega-Lite JSON spec (not an image). Render client-side using Vega/Vega-Lite (e.g., `react-vega` or `vega-embed`).

## 5. Chat History Retrieval

- `GET /apps/{app}/users/{user}/sessions/{session}` returns the full session object:
  ```json
  {
    "id": "...",
    "appName": "app",
    "userId": "...",
    "state": {
      "results_history": [...],
      "latest_result": {...}
    },
    "events": [
      {
        "author": "user",
        "content": {"parts":[{"text":"..." }], "role": "user"},
        "timestamp": ...
      },
      {
        "author": "selecta",
        "content": {"parts":[{"text":"assistant reply"}], "role": "model"},
        "actions": {"stateDelta": {...}},
        "timestamp": ...
      }
    ],
    "lastUpdateTime": ...
  }
  ```
- Reconstruct the conversation by walking `events` in order.

## 6. Quick Actions

- Quick actions are purely UX sugar. Populate the composer with the canned prompt; send it only when the user submits. No special endpoint.

## 7. Drill-down Suggestions

- Suggestions arrive via `actions.stateDelta` in streaming events (currently the backend seeds them as placeholders).
- Inspect `stateDelta` for fields like `suggestions` or entries within `results_history`.
- No separate endpoint today; render whatever the backend includes.

## 8. UI Theme Reference

- Light mode tonal stack:
  - `--background` (`layer-base`) — `hsl(240 10% 98%)` → `#F9F9FA`
  - `--surface` (`layer-surface`) — `hsl(240 10% 97%)` → `#F5F5F7`
  - `--card` (`card-elevated`) — `hsl(0 0% 100%)` → `#FFFFFF`
  - Borders: `border-border` = `#E4E4E7`, `border-border-subtle` = `#E9E9EC`
- Dark mode tonal stack:
  - `--background` — `hsl(222 46% 11%)` → `#101728`
  - `--surface` — `hsl(222 38% 16%)` → `#1B2335`
  - `--card` — `hsl(222 32% 20%)` → `#27334D`
  - Borders: `border-border` = `#35415A`, `border-border-subtle` = `#2D384D`
- Component helpers live in `src/styles/design-system.css`. Use `card-elevated`, `session-card`, `analysis-panel`, etc. to stay on spec.
