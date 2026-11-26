"""Point operation handlers: grayscale, brightness, negative, threshold, equalization.

Pure NumPy — zero cv2.* calls.
"""

import numpy as np
from numpy.typing import NDArray

from app.core.exceptions import InvalidParamsError
from app.services.alpha_utils import merge_alpha, split_alpha
from app.services.core_conv import (
    bgr_to_gray,
    bgr_to_ycrcb,
    gray_to_bgr,
    ycrcb_to_bgr,
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_gray(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Return single-channel grayscale. Input should be BGR (3-ch)."""
    if image.ndim == 2:
        return image
    bgr = image[:, :, :3] if image.shape[2] == 4 else image
    return bgr_to_gray(bgr)


def _manual_equalize_channel(channel: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Histogram equalization manual untuk satu kanal uint8."""
    if channel.size == 0:
        return channel.copy()
    hist = np.bincount(channel.ravel(), minlength=256)
    cdf = hist.cumsum()
    nonzero = cdf[cdf > 0]
    if nonzero.size == 0:
        return channel.copy()
    cdf_min = int(nonzero[0])
    denom = channel.size - cdf_min
    if denom <= 0:
        return channel.copy()
    lut = np.round(np.maximum(cdf - cdf_min, 0) * 255.0 / denom).astype(np.uint8)
    return lut[channel]


def _manual_otsu(gray: NDArray[np.uint8]) -> tuple[NDArray[np.uint8], float]:
    """Otsu thresholding manual menggunakan between-class variance (float64)."""
    hist = np.bincount(gray.ravel(), minlength=256).astype(np.float64)
    total = float(gray.size)
    if total == 0:
        return gray.copy(), 0.0

    probs = hist / total
    bins = np.arange(256, dtype=np.float64)
    total_mean = float(np.dot(bins, probs))

    omega_bg = 0.0
    mu_bg_acc = 0.0
    max_var = -1.0
    best_t = 0

    for t in range(256):
        omega_bg += probs[t]
        if omega_bg <= 0.0:
            continue
        omega_fg = 1.0 - omega_bg
        if omega_fg <= 0.0:
            break
        mu_bg_acc += t * probs[t]
        mean_bg = mu_bg_acc / omega_bg
        mean_fg = (total_mean - mu_bg_acc) / omega_fg
        var_between = omega_bg * omega_fg * ((mean_bg - mean_fg) ** 2)
        if var_between > max_var:
            max_var = var_between
            best_t = t

    binary = np.where(gray > best_t, 255, 0).astype(np.uint8)
    return binary, float(best_t)


# ---------------------------------------------------------------------------
# CLAHE helper (Contrast Limited Adaptive Histogram Equalization)
# ---------------------------------------------------------------------------

def _clahe_channel(ch: NDArray[np.uint8], clip_limit: float, n_tiles: int) -> NDArray[np.uint8]:
    """CLAHE manual untuk satu kanal uint8.

    Algoritma:
    1. Bagi gambar menjadi tile (n_tiles x n_tiles).
    2. Hitung histogram per tile; clip pada clip_limit * (n_pix / 256).
    3. Redistribusi piksel yang ter-clip merata ke semua bin.
    4. Hitung CDF ternormalisasi per tile → LUT (256 entries).
    5. Interpolasi bilinear antara 4 tile-centre terdekat untuk tiap piksel.
    """
    h, w = ch.shape
    tile_h = max(1, h // n_tiles)
    tile_w = max(1, w // n_tiles)

    # --- Tahap 1 & 2: Hitung LUT per tile ---
    luts = np.zeros((n_tiles, n_tiles, 256), dtype=np.float64)

    for ty in range(n_tiles):
        for tx in range(n_tiles):
            y0 = ty * tile_h
            y1 = y0 + tile_h if ty < n_tiles - 1 else h
            x0 = tx * tile_w
            x1 = x0 + tile_w if tx < n_tiles - 1 else w
            tile = ch[y0:y1, x0:x1]
            n_pix = tile.size

            hist = np.bincount(tile.ravel(), minlength=256).astype(np.float64)

            # Clip & redistribute
            clip_val = max(1.0, clip_limit * n_pix / 256.0)
            excess = np.sum(np.maximum(hist - clip_val, 0))
            hist = np.minimum(hist, clip_val)
            hist += excess / 256.0

            # CDF → LUT
            cdf = hist.cumsum()
            cdf_nonzero = cdf[cdf > 0]
            cdf_min = float(cdf_nonzero[0]) if cdf_nonzero.size > 0 else 0.0
            denom = n_pix - cdf_min
            if denom <= 0:
                luts[ty, tx] = np.arange(256, dtype=np.float64)
            else:
                luts[ty, tx] = np.clip(
                    np.round(np.maximum(cdf - cdf_min, 0) * 255.0 / denom), 0, 255
                )

    # --- Tahap 3: Interpolasi bilinear antar tile centres ---
    # Pusat setiap tile pada koordinat piksel
    centers_y = (np.arange(n_tiles, dtype=np.float64) + 0.5) * tile_h
    centers_x = (np.arange(n_tiles, dtype=np.float64) + 0.5) * tile_w

    # Peta setiap posisi piksel ke indeks tile fraksional (clamped di tepi)
    fy = np.interp(
        np.arange(h, dtype=np.float64), centers_y,
        np.arange(n_tiles, dtype=np.float64),
    )
    fx = np.interp(
        np.arange(w, dtype=np.float64), centers_x,
        np.arange(n_tiles, dtype=np.float64),
    )

    # Indeks tile bawah/atas & bobot
    ty1 = np.clip(np.floor(fy).astype(np.intp), 0, n_tiles - 1)
    tx1 = np.clip(np.floor(fx).astype(np.intp), 0, n_tiles - 1)
    ty2 = np.minimum(ty1 + 1, n_tiles - 1)
    tx2 = np.minimum(tx1 + 1, n_tiles - 1)

    wy = (fy - ty1).reshape(-1, 1)       # (H, 1)  bobot ke tile bawah
    wx = (fx - tx1).reshape(1, -1)       # (1, W)  bobot ke tile kanan

    v = ch.astype(np.intp)               # (H, W)  nilai piksel sebagai indeks LUT

    # 4 lookup LUT dengan broadcasting: ty1/tx1 1-D → broadcast ke (H,W)
    q11 = luts[ty1[:, None], tx1[None, :], v]
    q12 = luts[ty1[:, None], tx2[None, :], v]
    q21 = luts[ty2[:, None], tx1[None, :], v]
    q22 = luts[ty2[:, None], tx2[None, :], v]

    out = (1.0 - wy) * ((1.0 - wx) * q11 + wx * q12) + wy * ((1.0 - wx) * q21 + wx * q22)
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# Grayscale
# ---------------------------------------------------------------------------

def grayscale_luminance(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    rgb, alpha = split_alpha(image)
    if rgb.ndim == 2:
        return merge_alpha(rgb, alpha)
    gray = bgr_to_gray(rgb)
    return merge_alpha(gray_to_bgr(gray), alpha)


def grayscale_average(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    rgb, alpha = split_alpha(image)
    if rgb.ndim == 2:
        return merge_alpha(rgb, alpha)
    gray = np.round(np.mean(rgb[:, :, :3].astype(np.float64), axis=2)).astype(np.uint8)
    return merge_alpha(gray_to_bgr(gray), alpha)


def grayscale_lightness(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    rgb, alpha = split_alpha(image)
    if rgb.ndim == 2:
        return merge_alpha(rgb, alpha)
    f = rgb[:, :, :3].astype(np.float64)
    gray = np.round((f.max(axis=2) + f.min(axis=2)) / 2.0).astype(np.uint8)
    return merge_alpha(gray_to_bgr(gray), alpha)


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

def threshold_binary(image: NDArray[np.uint8], thresh: int) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)
    out = np.where(gray > thresh, 255, 0).astype(np.uint8)
    return merge_alpha(gray_to_bgr(out), alpha)


def threshold_binary_inv(image: NDArray[np.uint8], thresh: int) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)
    out = np.where(gray > thresh, 0, 255).astype(np.uint8)
    return merge_alpha(gray_to_bgr(out), alpha)


def threshold_truncate(image: NDArray[np.uint8], thresh: int) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)
    out = np.where(gray > thresh, thresh, gray).astype(np.uint8)
    return merge_alpha(gray_to_bgr(out), alpha)


def threshold_to_zero(image: NDArray[np.uint8], thresh: int) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)
    out = np.where(gray > thresh, gray, 0).astype(np.uint8)
    return merge_alpha(gray_to_bgr(out), alpha)


def threshold_otsu(image: NDArray[np.uint8]) -> tuple[NDArray[np.uint8], float]:
    bgr, alpha = split_alpha(image)
    gray = _to_gray(bgr)
    binary, t = _manual_otsu(gray)
    return merge_alpha(gray_to_bgr(binary), alpha), t


# ---------------------------------------------------------------------------
# Equalization
# ---------------------------------------------------------------------------

def equalize_global(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    if bgr.ndim == 2:
        eq = _manual_equalize_channel(bgr)
        return merge_alpha(eq, alpha)
    # YCrCb equalization — equalize kanal Y saja agar rona warna tidak rusak
    ycrcb = bgr_to_ycrcb(bgr)
    y_chan = np.clip(np.round(ycrcb[:, :, 0]), 0, 255).astype(np.uint8)
    y_eq = _manual_equalize_channel(y_chan)
    ycrcb_eq = ycrcb.copy()
    ycrcb_eq[:, :, 0] = y_eq.astype(np.float64)
    out = ycrcb_to_bgr(ycrcb_eq)
    return merge_alpha(out, alpha)


def equalize_clahe(
    image: NDArray[np.uint8], clip_limit: float = 2.0, tile_grid_size: int = 8
) -> NDArray[np.uint8]:
    """CLAHE — Contrast Limited Adaptive Histogram Equalization (pure NumPy)."""
    if clip_limit <= 0:
        raise InvalidParamsError("clip_limit harus > 0")
    if tile_grid_size < 1:
        raise InvalidParamsError("tile_grid_size harus >= 1")

    bgr, alpha = split_alpha(image)

    if bgr.ndim == 2:
        eq = _clahe_channel(bgr, clip_limit, tile_grid_size)
        return merge_alpha(eq, alpha)

    # YCrCb equalization — equalize kanal Y saja
    ycrcb = bgr_to_ycrcb(bgr)
    y_chan = np.clip(np.round(ycrcb[:, :, 0]), 0, 255).astype(np.uint8)
    y_eq = _clahe_channel(y_chan, clip_limit, tile_grid_size)
    ycrcb_eq = ycrcb.copy()
    ycrcb_eq[:, :, 0] = y_eq.astype(np.float64)
    out = ycrcb_to_bgr(ycrcb_eq)
    return merge_alpha(out, alpha)
