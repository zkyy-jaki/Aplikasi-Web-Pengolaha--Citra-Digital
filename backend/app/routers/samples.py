"""Sample image endpoints."""

import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from app.samples.generator import SAMPLE_DIR, ensure_samples

router = APIRouter(prefix="/api/samples", tags=["samples"])


@router.get("")
def list_samples() -> JSONResponse:
    ensure_samples()
    files = sorted(os.listdir(SAMPLE_DIR))
    return JSONResponse({"samples": [f"/api/samples/{f}" for f in files if f.endswith(".png")]})


@router.get("/{filename}")
def get_sample(filename: str) -> FileResponse:
    ensure_samples()
    path = os.path.join(SAMPLE_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Sample tidak ditemukan")
    return FileResponse(path, media_type="image/png")
