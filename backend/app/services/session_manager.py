"""Session management: upload, history stack, preview, export."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Literal

import cv2
import numpy as np
from numpy.typing import NDArray

from app.core.config import settings
from app.core.exceptions import (
    FileTooLargeError,
    HistoryError,
    InvalidFileError,
    SessionNotFoundError,
)
from app.services.histogram import compute_histogram

# ---------------------------------------------------------------------------
# Magic bytes validation
# ---------------------------------------------------------------------------

_MAGIC: list[tuple[bytes, int, str]] = [
    (b"\xff\xd8\xff", 0, "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", 0, "image/png"),
    (b"BM", 0, "image/bmp"),
    # WebP: "RIFF" at 0 and "WEBP" at 8
    (b"RIFF", 0, "image/webp"),
]


def _detect_mime(data: bytes) -> str | None:
    for magic, offset, mime in _MAGIC:
        if data[offset : offset + len(magic)] == magic:
            if mime == "image/webp":
                if data[8:12] != b"WEBP":
                    continue
            return mime
    return None


def validate_magic_bytes(data: bytes) -> str:
    mime = _detect_mime(data)
    if mime is None:
        raise InvalidFileError("Magic bytes tidak cocok dengan format gambar yang didukung")
    return mime


# ---------------------------------------------------------------------------
# State dataclass
# ---------------------------------------------------------------------------

@dataclass
class HistoryEntry:
    image: NDArray[np.uint8]
    operation: str
    params: dict
    enabled: bool = True
    step_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])


@dataclass
class SessionState:
    session_id: str
    original: NDArray[np.uint8]
    history: list[HistoryEntry] = field(default_factory=list)
    history_index: int = -1  # points to the current state in history
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)

    @property
    def current_image(self) -> NDArray[np.uint8]:
        if self.history_index < 0 or not self.history:
            return self.original
        return self.history[self.history_index].image

    def push(self, image: NDArray[np.uint8], operation: str, params: dict) -> None:
        # Truncate forward history when branching
        self.history = self.history[: self.history_index + 1]
        if len(self.history) >= settings.HISTORY_MAX_STATES:
            self.history.pop(0)
            self.history_index = max(-1, self.history_index - 1)
        self.history.append(HistoryEntry(image=image.copy(), operation=operation, params=params))
        self.history_index = len(self.history) - 1
        self.last_accessed = time.time()

    def recompute_from(self, start_index: int = 0) -> None:
        from app.services import registry

        start = max(0, start_index)
        running_img = self.original.copy() if start == 0 else self.history[start - 1].image.copy()
        for idx in range(start, len(self.history)):
            entry = self.history[idx]
            if entry.enabled:
                res = registry.execute_operation(entry.operation, running_img, entry.params)
                if isinstance(res, tuple):
                    res = res[0]
                running_img = res.copy()
            entry.image = running_img.copy()

    def toggle_step(self, step_index: int) -> NDArray[np.uint8]:
        if step_index < 0 or step_index >= len(self.history):
            raise HistoryError("Indeks langkah riwayat tidak valid")
        self.history[step_index].enabled = not self.history[step_index].enabled
        self.recompute_from(step_index)
        self.last_accessed = time.time()
        return self.current_image

    def delete_step(self, step_index: int) -> NDArray[np.uint8]:
        if step_index < 0 or step_index >= len(self.history):
            raise HistoryError("Indeks langkah riwayat tidak valid")
        self.history.pop(step_index)
        if not self.history:
            self.history_index = -1
        else:
            if self.history_index >= step_index:
                self.history_index -= 1
            self.history_index = min(self.history_index, len(self.history) - 1)
            self.recompute_from(step_index)
        self.last_accessed = time.time()
        return self.current_image

    def undo(self) -> NDArray[np.uint8]:
        if self.history_index < 0:
            raise HistoryError("Tidak ada langkah yang dapat di-undo")
        self.history_index -= 1
        self.last_accessed = time.time()
        return self.current_image

    def redo(self) -> NDArray[np.uint8]:
        if self.history_index >= len(self.history) - 1:
            raise HistoryError("Tidak ada langkah yang dapat di-redo")
        self.history_index += 1
        self.last_accessed = time.time()
        return self.current_image

    def reset(self) -> NDArray[np.uint8]:
        self.history.clear()
        self.history_index = -1
        self.last_accessed = time.time()
        return self.original

    def history_labels(self) -> list[str]:
        return [
            f"{i + 1}. {e.operation} {e.params}" for i, e in enumerate(self.history)
        ]

    def history_steps(self) -> list[dict]:
        def _fmt_label(op: str, params: dict) -> str:
            if not params:
                return op
            vals = []
            for k, v in params.items():
                if isinstance(v, list):
                    vals.append(f"{len(v)}x{len(v)}")
                elif isinstance(v, str):
                    vals.append(v)
                else:
                    vals.append(f"{k}={v}")
            return f"{op} ({', '.join(vals)})"

        return [
            {
                "id": e.step_id,
                "operation": e.operation,
                "params": e.params,
                "label": _fmt_label(e.operation, e.params),
                "enabled": e.enabled,
            }
            for e in self.history
        ]


# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

_store: dict[str, SessionState] = {}


def _evict_expired() -> None:
    now = time.time()
    expired = [
        sid for sid, s in _store.items()
        if now - s.last_accessed > settings.SESSION_TTL_SECONDS
    ]
    for sid in expired:
        del _store[sid]


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

def upload_image(data: bytes, filename: str) -> dict:
    if len(data) > settings.MAX_FILE_SIZE_BYTES:
        raise FileTooLargeError(len(data), settings.MAX_FILE_SIZE_BYTES)
    validate_magic_bytes(data)

    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise InvalidFileError("Gagal mendekode gambar")

    session_id = str(uuid.uuid4())
    _evict_expired()
    _store[session_id] = SessionState(session_id=session_id, original=image.copy())

    h, w = image.shape[:2]
    channels = 1 if image.ndim == 2 else image.shape[2]
    preview_b64 = _make_preview_b64(image)
    hist = compute_histogram(image)

    return {
        "session_id": session_id,
        "width": w,
        "height": h,
        "format": _detect_mime(data),
        "channels": channels,
        "filename": filename,
        "preview_base64": preview_b64,
        "histogram": hist.model_dump(),
    }


def downscale_max_side(image: NDArray[np.uint8], max_side: int) -> NDArray[np.uint8]:
    """Downscale image proportionally so its longest side <= max_side (pure NumPy)."""
    h, w = image.shape[:2]
    if max(h, w) <= max_side:
        return image
    scale = max_side / max(h, w)
    new_h, new_w = max(1, int(h * scale)), max(1, int(w * scale))
    y_idx = np.clip(np.round(np.linspace(0, h - 1, new_h)).astype(int), 0, h - 1)
    x_idx = np.clip(np.round(np.linspace(0, w - 1, new_w)).astype(int), 0, w - 1)
    return image[np.ix_(y_idx, x_idx)]


def _make_preview_b64(image: NDArray[np.uint8]) -> str:
    image = downscale_max_side(image, settings.PREVIEW_MAX_SIDE)

    # Encode to PNG bytes → base64
    import base64
    success, buf = cv2.imencode(".png", image)
    if not success:
        raise InvalidFileError("Gagal mengenkode pratinjau")
    return base64.b64encode(buf.tobytes()).decode()


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

def get_session(session_id: str) -> SessionState:
    _evict_expired()
    session = _store.get(session_id)
    if session is None:
        raise SessionNotFoundError(session_id)
    session.last_accessed = time.time()
    return session


def _build_history_response(session: SessionState, image: NDArray[np.uint8]) -> dict:
    hist = compute_histogram(image)
    preview = _make_preview_b64(image)
    return {
        "session_id": session.session_id,
        "history": session.history_labels(),
        "history_steps": session.history_steps(),
        "history_index": session.history_index,
        "preview_base64": preview,
        "histogram": hist.model_dump(),
    }


def apply_history_action(
    session_id: str, action: Literal["undo", "redo", "reset"]
) -> dict:
    session = get_session(session_id)
    dispatch = {"undo": session.undo, "redo": session.redo, "reset": session.reset}
    image = dispatch[action]()
    return _build_history_response(session, image)


def toggle_history_step(session_id: str, step_index: int) -> dict:
    session = get_session(session_id)
    image = session.toggle_step(step_index)
    return _build_history_response(session, image)


def delete_history_step(session_id: str, step_index: int) -> dict:
    session = get_session(session_id)
    image = session.delete_step(step_index)
    return _build_history_response(session, image)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def export_image(
    session_id: str,
    fmt: Literal["png", "jpeg", "bmp"] = "png",
    quality: int = settings.JPEG_QUALITY_DEFAULT,
) -> tuple[bytes, str]:
    if quality < settings.JPEG_QUALITY_MIN or quality > settings.JPEG_QUALITY_MAX:
        from app.core.exceptions import InvalidParamsError
        raise InvalidParamsError(
            f"quality harus antara {settings.JPEG_QUALITY_MIN} dan {settings.JPEG_QUALITY_MAX}"
        )
    session = get_session(session_id)
    image = session.current_image

    if fmt == "png":
        success, buf = cv2.imencode(".png", image)
        content_type = "image/png"
    elif fmt == "jpeg":
        success, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
        content_type = "image/jpeg"
    elif fmt == "bmp":
        success, buf = cv2.imencode(".bmp", image)
        content_type = "image/bmp"
    else:
        from app.core.exceptions import InvalidParamsError
        raise InvalidParamsError(f"Format '{fmt}' tidak didukung")

    if not success:
        raise InvalidFileError("Gagal mengenkode citra untuk ekspor")
    return buf.tobytes(), content_type


# ---------------------------------------------------------------------------
# Public store accessor for tests
# ---------------------------------------------------------------------------

def _get_store() -> dict[str, SessionState]:
    return _store
