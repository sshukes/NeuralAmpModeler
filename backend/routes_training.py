# backend/routes_training.py
from pathlib import Path
import time
import uuid

import json
from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse

from .models import NamMetadataResponse, TrainingMetadata, TrainingRunCreateRequest
from .store import RUNS_DIR, file_meta, latest_exported_model_path, persist_run, runs
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

    run_dir = RUNS_DIR / run_id
    return latest_exported_model_path(run_dir) is not None


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

    chosen = latest_exported_model_path(RUNS_DIR / run_id)
    if not chosen:
        return None
    run["modelPath"] = str(chosen)
    persist_run(run)
    return chosen


USER_METADATA_KEY = "userMetadata"


def _read_nam_file(model_path: Path) -> dict | None:
    try:
        content = model_path.read_text()
    except OSError:
        return None

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


def _extract_user_metadata(nam_blob: dict | None) -> dict:
    metadata = (nam_blob or {}).get("metadata") or {}
    user_metadata = metadata.get(USER_METADATA_KEY)
    return user_metadata if isinstance(user_metadata, dict) else {}


def _coerce_training_metadata(raw: dict | None) -> TrainingMetadata:
    if not isinstance(raw, dict):
        return TrainingMetadata()

    allowed_keys = set(TrainingMetadata.model_fields.keys())
    filtered = {k: v for k, v in raw.items() if k in allowed_keys}
    return TrainingMetadata(**filtered)


def _persist_user_metadata(model_path: Path, nam_blob: dict, payload: TrainingMetadata) -> dict:
    metadata = nam_blob.setdefault("metadata", {})
    user_metadata = payload.model_dump(exclude_none=True)
    metadata[USER_METADATA_KEY] = user_metadata

    model_path.write_text(json.dumps(nam_blob, indent=2))
    return user_metadata


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


@router.get("/training-runs/{run_id}/nam-metadata", response_model=NamMetadataResponse)
async def get_training_run_nam_metadata(run_id: str):
    run = runs.get(run_id)
    if not run:
        return JSONResponse(status_code=404, content={"detail": "Run not found"})

    model_path = resolve_model_path(run)
    if not model_path or not model_path.exists():
        return JSONResponse(status_code=404, content={"detail": "NAM file not available for this run"})

    nam_blob = _read_nam_file(model_path)
    user_metadata = _extract_user_metadata(nam_blob)

    if not user_metadata:
        # Fall back to whatever we have stored alongside the run
        user_metadata = run.get("metadata") or {}

    return {
        "runId": run_id,
        "namFilename": model_path.name,
        "metadata": _coerce_training_metadata(user_metadata),
    }


@router.put("/training-runs/{run_id}/nam-metadata", response_model=NamMetadataResponse)
async def update_training_run_nam_metadata(run_id: str, payload: TrainingMetadata):
    run = runs.get(run_id)
    if not run:
        return JSONResponse(status_code=404, content={"detail": "Run not found"})

    model_path = resolve_model_path(run)
    if not model_path or not model_path.exists():
        return JSONResponse(status_code=404, content={"detail": "NAM file not available for this run"})

    nam_blob = _read_nam_file(model_path)
    if nam_blob is None:
        return JSONResponse(status_code=400, content={"detail": "Unable to read NAM file"})

    user_metadata = _persist_user_metadata(model_path, nam_blob, payload)

    # Keep the in-memory and on-disk run metadata aligned with the NAM file
    run["metadata"] = user_metadata
    persist_run(run)

    return {
        "runId": run_id,
        "namFilename": model_path.name,
        "metadata": _coerce_training_metadata(user_metadata),
    }


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
