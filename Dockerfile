# syntax=docker/dockerfile:1

FROM node:22-bookworm AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
# Drop development-only environment overrides so production rewrites stay active.
RUN rm -f .env.local
RUN npm run build

FROM python:3.12-slim AS backend-builder
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "${VIRTUAL_ENV}"
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

WORKDIR /app/backend
COPY backend /app/backend

RUN pip install --upgrade pip \
 && pip install --no-cache-dir .

FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:/usr/local/bin:${PATH}" \
    NODE_ENV=production \
    SELECTA_BACKEND_PORT=8081 \
    PORT=8080

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl libstdc++6 \
 && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /opt/venv /opt/venv

COPY --from=frontend-builder /usr/local/bin/node /usr/local/bin/node
COPY --from=frontend-builder /usr/local/lib/node_modules /usr/local/lib/node_modules

COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

COPY --from=backend-builder /app/backend/selecta/datasets ./datasets
COPY --from=backend-builder /app/backend/app ./app

COPY docker/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 8080

CMD ["./start.sh"]
