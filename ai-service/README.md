# BrainScan DenseNet121 inference service

This FastAPI application loads the selected `models/final_brain_tumor_model.keras` model, uses the supplied class/preprocessing/Grad-CAM configs, fetches a short-lived private Cloudinary image, and returns prediction probabilities plus a Grad-CAM overlay data URL.

## Setup

Python 3.10–3.12 is recommended. From `conversion/ai-service`:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
```

Generate a long random key, for example with `openssl rand -hex 32`, and put the same value in `AI_SERVICE_API_KEY` in both `ai-service/.env` and `server/.env`. Keep both env files private and untracked.

Start from `conversion/ai-service` with:

```sh
set -a
source .env
set +a
uvicorn main:app --host 0.0.0.0 --port 8000
```

The service validates model input/output shape, class count, and Grad-CAM target shape at startup. `/health` reports whether the model loaded. `POST /analyze` requires `Authorization: Bearer <AI_SERVICE_API_KEY>` and the gateway JSON contract described in `../server/AI_SERVICE_CONTRACT.md`.

Set `AI_SERVICE_URL=http://localhost:8000/analyze` in `conversion/server/.env`. The Express host must be able to reach the FastAPI host. For deployment, use private networking and HTTPS where applicable; do not expose this service publicly without access controls.

## Important notes

- The model is not downloaded by this service; keep the `.keras` file at the configured path.
- Inference uses the provided 224×224 RGB, 1/255 input preprocessing and the class order in `config/class_names.json`.
- Grad-CAM uses `conv5_block16_2_conv` as configured. Its overlay is returned as a `data:image/png;base64,...` URL in the response.
- Input images are kept in memory and not saved by this app. The service only fetches HTTPS URLs from `api.cloudinary.com` or `res.cloudinary.com`.
- Use de-identified development images only. This academic prototype does not provide clinically validated diagnosis.
