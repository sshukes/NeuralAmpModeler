# backend/store.py
import json
import re
from pathlib import Path
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


def _version_key(path: Path) -> tuple[int, str]:
    match = re.search(r"(\d+)$", path.name)
    return (int(match.group(1)) if match else -1, path.name)


def latest_exported_model_path(run_dir: Path) -> Path | None:
    """Return the newest exported NAM file within a run directory.

    The exporter writes models under ``exported_models/version_<n>/``. We pick the
    highest version number (falling back to direct children of ``exported_models``)
    and then return the first ``*.nam`` file in that folder.
    """

    exported_dir = run_dir / "exported_models"
    if not exported_dir.exists():
        return None

    version_dirs = [p for p in exported_dir.iterdir() if p.is_dir()]
    if version_dirs:
        latest_version_dir = max(version_dirs, key=_version_key)
        candidates = sorted(latest_version_dir.glob("*.nam"))
        if candidates:
            return candidates[0]

    # Fallback for legacy layout where files live directly under exported_models
    candidates = sorted(exported_dir.glob("*.nam"))
    if candidates:
        return candidates[0]

    return None


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


def delete_run_directory(run_id: str) -> tuple[list[str], list[str]]:
    """Remove a run's directory, including metadata and exported artifacts."""

    removed_paths: list[str] = []
    errors: list[str] = []

    run_dir = RUNS_DIR / run_id
    if not run_dir.exists():
        return removed_paths, errors

    # Delete files before directories (deepest paths first)
    for path in sorted(
        run_dir.rglob("*"), key=lambda p: len(p.relative_to(run_dir).parts), reverse=True
    ):
        try:
            if path.is_file() or path.is_symlink():
                path.unlink()
            else:
                path.rmdir()
            removed_paths.append(str(path))
        except OSError as exc:  # pragma: no cover - best effort cleanup
            errors.append(f"Failed to remove {path}: {exc}")

    try:
        run_dir.rmdir()
        removed_paths.append(str(run_dir))
    except OSError as exc:  # pragma: no cover - best effort cleanup
        errors.append(f"Failed to remove {run_dir}: {exc}")

    return removed_paths, errors


def _fallback_run_from_directory(run_dir: Path) -> dict | None:
    """Try to synthesize minimal run metadata if the run.json is missing."""
    run_id = run_dir.name

    # Reconstruct minimal timestamps from the directory metadata.
    try:
        stat = run_dir.stat()
        created = stat.st_mtime
    except OSError:  # pragma: no cover - best effort only
        created = None

    model_path = latest_exported_model_path(run_dir)
    if model_path:
        model_path = str(model_path)

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
