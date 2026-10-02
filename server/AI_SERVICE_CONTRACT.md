# AI service gateway contract

The doctor-authenticated route is `POST /api/scans/:scanId/analyze`. It checks scan ownership, stores real FastAPI prediction metadata on the scan, and changes its status to `needs_review`. Grad-CAM PNG data URLs are uploaded to Cloudinary as authenticated assets; only the private asset ID and format are stored in MongoDB. The response carries a five-minute signed Grad-CAM URL. Mock responses are never persisted.

Use `GET /api/scans/:scanId/analysis` to fetch a previously saved real result and mint a fresh short-lived Grad-CAM URL. The route returns 404 when no real analysis has been saved. The scan list includes result summary metadata so the UI can present a **View analysis** action without rerunning inference.

## Mock behavior

When `AI_SERVICE_URL` is unset, the service returns one deterministic fixture from `src/services/aiService.js`. It includes `source: "mock"`, `isMock: true`, and the prominent disclaimer `MOCK AI RESPONSE — NOT A REAL ANALYSIS OR MEDICAL RESULT`. It is simulated UI/demo data, not a diagnosis, and is not persisted. The mock path does not read or send the image.

## FastAPI request

Set `AI_SERVICE_URL` to the FastAPI POST endpoint and set the same private random key in `AI_SERVICE_API_KEY` for both Express and FastAPI. The gateway sends a bearer token plus JSON:

```json
{
  "scanId": "MRI-EXAMPLE",
  "imageUrl": "https://short-lived-private-cloudinary-url",
  "format": "jpg"
}
```

`imageUrl` is an authenticated Cloudinary URL signed for five minutes. Cloudinary's `private_download_url` may use `api.cloudinary.com`; delivery URLs may use `res.cloudinary.com`. The service accepts HTTPS URLs only from those Cloudinary hosts, fetches the URL promptly, and must not retain, expose, or log the URL or image contents.

## FastAPI response

Return JSON matching this structure. Confidence and class probabilities are fractions from 0 to 1.

```json
{
  "prediction": { "predictedClass": "class label", "confidence": 0.75 },
  "classProbabilities": [{ "className": "class label", "probability": 0.75 }],
  "gradCamUrl": null,
  "model": { "name": "model name", "version": "model version" },
  "processingTimeMs": 250
}
```

The gateway validates the response with Zod and adds `source: "fastapi"`, `isMock: false`, and `mockDisclaimer: null`. Timeout, network failure, non-2xx response, invalid JSON, or schema mismatch returns an error; a configured service failure never silently falls back to mock data.

## Running the selected DenseNet service

The selected artifact is `ai-service/models/final_brain_tumor_model.keras`. Runtime settings and commands are documented in `ai-service/README.md`. Use the same `AI_SERVICE_API_KEY` in both service environment files.

## Manual smoke test

With the server running, a doctor JWT, and an owned scan:

```sh
curl -X POST http://localhost:4000/api/scans/MRI-YOURSCANID/analyze \
  -H "Authorization: Bearer $TOKEN"
```

With `AI_SERVICE_URL` unset, expect the conspicuous mock disclaimer. With it configured, expect validated FastAPI output or an explicit gateway error.
