"""Detail enhancement handlers: sharpening, edge detection, sketch."""

import cv2
import numpy as np
from numpy.typing import NDArray

from app.core.config import settings
from app.core.exceptions import InvalidParamsError
from app.services.alpha_utils import merge_alpha, split_alpha

_KERNEL_STANDARD = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
_KERNEL_STRONG = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]], dtype=np.float32)


def _to_gray(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    if image.ndim == 2:
        return image
    bgr = image[:, :, :3] if image.shape[2] == 4 else image
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)


# ---------------------------------------------------------------------------
# Sharpening
# ---------------------------------------------------------------------------

def sharpen_kernel_standard(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    out = cv2.filter2D(bgr, -1, _KERNEL_STANDARD, borderType=cv2.BORDER_REFLECT)
    return merge_alpha(np.clip(out, 0, 255).astype(np.uint8), alpha)


def sharpen_kernel_strong(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    out = cv2.filter2D(bgr, -1, _KERNEL_STRONG, borderType=cv2.BORDER_REFLECT)
    return merge_alpha(np.clip(out, 0, 255).astype(np.uint8), alpha)


def sharpen_unsharp_mask(
    image: NDArray[np.uint8], alpha_strength: float = 1.0
) -> NDArray[np.uint8]:
    if not (0.0 <= alpha_strength <= 3.0):
        raise InvalidParamsError("alpha_strength harus antara 0.0 dan 3.0")
    bgr, alpha_ch = split_alpha(image)
    blurred = cv2.GaussianBlur(bgr, (5, 5), 0, borderType=cv2.BORDER_REFLECT)
    diff = bgr.astype(np.float32) - blurred.astype(np.float32)
    out = np.clip(bgr.astype(np.float32) + alpha_strength * diff, 0, 255).astype(np.uint8)
    return merge_alpha(out, alpha_ch)


# ---------------------------------------------------------------------------
# Edge Detection
# ---------------------------------------------------------------------------

def edge_sobel(
    image: NDArray[np.uint8], direction: str = "combined", ksize: int = 3
) -> NDArray[np.uint8]:
    gray = _to_gray(image)
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=ksize)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=ksize)
    if direction == "x":
        result = np.abs(gx)
    elif direction == "y":
        result = np.abs(gy)
    else:
        result = np.sqrt(gx ** 2 + gy ** 2)
    out = np.clip(result, 0, 255).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


def edge_prewitt(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    gray = _to_gray(image).astype(np.float32)
    kx = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float32)
    ky = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=np.float32)
    gx = cv2.filter2D(gray, -1, kx, borderType=cv2.BORDER_REFLECT)
    gy = cv2.filter2D(gray, -1, ky, borderType=cv2.BORDER_REFLECT)
    out = np.clip(np.sqrt(gx ** 2 + gy ** 2), 0, 255).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


def edge_laplacian(image: NDArray[np.uint8], pre_gaussian: bool = False) -> NDArray[np.uint8]:
    gray = _to_gray(image)
    if pre_gaussian:
        gray = cv2.GaussianBlur(gray, (5, 5), 0, borderType=cv2.BORDER_REFLECT)
    lap = cv2.Laplacian(gray, cv2.CV_32F)
    out = np.clip(np.abs(lap), 0, 255).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


def edge_canny(
    image: NDArray[np.uint8], low_threshold: int = 50, high_threshold: int = 150
) -> NDArray[np.uint8]:
    if (
        low_threshold < settings.CANNY_THRESHOLD_MIN
        or high_threshold > settings.CANNY_THRESHOLD_MAX
    ):
        lo = settings.CANNY_THRESHOLD_MIN
        hi = settings.CANNY_THRESHOLD_MAX
        raise InvalidParamsError(f"Threshold harus antara {lo} dan {hi}")
    if low_threshold > high_threshold:
        raise InvalidParamsError("low_threshold tidak boleh lebih besar dari high_threshold")
    gray = _to_gray(image)
    out = cv2.Canny(gray, low_threshold, high_threshold)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


# ---------------------------------------------------------------------------
# Sketch
# ---------------------------------------------------------------------------

def sketch(image: NDArray[np.uint8], kernel_size: int = 21) -> NDArray[np.uint8]:
    if kernel_size < settings.SKETCH_KERNEL_MIN or kernel_size > settings.SKETCH_KERNEL_MAX:
        lo, hi = settings.SKETCH_KERNEL_MIN, settings.SKETCH_KERNEL_MAX
        raise InvalidParamsError(f"kernel_size harus antara {lo} dan {hi}")
    if kernel_size % 2 == 0:
        raise InvalidParamsError("kernel_size harus bilangan ganjil")

    gray = _to_gray(image)
    inv = (255 - gray).astype(np.uint8)
    blurred = cv2.GaussianBlur(inv, (kernel_size, kernel_size), 0, borderType=cv2.BORDER_REFLECT)

    # Color Dodge with guard: denominator >= 1
    denom = np.maximum(1, 255 - blurred.astype(np.int32))
    result = np.minimum(255, gray.astype(np.int32) * 255 // denom).astype(np.uint8)
    return cv2.cvtColor(result, cv2.COLOR_GRAY2BGR)
