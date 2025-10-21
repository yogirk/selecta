#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'USAGE'
Usage: ./deploy-cloud-run.sh --project PROJECT_ID [options]

Builds the Selecta container image and deploys it to Cloud Run. The script
mirrors the manual deployment we validated (ADK + Next.js in one container)
and wires up the required environment variables and secret bindings.

Required arguments:
  --project PROJECT_ID        GCP project id

Optional arguments:
  --region REGION             Cloud Run region (default: us-central1)
  --service NAME              Cloud Run service name (default: selecta)
  --image IMAGE               Container image (default: gcr.io/PROJECT_ID/selecta)
  --tag TAG                   Image tag (default: current UTC timestamp)
  --env KEY=VALUE             Additional env vars (repeatable)
  --secret KEY=SECRET:VER     Additional Secret Manager bindings (repeatable)
  --service-account EMAIL     Service account for the runtime (default: PROJECT compute SA)
  --allow-unauthenticated     Expose service publicly
  --skip-build                Skip gcloud builds submit (reuse existing image)
  --help                      Show this message

Example:
  ./deploy-cloud-run.sh \\
    --project cloudside-academy \\
    --region us-central1 \\
    --service selecta \\
    --service-account 769170094354-compute@developer.gserviceaccount.com \\
    --secret GOOGLE_API_KEY=selecta-gemini-key:latest \\
    --allow-unauthenticated
USAGE
}

PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="selecta"
IMAGE=""
TAG=""
ALLOW_UNAUTH=false
SKIP_BUILD=false
ENV_VARS=()
SECRETS=()
SERVICE_ACCOUNT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --service)
      SERVICE_NAME="${2:-}"
      shift 2
      ;;
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --env)
      ENV_VARS+=("${2:-}")
      shift 2
      ;;
    --secret)
      SECRETS+=("${2:-}")
      shift 2
      ;;
    --service-account)
      SERVICE_ACCOUNT="${2:-}"
      shift 2
      ;;
    --allow-unauthenticated)
      ALLOW_UNAUTH=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      show_help >&2
      exit 1
      ;;
  esac
done

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: --project is required" >&2
  show_help >&2
  exit 1
fi

if [[ -z "${IMAGE}" ]]; then
  IMAGE="gcr.io/${PROJECT_ID}/selecta"
fi

if [[ -z "${TAG}" ]]; then
  TAG="$(date -u +%Y%m%d-%H%M%S)"
fi

IMAGE_PATH="${IMAGE}:${TAG}"

DEFAULT_DATASET_CONFIG="/opt/venv/lib/python3.12/site-packages/selecta/datasets/thelook.yaml"
DEFAULT_ENV="SELECTA_BACKEND_PORT=8081,SELECTA_DATASET_CONFIG=${DEFAULT_DATASET_CONFIG}"

if [[ -z "${SERVICE_ACCOUNT}" ]]; then
  SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"
  if gcloud iam service-accounts describe "${SERVICE_ACCOUNT}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    :
  else
    SERVICE_ACCOUNT="${PROJECT_ID}-compute@developer.gserviceaccount.com"
  fi
fi

echo "Deploy configuration"
echo "  Project          : ${PROJECT_ID}"
echo "  Region           : ${REGION}"
echo "  Service          : ${SERVICE_NAME}"
echo "  Image            : ${IMAGE_PATH}"
echo "  Service Account  : ${SERVICE_ACCOUNT}"
echo "  Allow unauth?    : ${ALLOW_UNAUTH}"

if [[ "${SKIP_BUILD}" != true ]]; then
  echo "==> Building container image"
  gcloud builds submit \
    --project "${PROJECT_ID}" \
    --tag "${IMAGE_PATH}"
else
  echo "==> Skipping build"
fi

declare -a DEPLOY_ARGS
DEPLOY_ARGS=(
  run deploy "${SERVICE_NAME}"
  --project "${PROJECT_ID}"
  --region "${REGION}"
  --image "${IMAGE_PATH}"
  --port 8080
  --set-env-vars "${DEFAULT_ENV}"
  --service-account "${SERVICE_ACCOUNT}"
)

if [[ ${#ENV_VARS[@]} -gt 0 ]]; then
  DEPLOY_ARGS+=(--set-env-vars "$(IFS=,; echo "${ENV_VARS[*]}")")
fi

if [[ ${#SECRETS[@]} -gt 0 ]]; then
  DEPLOY_ARGS+=(--set-secrets "$(IFS=,; echo "${SECRETS[*]}")")
fi

if [[ "${ALLOW_UNAUTH}" == true ]]; then
  DEPLOY_ARGS+=(--allow-unauthenticated)
fi

echo "==> Deploying to Cloud Run"
gcloud "${DEPLOY_ARGS[@]}"

echo "Deployment complete."
