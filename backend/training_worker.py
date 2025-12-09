# backend/training_worker.py
from pathlib import Path
import threading
import shutil
import os
import time
from typing import Optional

import matplotlib
matplotlib.use("Agg") 

import torch  # noqa: F401
from nam.train import core as nam_core
from nam import data as nam_data
from nam.train.colab import run as nam_run

from .store import RUNS_DIR, file_meta, persist_run, runs
from .audio_io import repair_audio_in_place
from .models import TrainingRunCreateRequest


def _patch_nam_validations():
    """
    Optional monkey patches similar to your script:
      - bypass strict input version check
      - bypass silence validation
    """
    class FakeVersion:
        def __init__(self, major, minor, patch):
            self.major = major
            self.minor = minor
            self.patch = patch

        def __str__(self):
            return f"{self.major}.{self.minor}.{self.patch}"

    def force_validate_input(input_path):
        print("   🛡️ BYPASS: Skipping 'Version Check' for custom files.")
        return FakeVersion(3, 0, 0), False

    nam_core._detect_input_version = force_validate_input  # type: ignore[attr-defined]

    def fake_silence_check(cls, x, start, silent_seconds, sample_rate):
        return

    nam_data.Dataset._validate_preceding_silence = fake_silence_check  # type: ignore[attr-defined]
    print("   🛡️ BYPASS: Disabled internal silence validators.")


def _run_training_worker(run_id: str, payload: TrainingRunCreateRequest, in_path: Path, out_path: Path):
    run_entry = runs.get(run_id)
    if not run_entry:
        print(f"[TRAIN {run_id}] Missing run entry.")
        return

    try:
        print(f"[TRAIN {run_id}] Starting...")
        run_entry["status"] = "RUNNING"
        run_entry["startedAt"] = time.time()
        run_entry["updatedAt"] = run_entry["startedAt"]
        persist_run(run_entry)

        print("[TRAIN] --- STEP 1: PREPARING AUDIO ---")
        repair_audio_in_place(in_path)
        repair_audio_in_place(out_path)
        print("[TRAIN] --------------------------------")

        run_dir = RUNS_DIR / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        in_original_name = Path(file_meta[payload.inputFileId]["originalFilename"]).name
        di_target = run_dir / in_original_name
        out_target = run_dir / "output.wav"
        di_inputwav = run_dir / "input.wav"

        shutil.copy2(in_path, di_target)
        shutil.copy2(in_path, di_inputwav)
        shutil.copy2(out_path, out_target)

        print("[TRAIN] --- STEP 2: PATCHING LIBRARY ---")
        _patch_nam_validations()
        print("[TRAIN] --------------------------------")

        print("[TRAIN] --- STEP 3: STARTING TRAINING ---")
        cwd_before = os.getcwd()
        os.chdir(run_dir)
        try:
            kwargs = {
                "epochs": payload.training.epochs,
                "architecture": payload.training.architecture,
                "latency_samples": payload.latencySamples,
                "ignore_checks": payload.training.ignoreChecks,
                "delay":0
            }
            delay = 0
            if "latency_samples" in kwargs:
                delay = kwargs.pop("latency_samples") or 0

            if delay:
                kwargs["delay"] = delay
            if payload.metadata is not None:
                md = payload.metadata
                kwargs.update(
                    dict(
                      #  use_metadata=True,
                       # name=payload.name,
                      #  modeled_by=md.modeledBy,
                       # gear_make=md.gearMake,
                       # gear_model=md.gearModel,
                       # gear_type=md.gearType,
                       # tone_type=md.toneType,
                       # reamp_send_level=md.reampSendLevelDb,
                       # reamp_return_level=md.reampReturnLevelDb,
                    )
                )
            else:
                kwargs["use_metadata"] = False

            print(f"[TRAIN {run_id}] Calling NAM run(**{kwargs}) in {run_dir}")
            nam_run(**kwargs)

        finally:
            os.chdir(cwd_before)

        model_path = None
        exported_dir = run_dir / "exported_models"
        if exported_dir.exists():
            candidates = sorted(exported_dir.glob("*.nam"))
            if candidates:
                model_path = candidates[0]
                print(f"[TRAIN {run_id}] Exported model: {model_path}")

        run_entry["status"] = "COMPLETED"
        run_entry["completedAt"] = time.time()
        run_entry["updatedAt"] = run_entry["completedAt"]
        run_entry["modelPath"] = str(model_path) if model_path else None
        run_entry["metrics"] = {
            "snrDb": 0.0,
            "rmsError": 0.0,
            "spectralErrorDb": 0.0,
            "timeAlignmentErrorSamples": 0,
            "qualityScore": 0.0,
        }
        persist_run(run_entry)

        print(f"[TRAIN {run_id}] Training completed.")

    except Exception as e:
        print(f"[TRAIN {run_id}] ERROR: {e}")
        run_entry["status"] = "FAILED"
        run_entry["updatedAt"] = time.time()
        run_entry["error"] = str(e)
        persist_run(run_entry)


def start_training_for_run(run_id: str, payload: TrainingRunCreateRequest, in_path: Path, out_path: Path) -> None:
    """
    Fire-and-forget background thread.
    """
    t = threading.Thread(
        target=_run_training_worker,
        args=(run_id, payload, in_path, out_path),
        daemon=True,
    )
    t.start()
