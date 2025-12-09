# backend/audio_io.py
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf


def get_bit_depth(sf_info: sf.SoundFile) -> Optional[int]:
    """
    Rough bit-depth inference from subtype.
    """
    subtype = sf_info.subtype or ""
    if "24" in subtype:
        return 24
    if "16" in subtype:
        return 16
    if "32" in subtype:
        return 32
    return None


def repair_audio_in_place(path: Path, target_rate: int = 48000, silence_dur: float = 1.0) -> None:
    """
    Adapted from your repair script:
      - Force mono (keep left channel).
      - Warn if sample rate != target_rate (doesn't resample).
      - Add silence at the start if first 0.1s isn't already silent.
      - Saves back to the same file.
    """
    if not path.exists():
        print(f"   ❌ repair_audio_in_place: {path} not found")
        return

    try:
        print(f"🔧 Analyzing {path}...")

        data, rate = sf.read(path, always_2d=True, dtype="float32")
        modified = False

        # Force mono: keep left channel
        if data.shape[1] > 1:
            print("   Stereo detected. Keeping left channel only.")
            data = data[:, 0]
            modified = True
        else:
            data = data[:, 0]  # flatten

        # Sample rate warning
        if rate != target_rate:
            print(f"   ⚠️ WARNING: Sample rate is {rate} Hz (NAM prefers {target_rate} Hz).")

        # Add silence to start if first 0.1s is not silent
        first_check_seconds = 0.1
        first_samples = int(rate * first_check_seconds)
        first_samples = min(first_samples, len(data))

        if first_samples > 0:
            if not np.allclose(data[:first_samples], 0.0, atol=1e-8):
                silence_samples = int(rate * silence_dur)
                print(f"   Adding {silence_dur}s silence to start ({silence_samples} samples)...")
                silence = np.zeros(silence_samples, dtype=data.dtype)
                data = np.concatenate((silence, data))
                modified = True
            else:
                print("   Silence check passed (first 0.1s is already silent).")
        else:
            print("   File is very short, skipping silence check.")

        if modified:
            sf.write(path, data, rate)
            print(f"   ✅ Repaired and saved {path}")
        else:
            print(f"   ✅ {path} was already fine, no changes made.")

    except Exception as e:
        print(f"   ❌ Critical error repairing {path}: {e}")
