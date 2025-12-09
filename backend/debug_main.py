# backend/debug_main.py
from fastapi import FastAPI
from datetime import datetime

app = FastAPI()


@app.get("/api/training-runs/{run_id}")
async def get_training_run(run_id: str):
    """
    ALWAYS returns a stub run, regardless of run_id.
    This is purely for wiring up the frontend.
    """
    now = datetime.utcnow().isoformat() + "Z"

    metrics = [
        {"epoch": 1, "train_loss": 0.5,  "val_loss": 0.45, "error_ratio": 0.60},
        {"epoch": 2, "train_loss": 0.42, "val_loss": 0.40, "error_ratio": 0.55},
        {"epoch": 3, "train_loss": 0.38, "val_loss": 0.36, "error_ratio": 0.50},
        {"epoch": 4, "train_loss": 0.34, "val_loss": 0.33, "error_ratio": 0.47},
    ]

    logs = [
        {"timestamp": now, "level": "INFO", "message": f"Loaded stub run {run_id}"},
        {"timestamp": now, "level": "INFO", "message": "Epoch 1 completed"},
        {"timestamp": now, "level": "INFO", "message": "Epoch 2 completed"},
    ]

    return {
        "id": run_id,
        "name": f"Stub training run {run_id}",
        "status": "COMPLETED",
        "startedAt": now,
        "endedAt": now,
        "totalEpochs": 4,
        "currentEpoch": 4,
        "errorRatio": 0.3496,
        "bestValLoss": 0.01234,
        "device": "cpu",
        "metrics": metrics,
        "logs": logs,
    }


@app.post("/api/training-runs/{run_id}/stop")
async def stop_training_run(run_id: str):
    # Just to keep the Stop button happy
    return {"status": "stopped", "run_id": run_id}
