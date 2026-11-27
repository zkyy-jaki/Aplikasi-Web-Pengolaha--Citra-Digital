"""FastAPI routers: images (upload, process, history, export)."""

from __future__ import annotations

import json
import time
from typing import Any, Literal

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.core.config import settings
from app.core.exceptions import FileTooLargeError, InvalidFileError, InvalidParamsError
from app.core.logging import get_logger
from app.services import registry
from app.services.histogram import compute_histogram
from app.services.session_manager import (
    _make_preview_b64,
    apply_history_action,
    delete_history_step,
    downscale_max_side,
    export_image,
    get_session,
    toggle_history_step,
    upload_image,
)

router = APIRouter(prefix="/api/images", tags=["images"])
logger = get_logger(__name__)


class ProcessRequest(BaseModel):
    operation: str
    params: dict[str, Any] = {}
    commit: bool = False
    preview_mode: bool = True


class ProcessResponse(BaseModel):
    session_id: str
    preview_base64: str
    histogram: dict
    processing_time_ms: float
    otsu_threshold: float | None = None
    history: list[str] | None = None
    history_steps: list[dict] | None = None
    history_index: int | None = None


@router.post("/upload")
def upload(file: UploadFile = File(...)) -> dict:
    data = file.file.read()
    result = upload_image(data, file.filename or "unknown")
    return result


@router.post("/{session_id}/process")
def process(session_id: str, body: ProcessRequest) -> ProcessResponse:
    session = get_session(session_id)
    image = session.current_image

    t0 = time.perf_counter()
    result = registry.execute_operation(body.operation, image, body.params)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    # Otsu returns a tuple
    otsu_thresh: float | None = None
    if isinstance(result, tuple):
        result, otsu_thresh = result

    if body.commit:
        session.push(result, body.operation, body.params)

    preview = _make_preview_b64(result)
    hist = compute_histogram(result)

    logger.info(
        "processed | session=%s op=%s params=%s shape=%s time_ms=%.1f",
        session_id,
        body.operation,
        body.params,
        result.shape,
        elapsed_ms,
    )

    return ProcessResponse(
        session_id=session_id,
        preview_base64=preview,
        histogram=hist.model_dump(),
        processing_time_ms=round(elapsed_ms, 2),
        otsu_threshold=otsu_thresh,
        history=session.history_labels() if body.commit else None,
        history_steps=session.history_steps() if body.commit else None,
        history_index=session.history_index if body.commit else None,
    )


@router.post("/{session_id}/history/{action}")
def history(session_id: str, action: Literal["undo", "redo", "reset"]) -> dict:
    return apply_history_action(session_id, action)


@router.patch("/{session_id}/history/{step_index}/toggle")
def toggle_step(session_id: str, step_index: int) -> dict:
    return toggle_history_step(session_id, step_index)


@router.delete("/{session_id}/history/{step_index}")
def delete_step(session_id: str, step_index: int) -> dict:
    return delete_history_step(session_id, step_index)


@router.get("/{session_id}/export")
def export(
    session_id: str,
    format: Literal["png", "jpeg", "bmp"] = "png",
    quality: int = 90,
) -> Response:
    data, content_type = export_image(session_id, fmt=format, quality=quality)
    ext = {"image/png": "png", "image/jpeg": "jpg", "image/bmp": "bmp"}.get(content_type, "bin")
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename=processed.{ext}"},
    )


@router.post("/process-frame")
def process_live_frame(
    file: UploadFile = File(...),
    operation: str = Form(...),
    params: str = Form("{}"),
) -> Response:
    """Stateless live-camera frame processing (no session, no history, no histogram)."""
    data = file.file.read()
    if not data:
        raise InvalidFileError("Frame kamera kosong")
    if len(data) > settings.LIVE_FRAME_MAX_BYTES:
        raise FileTooLargeError(len(data), settings.LIVE_FRAME_MAX_BYTES)

    arr = np.frombuffer(data, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise InvalidFileError("Gagal mendekode frame kamera")

    frame = downscale_max_side(frame, settings.LIVE_FRAME_MAX_SIDE)

    try:
        parsed_params = json.loads(params)
    except json.JSONDecodeError as exc:
        raise InvalidParamsError(f"Format JSON params tidak valid: {exc}") from exc
    if not isinstance(parsed_params, dict):
        raise InvalidParamsError("Params harus berupa JSON object")

    t0 = time.perf_counter()
    result = registry.execute_operation(operation, frame, parsed_params)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    otsu_thresh: float | None = None
    if isinstance(result, tuple):
        result, otsu_thresh = result

    success, buf = cv2.imencode(".jpg", result, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not success:
        raise InvalidFileError("Gagal mengenkode frame hasil olahan")

    headers = {"X-Processing-Time-Ms": f"{elapsed_ms:.2f}"}
    if otsu_thresh is not None:
        headers["X-Otsu-Threshold"] = f"{otsu_thresh:.1f}"

    return Response(content=buf.tobytes(), media_type="image/jpeg", headers=headers)
