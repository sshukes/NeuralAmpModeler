# backend/store.py
from pathlib import Path
import json
from typing import Dict, Any

# Base paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
FILES_DIR = DATA_DIR / "files"
RUNS_DIR = DATA_DIR / "runs"

for d in (DATA_DIR, FILES_DIR, RUNS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# In-memory “DB” – simple for now
file_meta: Dict[str, dict] = {}
runs: Dict[str, dict] = {}

RUN_META_FILENAME = "run.json"


def persist_run(run_entry: Dict[str, Any]) -> None:
    """Write a run's metadata to disk for persistence across restarts."""
    run_id = run_entry.get("runId")
    if not run_id:
        return

    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    meta_path = run_dir / RUN_META_FILENAME
    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(run_entry, f, indent=2)


def _fallback_run_from_directory(run_dir: Path) -> dict | None:
    """Try to synthesize minimal run metadata if the run.json is missing."""
    run_id = run_dir.name

    # Reconstruct minimal timestamps from the directory metadata.
    try:
        stat = run_dir.stat()
        created = stat.st_mtime
    except OSError:  # pragma: no cover - best effort only
        created = None

    model_path = None
    exported_dir = run_dir / "exported_models"
    if exported_dir.exists():
        candidates = sorted(exported_dir.glob("*.nam"))
        if candidates:
            model_path = str(candidates[0])

    status = "COMPLETED" if model_path else "UNKNOWN"

    run_entry = {
        "runId": run_id,
        "name": run_id,
        "description": None,
        "status": status,
        "createdAt": created,
        "startedAt": created,
        "updatedAt": created,
        "completedAt": created if status == "COMPLETED" else None,
        "training": {},
        "metadata": None,
        "progress": None,
        "metrics": None,
        "modelPath": model_path,
    }

    print(f"[STORE] Synthesized run metadata for {run_id} (status={status}).")
    return run_entry


def load_runs_from_disk() -> None:
    """Hydrate the in-memory run store from any run metadata found on disk."""
    for child in RUNS_DIR.iterdir():
        if not child.is_dir():
            continue

        meta_path = child / RUN_META_FILENAME

        if meta_path.exists():
            try:
                run_data = json.loads(meta_path.read_text())
            except Exception as exc:  # pragma: no cover - defensive logging only
                print(f"[STORE] Failed to load run metadata from {meta_path}: {exc}")
                continue
        else:
            run_data = _fallback_run_from_directory(child)
            if run_data:
                persist_run(run_data)
            else:
                continue

        run_id = run_data.get("runId") or child.name
        run_data["runId"] = run_id
        runs[run_id] = run_data


# Load any existing runs on startup so they appear in the UI even after restarts.
load_runs_from_disk()
