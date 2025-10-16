FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install uv to manage dependencies inside the container
RUN pip install --no-cache-dir "uv>=0.4.0"

# Copy project metadata and source required to resolve dependencies
COPY pyproject.toml README.md ./
COPY selecta ./selecta
COPY service ./service

# Install runtime dependencies into the system interpreter
RUN uv pip install --system .

# Copy entrypoint script last to avoid invalidating dependency layers unnecessarily
COPY entrypoint.sh .
RUN chmod +x ./entrypoint.sh

ENV PORT=8080

EXPOSE 8080

CMD ["./entrypoint.sh"]
