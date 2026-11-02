# BrainScan AI

BrainScan AI is a doctor-centric academic prototype for patient records, brain MRI examinations, AI-assisted review, and report drafting. This repository contains a React/Vite client, an Express/MongoDB API, and a separate Python/FastAPI DenseNet121 inference service.

> Academic decision-support prototype only. It is not a clinically validated diagnostic device. Use de-identified test images only; do not use real patient data without appropriate privacy, security, and clinical review.

## Project layout

```text
conversion/
├── client/                 React + Vite application
├── server/                 Express API and MongoDB models
├── ai-service/             FastAPI + DenseNet121 inference
└── README.md
```

The browser calls Express only. Express handles authentication, patient/scan/report APIs, private Cloudinary storage, and the gateway call to FastAPI.

## Requirements

- Node.js 20.19 or later and npm
- Python 3.12 recommended for the supplied TensorFlow 2.20 environment
- MongoDB Atlas database/connection string for a **fresh conversion database**
- Cloudinary account credentials
- Selected model artifact `final_brain_tumor_model.keras`

The converted app uses a new database and does not migrate the old Next.js/Better Auth user database. Public registration creates doctor accounts; admin access is granted separately through a server command.

## 1. Install JavaScript dependencies

From the `conversion/` directory:

```bash
npm install
```

This installs the root npm workspaces (`client` and `server`) and creates `package-lock.json`. Keep and share the lockfile with the code.

## 2. Configure Express

Create the server environment file:

```bash
cp server/.env.example server/.env
```

Set these values in `server/.env`:

```dotenv
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<fresh-database>
MONGODB_DB_NAME=brainscan_conversion
JWT_SECRET=<random-secret-at-least-32-characters>
CLIENT_ORIGIN=http://localhost:5173
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
AI_SERVICE_URL=http://localhost:8000/analyze
AI_SERVICE_API_KEY=<shared-random-secret>
```

Generate distinct random secrets locally:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use one value for `JWT_SECRET`; use the other for `AI_SERVICE_API_KEY` in both server and AI service environment files. Keep `.env` files private and never commit or paste their values into chat.

In MongoDB Atlas, allow your current public IP in Network Access and ensure the database user has read/write access to the fresh target database. Do not point this conversion at a production or legacy database.

## 3. Place the model and configuration files

Model files are ignored by Git (`*.keras`) because they are large artifacts. Obtain the selected model through an approved private file transfer and place it here:

```text
ai-service/models/final_brain_tumor_model.keras
```

The matching configuration files should be present at:

```text
ai-service/config/class_names.json
ai-service/config/preprocessing_config.json
ai-service/gradcam/gradcam_config.json
```

The provided inference configuration expects 224x224 RGB images, rescaled by 1/255, and the class order in `class_names.json`. Confirm the model file and these configs are from the same model run.

## 4. Set up Python/FastAPI

Create the AI service environment file:

```bash
cd ai-service
python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
```

Set the same `AI_SERVICE_API_KEY` value in `ai-service/.env` as in `server/.env`. The other model/config paths in the example default to the files listed above.

Start FastAPI from `conversion/ai-service`, keeping this terminal open:

```bash
set -a
source .env
set +a
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The first startup loads and validates the model, output class count, and configured Grad-CAM layer. A startup error means the model/config/dependencies need attention; do not proceed assuming the AI service is ready.

In another terminal, check the health response:

```bash
curl http://localhost:8000/health
```

Expected response includes `"loaded": true`.

## 5. Start Express

From the `conversion/` directory in another terminal:

```bash
npm run dev:server
```

Expected output: `BrainScan API listening on port 4000`.

Check the Express health endpoint:

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{"status":"ok"}
```

If startup reports `querySrv ECONNREFUSED`, Node cannot resolve the MongoDB Atlas SRV record. Check your Atlas hostname, local DNS/VPN/network filtering, then test with:

```bash
node -e 'require("node:dns").promises.resolveSrv("_mongodb._tcp.<atlas-host>").then(console.log).catch(console.error)'
```

Do not share the MongoDB URI while troubleshooting.

## 6. Start the Vite client

From the `conversion/` directory in another terminal:

```bash
npm run dev:client
```

Open `http://localhost:5173`. Vite proxies `/api` to Express at `http://localhost:4000`. If your Express server uses a different origin, create `client/.env` from `client/.env.example` and set `VITE_BACKEND_ORIGIN` to that backend origin, then restart Vite.

## 7. Create doctor and admin accounts

1. Register a doctor at `http://localhost:5173/register`.
2. To make an account an administrator, stop or leave the server running and use a terminal from `conversion/`:

```bash
npm run admin:promote --workspace @brainscan/server -- doctor@example.com
```

3. Sign out and sign back in. The promoted account should see the admin workspace. Public signup does not allow users to select the admin role.

## 8. Verify the main workflows

- Doctor: create/edit a patient, upload a de-identified PNG/JPG, open its private preview, analyze it, refresh and reopen saved analysis, save a report draft, finalize it, and open the private PDF.
- Admin: inspect system totals/trend, doctor access controls, patient/scan/report monitoring, model insights, and audit log.
- Check `CONVERSION_TEST_CHECKLIST.md` for detailed role, privacy, and edge-case checks.

The uploaded image must be non-empty PNG/JPG, have a valid file signature, and be at most 50 MB. DICOM is disabled until a safe de-identification workflow exists.

## AI response and mock mode

The Express gateway calls the FastAPI endpoint configured by `AI_SERVICE_URL` and sends a short-lived private Cloudinary URL. The FastAPI service validates that URL host and returns prediction, confidence, class probabilities, model metadata, processing time, and a Grad-CAM overlay. Real results and Grad-CAM references are stored on the scan; mock results are not persisted.

If `AI_SERVICE_URL` is unset, Express returns one clearly marked mock response. If a configured AI service fails, the request returns an error and does not substitute mock output. See `server/AI_SERVICE_CONTRACT.md` for the exact API contract.

## Reports and data safety

- Reports are drafts until a doctor explicitly finalizes them.
- Finalization stores a PDF as a private authenticated Cloudinary asset and marks the scan completed.
- Real AI results can be included; mock results are not saved as real findings.
- Password reset/email verification are not implemented.
- The displayed 90.94% DenseNet accuracy and class metrics are from supplied evaluation files. Confirm checkpoint/test-set provenance with the AIML team before formal presentation.

## Production cautions

Before any real-world use, review account approval/email verification, secrets management, MongoDB access, Cloudinary retention, patient-data privacy, audit completeness, deployment HTTPS/CORS, backups, and applicable clinical/regulatory requirements. This project is an academic prototype, not a certified medical device.
