# backend/routes_files.py
from pathlib import Path
import time
import uuid

import numpy as np
import soundfile as sf
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse

from .store import file_meta, FILES_DIR
from .utils import to_iso
from .models import LatencyDetectionRequest
from .audio_io import get_bit_depth

router = APIRouter()


@router.post("/files")
async def upload_file(file: UploadFile = File(...)):
    """
    Real upload: save file to disk and store metadata in memory.
    """
    print(f"[UPLOAD] received file field: filename={file.filename}, content_type={file.content_type}")

    ext = Path(file.filename).suffix.lower() or ".wav"
    file_id = f"file_{uuid.uuid4().hex}"
    stored_name = f"{file_id}{ext}"
    stored_path = FILES_DIR / stored_name

    # Read entire body into memory for now (OK for ~60 MB on localhost)
    content = await file.read()
    print(f"[UPLOAD] read {len(content)} bytes from client, saving to {stored_path}")

    stored_path.write_bytes(content)
    size_bytes = stored_path.stat().st_size
    created_at = to_iso(time.time())

    file_meta[file_id] = {
        "fileId": file_id,
        "originalFilename": file.filename,
        "storedPath": str(stored_path),
        "sizeBytes": size_bytes,
        "createdAt": created_at,
    }

    print(f"[UPLOAD] saved file_id={file_id}, size={size_bytes} bytes")

    return {
        "fileId": file_id,
        "filename": file.filename,
        "sizeBytes": size_bytes,
        "createdAt": created_at,
    }


@router.get("/files/{file_id}/inspect")
async def inspect_file(file_id: str):
    """
    Real inspect: open the saved WAV and return actual format info.
    """
    meta = file_meta.get(file_id)
    if not meta:
        return JSONResponse(status_code=404, content={"detail": "File not found"})

    path = Path(meta["storedPath"])
    if not path.exists():
        return JSONResponse(status_code=404, content={"detail": "File not found on disk"})

    sf_info = sf.SoundFile(path)
    sample_rate = sf_info.samplerate
    channels = sf_info.channels
    frames = sf_info.frames
    duration_seconds = frames / float(sample_rate) if sample_rate > 0 else 0.0
    bit_depth = get_bit_depth(sf_info)

    sample_rate_ok = (sample_rate == 48000)
    channels_ok = (channels == 1)
    bit_depth_ok = (bit_depth in (24, 32, 16) if bit_depth is not None else True)

    return {
        "fileId": file_id,
        "filename": meta["originalFilename"],
        "format": {
            "container": "wav",
            "sampleRate": sample_rate,
            "bitDepth": bit_depth or 0,
            "channels": channels,
            "durationSeconds": duration_seconds,
            "numSamples": frames,
        },
        "validForNam": {
            "sampleRateOk": sample_rate_ok,
            "bitDepthOk": bit_depth_ok,
            "channelsOk": channels_ok,
        },
    }


@router.post("/files/detect-latency")
async def detect_latency(payload: LatencyDetectionRequest):
    """
    Real latency detection using cross-correlation between input and output.
    """
    in_meta = file_meta.get(payload.inputFileId)
    out_meta = file_meta.get(payload.outputFileId)

    if not in_meta or not out_meta:
        return JSONResponse(status_code=404, content={"detail": "One or both files not found"})

    in_path = Path(in_meta["storedPath"])
    out_path = Path(out_meta["storedPath"])

    if not in_path.exists() or not out_path.exists():
        return JSONResponse(status_code=404, content={"detail": "One or both files missing on disk"})

    x, sr_x = sf.read(in_path, dtype="float32", always_2d=True)
    y, sr_y = sf.read(out_path, dtype="float32", always_2d=True)

    if sr_x != sr_y:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Sample rates differ: input={sr_x}, output={sr_y}"}
        )

    x = x[:, 0]
    y = y[:, 0]

    n = min(len(x), len(y))
    x = x[:n]
    y = y[:n]

    x = x - np.mean(x)
    y = y - np.mean(y)

    corr = np.correlate(y, x, mode="full")
    max_idx = int(np.argmax(np.abs(corr)))
    lag = max_idx - (n - 1)

    norm = (np.linalg.norm(x) * np.linalg.norm(y)) or 1.0
    max_corr_norm = float(np.max(np.abs(corr)) / norm)
    confidence = max(0.0, min(1.0, max_corr_norm))

    latency_samples = max(0, lag)
    latency_ms = latency_samples / float(sr_x) * 1000.0

    return {
        "inputFileId": payload.inputFileId,
        "outputFileId": payload.outputFileId,
        "latencySamples": latency_samples,
        "latencyMs": latency_ms,
        "confidence": confidence,
        "alignmentPreview": {
            "segmentStartSeconds": 0.0,
            "segmentDurationSeconds": 0.25,
        },
    }
