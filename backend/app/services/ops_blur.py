"""Blur / spatial filter handlers."""

import cv2
import numpy as np
from numpy.typing import NDArray

from app.core.config import settings
from app.core.exceptions import InvalidParamsError
from app.services.alpha_utils import merge_alpha, split_alpha


def _ensure_odd(k: int, name: str = "kernel_size") -> int:
    if k < settings.BLUR_KERNEL_MIN or k > settings.BLUR_KERNEL_MAX:
        raise InvalidParamsError(
            f"{name} harus antara {settings.BLUR_KERNEL_MIN} dan {settings.BLUR_KERNEL_MAX}"
        )
    if k % 2 == 0:
        raise InvalidParamsError(f"{name} harus bilangan ganjil, dapat {k}")
    return k


def blur_gaussian(
    image: NDArray[np.uint8], kernel_size: int = 5, sigma: float = 0.0
) -> NDArray[np.uint8]:
    k = _ensure_odd(kernel_size)
    bgr, alpha = split_alpha(image)
    out = cv2.GaussianBlur(bgr, (k, k), sigma, borderType=cv2.BORDER_REFLECT)
    return merge_alpha(out, alpha)


def blur_averaging(image: NDArray[np.uint8], kernel_size: int = 5) -> NDArray[np.uint8]:
    k = _ensure_odd(kernel_size)
    bgr, alpha = split_alpha(image)
    out = cv2.blur(bgr, (k, k), borderType=cv2.BORDER_REFLECT)
    return merge_alpha(out, alpha)


def blur_median(image: NDArray[np.uint8], kernel_size: int = 5) -> NDArray[np.uint8]:
    k = _ensure_odd(kernel_size)
    bgr, alpha = split_alpha(image)
    out = cv2.medianBlur(bgr, k)
    return merge_alpha(out, alpha)


def blur_bilateral(
    image: NDArray[np.uint8],
    diameter: int = 9,
    sigma_color: float = 75.0,
    sigma_space: float = 75.0,
) -> NDArray[np.uint8]:
    if diameter < 1 or diameter > 15:
        raise InvalidParamsError("diameter harus antara 1 dan 15")
    bgr, alpha = split_alpha(image)
    out = cv2.bilateralFilter(bgr, diameter, sigma_color, sigma_space)
    return merge_alpha(out, alpha)


def blur_filter2d(
    image: NDArray[np.uint8],
    kernel: list[list[float]],
    auto_normalize: bool = True,
) -> NDArray[np.uint8]:
    # Validate kernel shape
    if not kernel or not all(isinstance(row, list) for row in kernel):
        raise InvalidParamsError("Kernel harus berupa list 2D")
    rows = len(kernel)
    cols = len(kernel[0]) if rows > 0 else 0
    if rows not in (3, 5) or cols not in (3, 5) or rows != cols:
        raise InvalidParamsError("Kernel harus berukuran 3x3 atau 5x5")
    if not all(len(r) == cols for r in kernel):
        raise InvalidParamsError("Setiap baris kernel harus punya jumlah elemen yang sama")

    try:
        k = np.array(kernel, dtype=np.float32)
    except (ValueError, TypeError) as exc:
        raise InvalidParamsError("Elemen kernel harus numerik") from exc

    if not np.isfinite(k).all():
        raise InvalidParamsError("Elemen kernel mengandung nilai tidak valid (inf/nan)")

    if auto_normalize:
        total = k.sum()
        if total == 0:
            raise InvalidParamsError(
                "Jumlah bobot kernel = 0 saat auto_normalize=True; normalisasi tidak mungkin"
            )
        k = k / total

    bgr, alpha = split_alpha(image)
    out = cv2.filter2D(bgr, -1, k, borderType=cv2.BORDER_REFLECT)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return merge_alpha(out, alpha)
