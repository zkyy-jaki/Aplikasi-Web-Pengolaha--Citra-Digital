"""Blur / spatial filter handlers (pure NumPy, no cv2)."""

import numpy as np
from numpy.typing import NDArray

from app.core.config import settings
from app.core.exceptions import InvalidParamsError
from app.services.alpha_utils import merge_alpha, split_alpha
from app.services.core_conv import apply_gaussian_blur, manual_convolve2d


def _ensure_odd(k: int, name: str = "kernel_size") -> int:
    if k < settings.BLUR_KERNEL_MIN or k > settings.BLUR_KERNEL_MAX:
        raise InvalidParamsError(
            f"{name} harus antara {settings.BLUR_KERNEL_MIN} dan {settings.BLUR_KERNEL_MAX}"
        )
    if k % 2 == 0:
        raise InvalidParamsError(f"{name} harus bilangan ganjil, dapat {k}")
    return k


# ---------------------------------------------------------------------------
# Gaussian Blur
# ---------------------------------------------------------------------------

def blur_gaussian(
    image: NDArray[np.uint8], kernel_size: int = 5, sigma: float = 0.0
) -> NDArray[np.uint8]:
    k = _ensure_odd(kernel_size)
    bgr, alpha = split_alpha(image)
    out = apply_gaussian_blur(bgr, k, sigma)
    return merge_alpha(out, alpha)


# ---------------------------------------------------------------------------
# Averaging Blur
# ---------------------------------------------------------------------------

def blur_averaging(image: NDArray[np.uint8], kernel_size: int = 5) -> NDArray[np.uint8]:
    k = _ensure_odd(kernel_size)
    bgr, alpha = split_alpha(image)
    kernel = np.ones((k, k), dtype=np.float64) / (k * k)
    out_f = manual_convolve2d(bgr, kernel, mode="reflect", flip_kernel=False)
    out = np.clip(np.round(out_f), 0, 255).astype(np.uint8)
    return merge_alpha(out, alpha)


# ---------------------------------------------------------------------------
# Median Blur (memory-safe strip processing + sliding_window_view)
# ---------------------------------------------------------------------------

def _median_channel(channel: NDArray[np.uint8], k: int) -> NDArray[np.uint8]:
    """Median filter pada satu kanal dengan strip processing untuk membatasi memori.

    np.median pada sliding_window_view mengalokasikan ~(strip_h * W * k²) float64
    secara internal. Strip processing menjaga peak memory < 200 MB per strip.
    """
    h, w = channel.shape
    radius = k // 2
    padded = np.pad(channel, radius, mode="reflect")

    # Estimasi memori: np.median internal → float64 copy
    total_elements = h * w * k * k
    mem_bytes = total_elements * 8  # float64
    max_mem = 200 * 1024 * 1024     # 200 MB limit per strip

    if mem_bytes <= max_mem:
        # Muat seluruhnya — proses sekaligus (jalur cepat untuk citra kecil/kernel kecil)
        windows = np.lib.stride_tricks.sliding_window_view(padded, (k, k))
        return np.median(windows, axis=(-2, -1)).astype(np.uint8)

    # Strip processing: bagi secara vertikal
    out = np.empty((h, w), dtype=np.uint8)
    elements_per_row = w * k * k
    strip_h = max(1, max_mem // (elements_per_row * 8))

    for y0 in range(0, h, strip_h):
        y1 = min(y0 + strip_h, h)
        strip_padded = padded[y0 : y1 + 2 * radius, :]
        windows = np.lib.stride_tricks.sliding_window_view(strip_padded, (k, k))
        out[y0:y1, :] = np.median(windows, axis=(-2, -1)).astype(np.uint8)

    return out


def blur_median(image: NDArray[np.uint8], kernel_size: int = 5) -> NDArray[np.uint8]:
    k = _ensure_odd(kernel_size)
    bgr, alpha = split_alpha(image)

    if bgr.ndim == 2:
        out = _median_channel(bgr, k)
        return merge_alpha(out, alpha)

    h, w, ch = bgr.shape
    out = np.empty((h, w, ch), dtype=np.uint8)
    for c in range(ch):
        out[:, :, c] = _median_channel(bgr[:, :, c], k)
    return merge_alpha(out, alpha)


# ---------------------------------------------------------------------------
# Bilateral Filter (vektorisasi loop dimensi kernel, tanpa loop HxW)
# ---------------------------------------------------------------------------

def _manual_bilateral_filter(
    image: NDArray[np.uint8], d: int, sigma_color: float, sigma_space: float
) -> NDArray[np.uint8]:
    if sigma_color <= 0 or sigma_space <= 0 or d <= 1:
        return image.copy()
    if d % 2 == 0:
        d += 1
    radius = d // 2
    img_f = image.astype(np.float64)
    two_ss_sq = 2.0 * (sigma_space ** 2)
    two_sc_sq = 2.0 * (sigma_color ** 2)

    if img_f.ndim == 2:
        h, w = img_f.shape
        padded = np.pad(img_f, ((radius, radius), (radius, radius)), mode="reflect")
        num = np.zeros((h, w), dtype=np.float64)
        den = np.zeros((h, w), dtype=np.float64)
        for dr in range(-radius, radius + 1):
            for dc in range(-radius, radius + 1):
                spatial_w = np.exp(-(dr * dr + dc * dc) / two_ss_sq)
                neighbor = padded[radius + dr : radius + dr + h, radius + dc : radius + dc + w]
                diff_sq = (neighbor - img_f) ** 2
                weight = spatial_w * np.exp(-diff_sq / two_sc_sq)
                num += weight * neighbor
                den += weight
    else:
        h, w, ch = img_f.shape
        padded = np.pad(img_f, ((radius, radius), (radius, radius), (0, 0)), mode="reflect")
        num = np.zeros((h, w, ch), dtype=np.float64)
        den = np.zeros((h, w, 1), dtype=np.float64)
        for dr in range(-radius, radius + 1):
            for dc in range(-radius, radius + 1):
                spatial_w = np.exp(-(dr * dr + dc * dc) / two_ss_sq)
                neighbor = padded[radius + dr : radius + dr + h, radius + dc : radius + dc + w, :]
                diff_sq = np.sum((neighbor - img_f) ** 2, axis=2, keepdims=True)
                weight = spatial_w * np.exp(-diff_sq / two_sc_sq)
                num += weight * neighbor
                den += weight

    out = num / np.maximum(den, 1e-12)
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


def blur_bilateral(
    image: NDArray[np.uint8],
    diameter: int = 9,
    sigma_color: float = 75.0,
    sigma_space: float = 75.0,
) -> NDArray[np.uint8]:
    if diameter < 1 or diameter > 15:
        raise InvalidParamsError("diameter harus antara 1 dan 15")
    bgr, alpha = split_alpha(image)
    out = _manual_bilateral_filter(bgr, diameter, sigma_color, sigma_space)
    return merge_alpha(out, alpha)


# ---------------------------------------------------------------------------
# Standard Filter 2D (custom kernel 3x3 / 5x5)
# ---------------------------------------------------------------------------

def blur_filter2d(
    image: NDArray[np.uint8],
    kernel: list[list[float]],
    auto_normalize: bool = True,
) -> NDArray[np.uint8]:
    if not kernel or not all(isinstance(row, list) for row in kernel):
        raise InvalidParamsError("Kernel harus berupa list 2D")
    rows = len(kernel)
    cols = len(kernel[0]) if rows > 0 else 0
    if rows not in (3, 5) or cols not in (3, 5) or rows != cols:
        raise InvalidParamsError("Kernel harus berukuran 3x3 atau 5x5")
    if not all(len(r) == cols for r in kernel):
        raise InvalidParamsError("Setiap baris kernel harus punya jumlah elemen yang sama")

    try:
        k = np.array(kernel, dtype=np.float64)
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
    out_f = manual_convolve2d(bgr, k, mode="reflect", flip_kernel=False)
    out = np.clip(np.round(out_f), 0, 255).astype(np.uint8)
    return merge_alpha(out, alpha)
