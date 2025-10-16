#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Load Environment Variables ---
# Load variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  set -a # Automatically export all variables
  . ./.env # Source the .env file
  set +a # Turn off auto-export
else
  echo "Warning: .env file not found. Ensure necessary environment variables are set."
fi

# --- API Server Start ---
echo "Starting FastAPI server with Uvicorn..."

if [ ! -f "service/api.py" ]; then
  echo "ERROR: 'service/api.py' not found. Cannot start Uvicorn."
  exit 1
fi

PORT="${PORT:-8080}"
HOST="${HOST:-0.0.0.0}"

echo "Attempting to start Uvicorn on ${HOST}:${PORT}..."
exec uvicorn service.api:app --host "${HOST}" --port "${PORT}"
