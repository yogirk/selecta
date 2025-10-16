#!/bin/bash

set -euo pipefail

APP_SERVICE_NAME="selecta-app"
GCP_REGION="asia-east1"
ARTIFACT_REGISTRY_REPO="selecta-repo"
IMAGE_NAME="main-app"
TAG="latest"

cd "$(dirname "$0")/.."

if [ -f "./scripts/init.sh" ]; then
    echo "Sourcing configuration from init.sh..."
    # shellcheck disable=SC1091
    . ./scripts/init.sh
else
    echo "Error: ./scripts/init.sh not found!"
    exit 1
fi

if [ -z "${PROJECT_ID:-}" ]; then
    echo "Error: PROJECT_ID environment variable is not set after sourcing init.sh."
    exit 1
fi
echo "Using PROJECT_ID: $PROJECT_ID"

MAIN_IMAGE_NAME="${GCP_REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${IMAGE_NAME}:${TAG}"

echo "Setting gcloud project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

echo "Submitting backend-only Docker build..."
echo "Target image: $MAIN_IMAGE_NAME"
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_IMAGE_NAME="$MAIN_IMAGE_NAME" \
  --timeout=1200s \
  .

echo "Deploying Cloud Run service: $APP_SERVICE_NAME"
ENV_VARS="GOOGLE_GENAI_USE_VERTEXAI=0"
gcloud run deploy "$APP_SERVICE_NAME" \
    --image "$MAIN_IMAGE_NAME" \
    --region "$GCP_REGION" \
    --platform managed \
    --port 8080 \
    --set-env-vars "$ENV_VARS" \
    --min-instances 1 \
    --max-instances 1 \
    --allow-unauthenticated

SERVICE_URL=$(gcloud run services describe "$APP_SERVICE_NAME" --platform managed --region "$GCP_REGION" --format 'value(status.url)')
echo "Service URL: $SERVICE_URL"
