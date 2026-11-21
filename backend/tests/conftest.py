"""Shared test fixtures and helpers."""


import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


# ---------------------------------------------------------------------------
# Image factories
# ---------------------------------------------------------------------------

def make_rgb(w: int = 64, h: int = 64, fill: tuple[int, int, int] = (100, 150, 200)) -> np.ndarray:
    """Return a BGR uint8 image (OpenCV convention)."""
    img = np.full((h, w, 3), fill, dtype=np.uint8)
    return img


def make_rgba(w: int = 64, h: int = 64) -> np.ndarray:
    """BGRA image with partial transparency."""
    img = np.zeros((h, w, 4), dtype=np.uint8)
    img[:, :, :3] = (100, 150, 200)
    img[:, :, 3] = 128  # semi-transparent
    return img


def make_gray(w: int = 64, h: int = 64, fill: int = 128) -> np.ndarray:
    return np.full((h, w), fill, dtype=np.uint8)


def make_salt_pepper(w: int = 64, h: int = 64) -> np.ndarray:
    rng = np.random.default_rng(0)
    img = np.full((h, w, 3), 128, dtype=np.uint8)
    n = int(w * h * 0.1)
    ys = rng.integers(0, h, n)
    xs = rng.integers(0, w, n)
    img[ys[: n // 2], xs[: n // 2]] = 255
    img[ys[n // 2 :], xs[n // 2 :]] = 0
    return img


def bgr_to_png_bytes(img: np.ndarray) -> bytes:
    success, buf = cv2.imencode(".png", img)
    assert success
    return buf.tobytes()


def bgr_to_jpeg_bytes(img: np.ndarray) -> bytes:
    success, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    assert success
    return buf.tobytes()


def fake_pdf_with_jpg_ext() -> bytes:
    """PDF magic bytes disguised as jpg."""
    return b"%PDF-1.4 fake content"
