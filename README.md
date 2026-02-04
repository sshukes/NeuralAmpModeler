# Neural Amp Modeler Trainer

## Summary
Neural Amp Modeler Trainer is a full-stack app for uploading paired input/output audio, validating files, detecting latency, and running Neural Amp Modeler (NAM) training jobs. The frontend is a Vite + React app that drives the workflow, while the backend is a FastAPI service that manages files, training runs, and model exports.

## How it works
- **Frontend (Vite + React):**
  - Provides pages to create training runs, list runs, and inspect run details via React Router routes.
  - Talks to the backend over REST endpoints for file upload, inspection, latency detection, and training status.
- **Backend (FastAPI):**
  - Exposes `/api/files` endpoints to upload WAV files, inspect their format, and detect latency using cross-correlation.
  - Exposes `/api/training-runs` endpoints to create and track NAM training jobs, persist run metadata, and download exported `.nam` models.
  - Spawns a background worker thread for each training run. The worker repairs audio, patches certain NAM validations, launches NAM training, and records run status/metrics.

## Dependencies
### Frontend (Node)
- React + React Router
- Vite for dev/build tooling
- MUI + Emotion for UI components and styling
- Recharts for charts
- Vitest for frontend testing

### Backend (Python)
- FastAPI + Uvicorn for the API server
- numpy and soundfile for audio inspection and latency detection
- torch and neural-amp-modeler for training
- python-multipart for file uploads

## Development (optional)
- `npm run dev` — start the Vite frontend.
- `npm run dev:backend` — start the FastAPI backend.
- `npm run dev:full` — run both together.

