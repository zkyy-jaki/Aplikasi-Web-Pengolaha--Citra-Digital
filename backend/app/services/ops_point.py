"""Point operation handlers: grayscale, brightness, negative, threshold, equalization."""

import cv2
import numpy as np
from numpy.typing import NDArray

from app.core.exceptions import InvalidParamsError
from app.services.alpha_utils import merge_alpha, split_alpha

# ---------------------------------------------------------------------------
# Grayscale
# ---------------------------------------------------------------------------

def grayscale_luminance(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    rgb, alpha = split_alpha(image)
    if rgb.ndim == 2:
        return merge_alpha(rgb, alpha)
    gray = (0.299 * rgb[:, :, 2] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 0]).astype(np.uint8)
    bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    return merge_alpha(bgr, alpha)


def grayscale_average(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    rgb, alpha = split_alpha(image)
    if rgb.ndim == 2:
        return merge_alpha(rgb, alpha)
    gray = np.mean(rgb.astype(np.float32), axis=2).astype(np.uint8)
    bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    return merge_alpha(bgr, alpha)


def grayscale_lightness(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    rgb, alpha = split_alpha(image)
    if rgb.ndim == 2:
        return merge_alpha(rgb, alpha)
    f = rgb.astype(np.float32)
    gray = ((f.max(axis=2) + f.min(axis=2)) / 2).astype(np.uint8)
    bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    return merge_alpha(bgr, alpha)


# ---------------------------------------------------------------------------
# Brightness
# ---------------------------------------------------------------------------

def adjust_brightness(image: NDArray[np.uint8], beta: int) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    clamped = np.clip(bgr.astype(np.int16) + beta, 0, 255).astype(np.uint8)
    return merge_alpha(clamped, alpha)


# ---------------------------------------------------------------------------
# Negative
# ---------------------------------------------------------------------------

def negative(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    inverted = (255 - bgr).astype(np.uint8)
    return merge_alpha(inverted, alpha)


# ---------------------------------------------------------------------------
# Thresholding
# ---------------------------------------------------------------------------

def _to_gray(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Return single-channel grayscale. Preserves if already gray."""
    if image.ndim == 2:
        return image
    if image.shape[2] == 4:
        image = image[:, :, :3]
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def threshold_binary(image: NDArray[np.uint8], thresh: int) -> NDArray[np.uint8]:
    gray = _to_gray(image)
    _, out = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


def threshold_binary_inv(image: NDArray[np.uint8], thresh: int) -> NDArray[np.uint8]:
    gray = _to_gray(image)
    _, out = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY_INV)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


def threshold_truncate(image: NDArray[np.uint8], thresh: int) -> NDArray[np.uint8]:
    gray = _to_gray(image)
    _, out = cv2.threshold(gray, thresh, 255, cv2.THRESH_TRUNC)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


def threshold_to_zero(image: NDArray[np.uint8], thresh: int) -> NDArray[np.uint8]:
    gray = _to_gray(image)
    _, out = cv2.threshold(gray, thresh, 255, cv2.THRESH_TOZERO)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)


def threshold_otsu(image: NDArray[np.uint8]) -> tuple[NDArray[np.uint8], float]:
    gray = _to_gray(image)
    t, out = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR), float(t)


# ---------------------------------------------------------------------------
# Equalization
# ---------------------------------------------------------------------------

def equalize_global(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    if bgr.ndim == 2:
        eq = cv2.equalizeHist(bgr)
        return merge_alpha(eq, alpha)
    # YCrCb luminance-only equalization
    ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
    ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
    out = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
    return merge_alpha(out, alpha)


def equalize_clahe(
    image: NDArray[np.uint8], clip_limit: float = 2.0, tile_grid_size: int = 8
) -> NDArray[np.uint8]:
    if clip_limit <= 0:
        raise InvalidParamsError("clip_limit harus > 0")
    if tile_grid_size < 1:
        raise InvalidParamsError("tile_grid_size harus >= 1")
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid_size, tile_grid_size))
    bgr, alpha = split_alpha(image)
    if bgr.ndim == 2:
        eq = clahe.apply(bgr)
        return merge_alpha(eq, alpha)
    ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
    ycrcb[:, :, 0] = clahe.apply(ycrcb[:, :, 0])
    out = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
    return merge_alpha(out, alpha)
