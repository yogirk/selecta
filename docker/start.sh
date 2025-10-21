#!/usr/bin/env bash
set -Eeuo pipefail

SELECTA_DATASET_CONFIG="${SELECTA_DATASET_CONFIG:-/opt/venv/lib/python3.12/site-packages/selecta/datasets/thelook.yaml}"
export SELECTA_DATASET_CONFIG

BACKEND_PORT="${SELECTA_BACKEND_PORT:-8081}"
FRONTEND_PORT="${PORT:-8080}"

if [[ -z "${GOOGLE_API_KEY:-}" ]]; then
  echo "[error] GOOGLE_API_KEY is not set"
else
  echo "[startup] GOOGLE_API_KEY detected"
fi

if [[ ! -f "${SELECTA_DATASET_CONFIG}" ]]; then
  echo "[error] Dataset config not found at ${SELECTA_DATASET_CONFIG}"
else
  echo "[startup] Using dataset config ${SELECTA_DATASET_CONFIG}"
fi

echo "[startup] Launching ADK backend on port ${BACKEND_PORT}"
BACKEND_LOG="/tmp/adk.log"
rm -f "${BACKEND_LOG}"
adk api_server app --allow_origins "*" --port "${BACKEND_PORT}" 2>&1 | tee "${BACKEND_LOG}" &
BACKEND_PID=$!
FRONTEND_PID=""

sleep 1
if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
  echo "[error] ADK backend exited during startup"
  if [[ -f "${BACKEND_LOG}" ]]; then
    cat "${BACKEND_LOG}"
  fi
  exit 1
fi

BACKEND_READY=false
for attempt in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/docs" >/dev/null 2>&1; then
    BACKEND_READY=true
    echo "[startup] ADK backend is ready"
    break
  fi
  if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
    echo "[error] ADK backend terminated while waiting for readiness"
    if [[ -f "${BACKEND_LOG}" ]]; then
      cat "${BACKEND_LOG}"
    fi
    exit 1
  fi
  sleep 2
done

if [[ "${BACKEND_READY}" != true ]]; then
  echo "[error] ADK backend did not become ready"
  if [[ -f "${BACKEND_LOG}" ]]; then
    cat "${BACKEND_LOG}"
  fi
  exit 1
fi

terminate() {
  echo "[shutdown] Stopping services"
  if [[ -n "${BACKEND_PID}" ]]; then
    if kill -0 "${BACKEND_PID}" 2>/dev/null; then
      kill "${BACKEND_PID}" 2>/dev/null || true
    fi
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [[ -f "${BACKEND_LOG}" ]]; then
    echo "[backend-log] dumping last 200 lines"
    tail -n 200 "${BACKEND_LOG}"
  fi
  if [[ -n "${FRONTEND_PID}" ]]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
    wait "${FRONTEND_PID}" 2>/dev/null || true
  fi
}

trap terminate SIGINT SIGTERM

echo "[startup] Launching Next.js frontend on port ${FRONTEND_PORT}"
NODE_ENV=production PORT="${FRONTEND_PORT}" node /app/frontend/server.js &
FRONTEND_PID=$!

wait -n "${BACKEND_PID}" "${FRONTEND_PID}"
EXIT_CODE=$?

terminate
exit "${EXIT_CODE}"
