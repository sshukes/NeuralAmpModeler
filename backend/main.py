# backend/main.py
import sys
import numpy as np

print(f"[BACKEND] Python exe: {sys.executable}")
print(f"[BACKEND] NumPy version: {np.__version__}")


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes_files import router as files_router
from .routes_training import router as training_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(files_router, prefix="/api")
app.include_router(training_router, prefix="/api")
