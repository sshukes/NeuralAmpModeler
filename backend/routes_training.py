# backend/routes_training.py
from pathlib import Path
import time
import uuid

from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse

from .models import TrainingRunCreateRequest
from .store import RUNS_DIR, file_meta, persist_run, runs
from .utils import to_iso
from .training_worker import start_training_for_run

router = APIRouter()


def iso_or_none(ts):
    return to_iso(ts) if ts is not None else None


def has_nam_export(run: dict) -> bool:
    """Check if a run has an exported .nam model file."""
    model_path = run.get("modelPath")
    if model_path:
        if Path(model_path).exists():
            return True

    run_id = run.get("runId")
    if not run_id:
        return False

    exported_dir = RUNS_DIR / run_id / "exported_models"
    return exported_dir.exists() and any(exported_dir.glob("*.nam"))


def resolve_model_path(run: dict) -> Path | None:
    """Find a concrete model path for a run, updating it in-place when possible."""
    model_path = run.get("modelPath")
    if model_path:
        path_obj = Path(model_path)
        if path_obj.exists():
            return path_obj

    run_id = run.get("runId")
    if not run_id:
        return None

    exported_dir = RUNS_DIR / run_id / "exported_models"
    candidates = sorted(exported_dir.glob("*.nam"))
    if not candidates:
        return None

    chosen = candidates[0]
    run["modelPath"] = str(chosen)
    persist_run(run)
    return chosen


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
        "metricsHistory": [],
        "logs": [],
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

    metrics_history = run.get("metricsHistory") or []
    metrics_summary = run.get("metrics")
    logs = run.get("logs") or []
    model_path = resolve_model_path(run)
    model_url = None
    model_filename = None
    if model_path:
        model_url = f"/api/training-runs/{run_id}/model"
        model_filename = model_path.name

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
        "metrics": metrics_history,
        "metricsSummary": metrics_summary,
        "logs": logs,
        "modelPath": str(model_path) if model_path else run.get("modelPath"),
        "namUrl": model_url,
        "namFilename": model_filename,
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
        model_path = resolve_model_path(run)
        run_id = run.get("runId")
        nam_url = f"/api/training-runs/{run_id}/model" if model_path and run_id else None

        items.append(
            {
                "runId": run_id,
                "name": run.get("name"),
                "status": run.get("status"),
                "createdAt": iso_or_none(run.get("createdAt")),
                "completedAt": iso_or_none(run.get("completedAt")),
                "architecture": (run.get("training") or {}).get("architecture"),
                "device": (run.get("training") or {}).get("device"),
                "qualityScore": metrics.get("qualityScore"),
                "namStatus": "NAM CREATED" if model_path else "",
                "namUrl": nam_url,
                "namFilename": model_path.name if model_path else None,
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
        "metricsHistory": run.get("metricsHistory") or [],
    }


@router.get("/training-runs/{run_id}/model")
async def download_training_run_model(run_id: str):
    run = runs.get(run_id)
    if not run:
        return JSONResponse(status_code=404, content={"detail": "Run not found"})

    model_path = resolve_model_path(run)
    if not model_path or not model_path.exists():
        return JSONResponse(status_code=404, content={"detail": "NAM file not available for this run"})

    return FileResponse(
        model_path,
        media_type="application/octet-stream",
        filename=model_path.name,
    )
