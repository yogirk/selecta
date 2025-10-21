# Selecta Roadmap

This roadmap tracks the core workstreams we plan to tackle next. 

🔜 we will have issue-by-issue progress, on GitHub issue tracker. 

## Near-term

- **Guided Drill-downs** – generate follow-up questions based on result schemas and persist them alongside result history so clients can surface contextual “next steps.”
- **Automated QA Harness** – add integration tests for the ADK streaming contract and smoke tests for critical frontend flows (chat send, visualization render, result meta).
- **Observability & Telemetry** – expose optional BigQuery job metrics, latency histograms, and prompt/response sampling hooks for production monitoring. (partially implemented)

## Backlog

- Multi-dataset session switching from the UI (mirroring the dataset catalog endpoints).
- Vertex AI deployment presets, including IAM guidance and Terraform snippets.
- Advanced visualization fallbacks (geospatial layers, KPI cards) when heuristics cannot suggest a chart.

## Recently Shipped

- Streaming UX rewrite with structured Markdown responses, reasoning isolation, and a Meta tab that surfaces job latency, row counts, and dataset provenance.
- BigQuery tool upgrades that attach stable result IDs, execution metadata, and Vega-Lite specs to every streaming payload.
- Shadcn-based frontend refresh with (almost) glassmorphic layout, responsive session rail, and zero-config dark mode.
