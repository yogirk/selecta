# Cloud Run Deployment

The Selecta container bundles both the ADK backend (port 8081) and the Next.js
frontend (port 8080). The entrypoint waits for the ADK server to bind to
`http://127.0.0.1:8081/docs` before launching the frontend, so a failed backend
startup will surface as a readable error in Cloud Logging rather than an
anonymous proxy failure.

## Prerequisites

- Cloud SDK (`gcloud`) with the Cloud Run and Cloud Build components
- Gemini API key stored in Secret Manager (e.g. `selecta-gemini-key`)
- Service account with BigQuery access *and* `roles/secretmanager.secretAccessor`
  on the Gemini key secret (for example `PROJECT_ID-compute@developer.gserviceaccount.com`)

Grant the secret accessor role if needed:

```bash
gcloud secrets add-iam-policy-binding selecta-gemini-key \
  --project YOUR_PROJECT \
  --member "serviceAccount:YOUR_PROJECT-compute@developer.gserviceaccount.com" \
  --role roles/secretmanager.secretAccessor
```

## Build & Deploy

Run the helper script:

```bash
./deploy-cloud-run.sh \
  --project YOUR_PROJECT \
  --region us-central1 \
  --service selecta \
  --service-account YOUR_PROJECT-compute@developer.gserviceaccount.com \
  --secret GOOGLE_API_KEY=selecta-gemini-key:latest \
  --allow-unauthenticated
```

The script performs:

1. `gcloud builds submit` (unless `--skip-build` is passed)
2. `gcloud run deploy` with:
   - `--set-env-vars SELECTA_BACKEND_PORT=8081,SELECTA_DATASET_CONFIG=/opt/venv/lib/python3.12/site-packages/selecta/datasets/thelook.yaml`
   - Any extra `--env`/`--secret` flags you provide
   - The specified service account and auth mode

To point at a different dataset descriptor, add
`--env SELECTA_DATASET_CONFIG=/app/my-dataset.yaml`.

## Verification

After deployment the service outputs the Cloud Run URL. Open `/docs` to confirm
`HTTP 200`:

```bash
curl -I https://selecta-<SERVICE_HASH>-<PROJECT>.us-central1.run.app/docs
```

To inspect the backend logs (including ADK failures):

```bash
gcloud run services logs read selecta \
  --project YOUR_PROJECT \
  --region us-central1 \
  --limit 200
```

Look for the `[startup]` messages and, if the backend crashes, the
`[backend-log]` dump that prints the ADK stack trace.

## Emulator / Local smoke test

You can run the production image locally before deploying:

```bash
docker run --rm -p 8080:8080 \
  -e GOOGLE_API_KEY=YOUR_KEY \
  gcr.io/YOUR_PROJECT/selecta:TAG

curl -I http://localhost:8080/docs
```

The local run uses the same readiness loop, so missing credentials or dataset
issues are surfaced immediately.
