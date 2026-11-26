"""Core manual 2D convolution engine + colour conversion helpers (pure NumPy)."""

import numpy as np

# ---------------------------------------------------------------------------
# 2D Convolution (supports 2-D and 3-D images, returns float64 without clip)
# ---------------------------------------------------------------------------

def manual_convolve2d(
    image: np.ndarray,
    kernel: np.ndarray,
    mode: str = "reflect",
    flip_kernel: bool = True,
) -> np.ndarray:
    """Konvolusi 2D manual untuk citra 2D (H, W) dan 3D (H, W, C).

    Mengembalikan array float64 TANPA clipping agar operasi gradien
    (Sobel, Prewitt, Laplacian) dapat menerima nilai negatif mentah.
    """
    img = image.astype(np.float64)
    k = np.asarray(kernel, dtype=np.float64)
    if flip_kernel:
        k = k[::-1, ::-1]

    k_h, k_w = k.shape
    pad_top = k_h // 2
    pad_bottom = k_h - 1 - pad_top
    pad_left = k_w // 2
    pad_right = k_w - 1 - pad_left

    if img.ndim == 2:
        h, w = img.shape
        padded = np.pad(img, ((pad_top, pad_bottom), (pad_left, pad_right)), mode=mode)
        output = np.zeros((h, w), dtype=np.float64)
        for r in range(k_h):
            for c in range(k_w):
                if k[r, c] != 0.0:
                    output += padded[r : r + h, c : c + w] * k[r, c]
        return output

    if img.ndim == 3:
        h, w, ch = img.shape
        padded = np.pad(img, ((pad_top, pad_bottom), (pad_left, pad_right), (0, 0)), mode=mode)
        output = np.zeros((h, w, ch), dtype=np.float64)
        for r in range(k_h):
            for c in range(k_w):
                if k[r, c] != 0.0:
                    output += padded[r : r + h, c : c + w, :] * k[r, c]
        return output

    raise ValueError(f"Unsupported image dimensions: {img.ndim}")


# ---------------------------------------------------------------------------
# Separable 1-D convolution (two-pass: horizontal then vertical)
# ---------------------------------------------------------------------------

def build_gaussian_kernel_1d(k: int, sigma: float) -> np.ndarray:
    """Buat kernel Gaussian 1D ternormalisasi (panjang k).

    Jika sigma <= 0 gunakan rumus auto-sigma OpenCV standar:
        sigma = 0.3 * ((k - 1) * 0.5 - 1) + 0.8
    """
    if sigma <= 0.0:
        sigma = 0.3 * ((k - 1) * 0.5 - 1) + 0.8
    ax = np.arange(k, dtype=np.float64) - (k - 1) / 2.0
    kernel = np.exp(-ax ** 2 / (2.0 * sigma ** 2))
    kernel /= kernel.sum()
    return kernel


def separable_convolve2d(
    image: np.ndarray,
    kernel_1d: np.ndarray,
    mode: str = "reflect",
) -> np.ndarray:
    """Konvolusi separabel 2-pass (horizontal lalu vertikal).

    Hanya berlaku untuk kernel simetris/separabel (Gaussian).
    Kompleksitas O(2K) alih-alih O(K²). Mengembalikan float64 tanpa clipping.
    """
    k = np.asarray(kernel_1d, dtype=np.float64).ravel()
    ksize = len(k)
    pad = ksize // 2
    img = image.astype(np.float64)

    if img.ndim == 2:
        h, w = img.shape
        # --- horizontal pass ---
        padded = np.pad(img, ((0, 0), (pad, pad)), mode=mode)
        temp = np.zeros((h, w), dtype=np.float64)
        for i in range(ksize):
            temp += padded[:, i : i + w] * k[i]
        # --- vertical pass ---
        padded_v = np.pad(temp, ((pad, pad), (0, 0)), mode=mode)
        output = np.zeros((h, w), dtype=np.float64)
        for i in range(ksize):
            output += padded_v[i : i + h, :] * k[i]
        return output

    if img.ndim == 3:
        h, w, ch = img.shape
        # --- horizontal pass ---
        padded = np.pad(img, ((0, 0), (pad, pad), (0, 0)), mode=mode)
        temp = np.zeros((h, w, ch), dtype=np.float64)
        for i in range(ksize):
            temp += padded[:, i : i + w, :] * k[i]
        # --- vertical pass ---
        padded_v = np.pad(temp, ((pad, pad), (0, 0), (0, 0)), mode=mode)
        output = np.zeros((h, w, ch), dtype=np.float64)
        for i in range(ksize):
            output += padded_v[i : i + h, :, :] * k[i]
        return output

    raise ValueError(f"Unsupported image dimensions: {img.ndim}")


# ---------------------------------------------------------------------------
# Gaussian kernel builder (2-D — kept for backward compatibility)
# ---------------------------------------------------------------------------

def build_gaussian_kernel(k: int, sigma: float) -> np.ndarray:
    """Buat kernel Gaussian 2D ternormalisasi (k x k)."""
    if sigma <= 0.0:
        sigma = 0.3 * ((k - 1) * 0.5 - 1) + 0.8
    ax = np.arange(k, dtype=np.float64) - (k - 1) / 2.0
    xx, yy = np.meshgrid(ax, ax)
    kernel = np.exp(-(xx ** 2 + yy ** 2) / (2.0 * sigma ** 2))
    kernel /= kernel.sum()
    return kernel


def apply_gaussian_blur(image: np.ndarray, k: int, sigma: float) -> np.ndarray:
    """Gaussian blur murni NumPy menggunakan konvolusi separabel; mengembalikan uint8.

    Menggunakan dua pass 1-D (horizontal + vertikal) → O(2K) alih-alih O(K²).
    """
    kernel_1d = build_gaussian_kernel_1d(k, sigma)
    out = separable_convolve2d(image, kernel_1d, mode="reflect")
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# Colour conversion helpers (pengganti cv2.cvtColor)
# ---------------------------------------------------------------------------

def bgr_to_gray(image: np.ndarray) -> np.ndarray:
    """BGR (H,W,3+) -> grayscale (H,W) uint8 dengan luminance BT.601.

    Y = 0.299R + 0.587G + 0.114B
    """
    if image.ndim == 2:
        return image.copy()
    bgr = image[:, :, :3]
    gray = (
        0.299 * bgr[:, :, 2].astype(np.float64)
        + 0.587 * bgr[:, :, 1].astype(np.float64)
        + 0.114 * bgr[:, :, 0].astype(np.float64)
    )
    return np.clip(np.round(gray), 0, 255).astype(np.uint8)


def gray_to_bgr(gray: np.ndarray) -> np.ndarray:
    """Grayscale (H,W) -> BGR (H,W,3) uint8 dengan stack channel identik."""
    if gray.ndim == 3:
        return gray  # sudah BGR
    return np.stack([gray, gray, gray], axis=2).astype(np.uint8)


# ---------------------------------------------------------------------------
# YCrCb <-> BGR manual (ITU-R BT.601) untuk Histogram Equalization
# ---------------------------------------------------------------------------

def bgr_to_ycrcb(bgr: np.ndarray) -> np.ndarray:
    """BGR uint8 -> YCrCb float64 (H,W,3).

    Y  = 0.299R + 0.587G + 0.114B
    Cr = (R - Y) * 0.713 + 128
    Cb = (B - Y) * 0.564 + 128
    """
    b = bgr[:, :, 0].astype(np.float64)
    g = bgr[:, :, 1].astype(np.float64)
    r = bgr[:, :, 2].astype(np.float64)
    y = 0.299 * r + 0.587 * g + 0.114 * b
    cr = (r - y) * 0.713 + 128.0
    cb = (b - y) * 0.564 + 128.0
    return np.stack([y, cr, cb], axis=2)


def ycrcb_to_bgr(ycrcb: np.ndarray) -> np.ndarray:
    """YCrCb float64 (H,W,3) -> BGR uint8.

    R = Y + 1.403(Cr - 128)
    G = Y - 0.714(Cr - 128) - 0.344(Cb - 128)
    B = Y + 1.773(Cb - 128)
    """
    y = ycrcb[:, :, 0]
    cr = ycrcb[:, :, 1]
    cb = ycrcb[:, :, 2]
    r = y + 1.403 * (cr - 128.0)
    g = y - 0.714 * (cr - 128.0) - 0.344 * (cb - 128.0)
    b = y + 1.773 * (cb - 128.0)
    out = np.stack([b, g, r], axis=2)
    return np.clip(np.round(out), 0, 255).astype(np.uint8)
