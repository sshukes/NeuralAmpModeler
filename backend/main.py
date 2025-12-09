# backend/main.py
import sys
from datetime import datetime, timedelta

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes_files import router as files_router
from .routes_training import router as training_router

print(f"[BACKEND] Python exe: {sys.executable}")
print(f"[BACKEND] NumPy version: {np.__version__}")

app = FastAPI(title="NAM Trainer Backend")

# CORS so Vite frontend can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------- Stub training runs API used by RunDetailsPage ----------

def build_stub_run(run_id: str) -> dict:
    """
    Return a stub training run with metrics + logs for ANY run_id.
    This makes the RunDetailsPage work even before we hook into real data.
    """
    now = datetime.utcnow()
    started = now - timedelta(minutes=10)
    ended = now

    started_iso = started.isoformat() + "Z"
    ended_iso = ended.isoformat() + "Z"

    metrics = [
        {"epoch": 1, "train_loss": 0.50, "val_loss": 0.45, "error_ratio": 0.60},
        {"epoch": 2, "train_loss": 0.42, "val_loss": 0.40, "error_ratio": 0.55},
        {"epoch": 3, "train_loss": 0.38, "val_loss": 0.36, "error_ratio": 0.50},
        {"epoch": 4, "train_loss": 0.34, "val_loss": 0.33, "error_ratio": 0.47},
        {"epoch": 5, "train_loss": 0.31, "val_loss": 0.31, "error_ratio": 0.44},
    ]

    logs = [
        {
            "timestamp": started_iso,
            "level": "INFO",
            "message": f"Training run {run_id} started",
        },
        {
            "timestamp": (started + timedelta(seconds=5)).isoformat() + "Z",
            "level": "INFO",
            "message": "Epoch 1 completed",
        },
        {
            "timestamp": (started + timedelta(seconds=10)).isoformat() + "Z",
            "level": "INFO",
            "message": "Epoch 2 completed",
        },
        {
            "timestamp": (started + timedelta(seconds=15)).isoformat() + "Z",
            "level": "INFO",
            "message": "Epoch 3 completed",
        },
        {
            "timestamp": ended_iso,
            "level": "INFO",
            "message": "Training finished successfully",
        },
    ]

    return {
        "id": run_id,
        "name": f"Stub training run {run_id}",
        "status": "COMPLETED",  # or RUNNING / QUEUED / FAILED / CANCELLED
        "startedAt": started_iso,
        "endedAt": ended_iso,
        "totalEpochs": len(metrics),
        "currentEpoch": len(metrics),
        "errorRatio": metrics[-1]["error_ratio"],
        "bestValLoss": min(m["val_loss"] for m in metrics),
        "device": "cpu",  # or "cuda"
        "metrics": metrics,
        "logs": logs,
    }


@app.get("/api/training-runs")
async def list_training_runs():
    """
    Simple list endpoint so the main trainer UI can show runs.
    Replace this with real data later.
    """
    return [
        {
            "id": "run_example_1",
            "name": "Recto Snapshot",
            "status": "COMPLETED",
            "startedAt": (datetime.utcnow() - timedelta(minutes=20)).isoformat() + "Z",
        },
        {
            "id": "run_example_2",
            "name": "Clean Twin",
            "status": "RUNNING",
            "startedAt": (datetime.utcnow() - timedelta(minutes=5)).isoformat() + "Z",
        },
    ]


@app.get("/api/training-runs/{run_id}")
async def get_training_run(run_id: str):
    """
    Details endpoint used by RunDetailsPage.
    Always returns a stub run for now.
    """
    return build_stub_run(run_id)


@app.post("/api/training-runs/{run_id}/stop")
async def stop_training_run(run_id: str):
    """
    Stub 'stop' endpoint so the Stop button doesn’t 404.
    Hook this into your actual trainer controller when ready.
    """
    return {"status": "stopped", "run_id": run_id}


# ---------- Existing routers ----------

app.include_router(files_router, prefix="/api")
app.include_router(training_router, prefix="/api")
