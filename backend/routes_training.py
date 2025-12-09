# backend/routes_training.py
from pathlib import Path
import time
import uuid

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from .models import TrainingRunCreateRequest
from .store import file_meta, persist_run, runs
from .utils import to_iso
from .training_worker import start_training_for_run

router = APIRouter()


def iso_or_none(ts):
    return to_iso(ts) if ts is not None else None


@router.post("/training-runs")
async def create_training_run(payload: TrainingRunCreateRequest):
    in_meta = file_meta.get(payload.inputFileId)
    out_meta = file_meta.get(payload.outputFileId)

    if not in_meta or not out_meta:
        return JSONResponse(status_code=404, content={"detail": "One or both files not found"})

    in_path = Path(in_meta["storedPath"])
    out_path = Path(out_meta["storedPath"])

    if not in_path.exists() or not out_path.exists():
        return JSONResponse(status_code=404, content={"detail": "One or both files missing on disk"})

    run_id = f"run_{uuid.uuid4().hex}"
    now = time.time()

    runs[run_id] = {
        "runId": run_id,
        "name": payload.name,
        "description": payload.description,
        "status": "QUEUED",
        "createdAt": now,
        "startedAt": None,
        "updatedAt": now,
        "completedAt": None,
        "training": payload.training.model_dump(),
        "metadata": payload.metadata.model_dump() if payload.metadata else None,
        "progress": None,
        "metrics": None,
        "modelPath": None,
    }
    persist_run(runs[run_id])

    start_training_for_run(run_id, payload, in_path, out_path)

    return {
        "runId": run_id,
        "status": "QUEUED"
    }


@router.get("/training-runs/{run_id}")
async def get_training_run(run_id: str):
    run = runs.get(run_id)
    if not run:
        return JSONResponse(status_code=404, content={"detail": "Run not found"})

    return {
        "runId": run["runId"],
        "name": run["name"],
        "description": run["description"],
        "status": run["status"],
        "createdAt": iso_or_none(run["createdAt"]),
        "startedAt": iso_or_none(run["startedAt"]),
        "updatedAt": iso_or_none(run["updatedAt"]),
        "completedAt": iso_or_none(run["completedAt"]),
        "progress": run["progress"],
        "training": run["training"],
        "metadata": run["metadata"],
        "error": run.get("error"),
    }


@router.get("/training-runs")
async def list_training_runs(status: str | None = None, limit: int = 100):
    sorted_runs = sorted(
        runs.values(), key=lambda r: r.get("createdAt", 0) or 0, reverse=True
    )

    items = []
    for run in sorted_runs:
        if status and run.get("status") != status:
            continue

        metrics = run.get("metrics") or {}

        items.append(
            {
                "runId": run.get("runId"),
                "name": run.get("name"),
                "status": run.get("status"),
                "createdAt": iso_or_none(run.get("createdAt")),
                "completedAt": iso_or_none(run.get("completedAt")),
                "architecture": (run.get("training") or {}).get("architecture"),
                "device": (run.get("training") or {}).get("device"),
                "qualityScore": metrics.get("qualityScore"),
            }
        )

        if len(items) >= limit:
            break

    return {"items": items}


@router.get("/training-runs/{run_id}/metrics")
async def get_training_run_metrics(run_id: str):
    run = runs.get(run_id)
    if not run:
        return JSONResponse(status_code=404, content={"detail": "Run not found"})

    if run["metrics"] is None:
        return JSONResponse(status_code=202, content={"detail": "Metrics not ready yet"})

    return {
        "runId": run_id,
        "metrics": run["metrics"],
    }
