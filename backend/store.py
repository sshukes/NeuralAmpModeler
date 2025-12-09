# backend/store.py
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
