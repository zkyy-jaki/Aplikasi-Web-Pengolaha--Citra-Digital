"""Generate built-in sample images for demo purposes."""

from __future__ import annotations

import os

import cv2
import numpy as np

SAMPLE_DIR = os.path.join(os.path.dirname(__file__))


def _salt_pepper(size: int = 256, noise_ratio: float = 0.05) -> np.ndarray:
    """Grayscale image with salt-and-pepper noise."""
    img = np.full((size, size, 3), 128, dtype=np.uint8)
    # Add a simple gradient background
    for i in range(size):
        img[i, :, :] = int(i / size * 200) + 28

    n = int(size * size * noise_ratio)
    rng = np.random.default_rng(42)
    ys = rng.integers(0, size, n)
    xs = rng.integers(0, size, n)
    img[ys[: n // 2], xs[: n // 2]] = 255  # salt
    img[ys[n // 2 :], xs[n // 2 :]] = 0  # pepper
    return img


def _low_contrast(size: int = 256) -> np.ndarray:
    """Low contrast image (intensities clustered around mid-range 100-160)."""
    rng = np.random.default_rng(7)
    img = rng.integers(100, 161, (size, size, 3), dtype=np.uint8)
    # Add a soft circular blob
    cx, cy, r = size // 2, size // 2, size // 4
    yy, xx = np.ogrid[:size, :size]
    mask = (xx - cx) ** 2 + (yy - cy) ** 2 < r**2
    img[mask] = np.clip(img[mask].astype(np.int16) + 20, 0, 255).astype(np.uint8)
    return img


def _geometric_pattern(size: int = 256) -> np.ndarray:
    """Geometric pattern with circles, rectangles, and lines."""
    img = np.zeros((size, size, 3), dtype=np.uint8)
    img[:] = (30, 30, 30)
    cv2.rectangle(img, (20, 20), (size - 20, size - 20), (200, 100, 50), 3)
    cv2.circle(img, (size // 2, size // 2), size // 4, (50, 200, 150), -1)
    cv2.circle(img, (size // 2, size // 2), size // 6, (200, 50, 100), 2)
    for i in range(0, size, 32):
        cv2.line(img, (i, 0), (i, size), (80, 80, 80), 1)
        cv2.line(img, (0, i), (size, i), (80, 80, 80), 1)
    cv2.putText(
        img, "SAMPLE", (40, size // 2 + 70),
        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (230, 230, 50), 2,
    )
    return img


_GENERATORS = {
    "sample_salt_pepper.png": _salt_pepper,
    "sample_low_contrast.png": _low_contrast,
    "sample_geometric.png": _geometric_pattern,
}


def ensure_samples() -> None:
    os.makedirs(SAMPLE_DIR, exist_ok=True)
    for fname, gen_fn in _GENERATORS.items():
        path = os.path.join(SAMPLE_DIR, fname)
        if not os.path.isfile(path):
            img = gen_fn()
            cv2.imwrite(path, img)


if __name__ == "__main__":
    ensure_samples()
    print("Sample images generated in", SAMPLE_DIR)
