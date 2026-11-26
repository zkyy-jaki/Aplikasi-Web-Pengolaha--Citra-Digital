"""Detail enhancement handlers: sharpening, edge detection, sketch.

Pure NumPy — zero cv2.* calls.
"""

import collections

import numpy as np
from numpy.typing import NDArray

from app.core.config import settings
from app.core.exceptions import InvalidParamsError
from app.services.alpha_utils import merge_alpha, split_alpha
from app.services.core_conv import (
    apply_gaussian_blur,
    bgr_to_gray,
    gray_to_bgr,
    manual_convolve2d,
)

_KERNEL_STANDARD = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float64)
_KERNEL_STRONG = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]], dtype=np.float64)

_SOBEL_KX = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float64)
_SOBEL_KY = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float64)

_PREWITT_KX = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float64)
_PREWITT_KY = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=np.float64)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_gray(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Return single-channel grayscale. Input should be BGR (3-ch)."""
    if image.ndim == 2:
        return image
    bgr = image[:, :, :3] if image.shape[2] == 4 else image
    return bgr_to_gray(bgr)


# ---------------------------------------------------------------------------
# Sharpening
# ---------------------------------------------------------------------------

def sharpen_kernel_standard(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    out_f = manual_convolve2d(bgr, _KERNEL_STANDARD, mode="reflect", flip_kernel=False)
    out = np.clip(np.round(out_f), 0, 255).astype(np.uint8)
    return merge_alpha(out, alpha)


def sharpen_kernel_strong(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    out_f = manual_convolve2d(bgr, _KERNEL_STRONG, mode="reflect", flip_kernel=False)
    out = np.clip(np.round(out_f), 0, 255).astype(np.uint8)
    return merge_alpha(out, alpha)


def sharpen_unsharp_mask(
    image: NDArray[np.uint8], alpha_strength: float = 1.0
) -> NDArray[np.uint8]:
    if not (0.0 <= alpha_strength <= 3.0):
        raise InvalidParamsError("alpha_strength harus antara 0.0 dan 3.0")
    bgr, alpha_ch = split_alpha(image)
    blurred = apply_gaussian_blur(bgr, 5, 0.0).astype(np.float64)
    orig = bgr.astype(np.float64)
    diff = orig - blurred
    out = np.clip(np.round(orig + alpha_strength * diff), 0, 255).astype(np.uint8)
    return merge_alpha(out, alpha_ch)


# ---------------------------------------------------------------------------
# Edge Detection — Sobel
# ---------------------------------------------------------------------------

def edge_sobel(
    image: NDArray[np.uint8], direction: str = "combined", ksize: int = 3
) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)

    if ksize == 3:
        kx, ky = _SOBEL_KX, _SOBEL_KY
    elif ksize == 5:
        s1d = np.array([1, 4, 6, 4, 1], dtype=np.float64)
        d1d = np.array([-1, -2, 0, 2, 1], dtype=np.float64)
        kx = np.outer(s1d, d1d)
        ky = np.outer(d1d, s1d)
    else:
        raise InvalidParamsError("ksize harus 3 atau 5")

    gx = manual_convolve2d(gray, kx, mode="reflect", flip_kernel=False)
    gy = manual_convolve2d(gray, ky, mode="reflect", flip_kernel=False)

    if direction == "x":
        result = np.abs(gx)
    elif direction == "y":
        result = np.abs(gy)
    else:
        result = np.sqrt(gx ** 2 + gy ** 2)

    out = np.clip(np.round(result), 0, 255).astype(np.uint8)
    return merge_alpha(gray_to_bgr(out), alpha)


# ---------------------------------------------------------------------------
# Edge Detection — Prewitt
# ---------------------------------------------------------------------------

def edge_prewitt(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)
    gx = manual_convolve2d(gray, _PREWITT_KX, mode="reflect", flip_kernel=False)
    gy = manual_convolve2d(gray, _PREWITT_KY, mode="reflect", flip_kernel=False)
    out = np.clip(np.round(np.sqrt(gx ** 2 + gy ** 2)), 0, 255).astype(np.uint8)
    return merge_alpha(gray_to_bgr(out), alpha)


# ---------------------------------------------------------------------------
# Edge Detection — Laplacian
# ---------------------------------------------------------------------------

def edge_laplacian(image: NDArray[np.uint8], pre_gaussian: bool = False) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)
    if pre_gaussian:
        gray = apply_gaussian_blur(gray, 5, 0.0)
    kernel_lap = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float64)
    resp = manual_convolve2d(gray, kernel_lap, mode="reflect", flip_kernel=False)
    out = np.clip(np.round(np.abs(resp)), 0, 255).astype(np.uint8)
    return merge_alpha(gray_to_bgr(out), alpha)


# ---------------------------------------------------------------------------
# Edge Detection — Canny (5-stage, pure NumPy + BFS hysteresis)
# ---------------------------------------------------------------------------

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

    bgr, alpha = split_alpha(image)

    # Stage 1 — Gaussian smoothing
    gray = _to_gray(bgr)
    smoothed = apply_gaussian_blur(gray, 5, 1.4)

    # Stage 2 — Gradient magnitude & angle (Sobel)
    gx = manual_convolve2d(smoothed, _SOBEL_KX, mode="reflect", flip_kernel=False)
    gy = manual_convolve2d(smoothed, _SOBEL_KY, mode="reflect", flip_kernel=False)
    mag = np.hypot(gx, gy)
    angle = np.rad2deg(np.arctan2(gy, gx)) % 180.0

    # Stage 3 — Non-Maximum Suppression (fully vectorised)
    h, w = mag.shape
    nms = np.zeros((h, w), dtype=np.float64)
    padded = np.pad(mag, 1, mode="constant", constant_values=0)
    center = padded[1 : h + 1, 1 : w + 1]

    # Direction masks (quantised to 4 bins)
    angle_q = np.zeros((h, w), dtype=np.uint8)
    angle_q[(angle < 22.5) | (angle >= 157.5)] = 0      # 0°  — gradient horizontal
    angle_q[(angle >= 22.5) & (angle < 67.5)] = 45      # 45° — gradient down-right
    angle_q[(angle >= 67.5) & (angle < 112.5)] = 90     # 90° — gradient vertical
    angle_q[(angle >= 112.5) & (angle < 157.5)] = 135   # 135°— gradient down-left

    # 0° gradient → edge is vertical → compare left (c-1) & right (c+1)
    m0 = angle_q == 0
    n1_0 = padded[1 : h + 1, 0 : w]          # (r, c-1)
    n2_0 = padded[1 : h + 1, 2 : w + 2]      # (r, c+1)
    nms = np.where(m0 & (center >= n1_0) & (center >= n2_0), center, nms)

    # 45° gradient (down-right / up-left) → compare (r-1,c-1) & (r+1,c+1)
    m45 = angle_q == 45
    n1_45 = padded[0 : h, 0 : w]             # (r-1, c-1)  — up-left
    n2_45 = padded[2 : h + 2, 2 : w + 2]     # (r+1, c+1)  — down-right
    nms = np.where(m45 & (center >= n1_45) & (center >= n2_45), center, nms)

    # 90° gradient → edge is horizontal → compare top (r-1) & bottom (r+1)
    m90 = angle_q == 90
    n1_90 = padded[0 : h, 1 : w + 1]         # (r-1, c)
    n2_90 = padded[2 : h + 2, 1 : w + 1]     # (r+1, c)
    nms = np.where(m90 & (center >= n1_90) & (center >= n2_90), center, nms)

    # 135° gradient (down-left / up-right) → compare (r-1,c+1) & (r+1,c-1)
    m135 = angle_q == 135
    n1_135 = padded[0 : h, 2 : w + 2]        # (r-1, c+1)  — up-right
    n2_135 = padded[2 : h + 2, 0 : w]        # (r+1, c-1)  — down-left
    nms = np.where(m135 & (center >= n1_135) & (center >= n2_135), center, nms)

    # Stage 4 — Double Thresholding
    strong = nms >= high_threshold
    weak = (nms >= low_threshold) & (~strong)

    # Stage 5 — Edge Tracking by Hysteresis (BFS on weak-edge neighbours)
    result = np.zeros((h, w), dtype=np.uint8)
    result[strong] = 255

    queue: collections.deque[list[int]] = collections.deque(np.argwhere(strong).tolist())
    while queue:
        y, x = queue.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and weak[ny, nx] and result[ny, nx] == 0:
                    result[ny, nx] = 255
                    queue.append([ny, nx])

    return merge_alpha(gray_to_bgr(result), alpha)


# ---------------------------------------------------------------------------
# Sketch (Pencil Sketch via Color Dodge)
# ---------------------------------------------------------------------------

def sketch(image: NDArray[np.uint8], kernel_size: int = 21) -> NDArray[np.uint8]:
    if kernel_size < settings.SKETCH_KERNEL_MIN or kernel_size > settings.SKETCH_KERNEL_MAX:
        lo, hi = settings.SKETCH_KERNEL_MIN, settings.SKETCH_KERNEL_MAX
        raise InvalidParamsError(f"kernel_size harus antara {lo} dan {hi}")
    if kernel_size % 2 == 0:
        raise InvalidParamsError("kernel_size harus bilangan ganjil")

    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)
    inv = (255 - gray).astype(np.uint8)
    blurred = apply_gaussian_blur(inv, kernel_size, 0.0)

    # Color Dodge: result = gray * 255 / max(1, 255 - blurred)
    gray_f = gray.astype(np.float64)
    denom = np.maximum(1.0, 255.0 - blurred.astype(np.float64))
    result = np.clip(np.round(gray_f * 255.0 / denom), 0, 255).astype(np.uint8)
    return merge_alpha(gray_to_bgr(result), alpha)
