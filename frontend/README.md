# Selecta Frontend

Selecta’s Next.js client delivers the streaming conversational experience: reasoning collapses into a “View reasoning” toggle, the chat bubble renders structured Markdown (`Summary`, `Results`, `Business Insights`), and the right rail exposes Chart, Table, SQL, and Meta panels in sync with the backend stream.

## Features

- ✨ Real-time chat with SSE streaming and collapsible reasoning trace
- 📊 Vega-Lite visualisations rendered directly from the backend chart spec
- 🧾 Structured Markdown answers with automatic formatting
- 🪪 Meta tab showing BigQuery job latency, job ID, and dataset provenance
- 🔄 Session rail backed by Zustand for instant switching
- 🎨 Shadcn + Tailwind 4 design system with light/dark parity

## Quick start

```bash
npm install
cp .env.local.example .env.local         # adjust NEXT_PUBLIC_API_URL if the backend runs elsewhere
npm run dev
# open http://localhost:3000
```

> The ADK backend must be running. See `../backend/README.md` for setup.

## Project structure

```
src/
├── app/                 # Next.js App Router entrypoints
├── components/          # UI building blocks (chat, results rail, layout)
├── hooks/               # Streaming + session hooks
├── lib/                 # API client, Zustand store, utilities
├── styles/              # Tailwind tokens & design system helpers
└── types/               # Shared TypeScript types
```

## Tabs at a glance

| Tab | Data source | Notes |
| --- | --- | --- |
| **Chart** | `result.chart` (Vega-Lite) | Rendered with `react-vega`; no extra fetches. |
| **Table** | `result.rows` / `result.columns` | Displays the first 10 rows for a quick preview. |
| **SQL** | `result.sql` | Copy-friendly GoogleSQL executed by the agent. |
| **Meta** | `result.executionMs`, `result.jobId`, `result.dataset`, `result.createdAt`, `result.rowCount` | Surfaces runtime telemetry and dataset provenance. |

## Technologies

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + Shadcn UI
- **State**: Zustand
- **Charts**: Vega-Lite + `react-vega`
- **Icons**: Lucide React

## Development commands

```bash
npm run dev      # Start the dev server
npm run build    # Production build
npm run start    # Serve the production build
npm run lint     # ESLint
```

## License

Apache 2.0 – see the repository root `LICENSE`.
