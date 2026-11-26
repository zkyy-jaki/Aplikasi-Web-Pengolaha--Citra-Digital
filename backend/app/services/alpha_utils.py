"""Alpha channel utilities — keep transparency intact across operations.

Pure NumPy — zero cv2.* calls.
"""

import numpy as np
from numpy.typing import NDArray


def split_alpha(image: NDArray[np.uint8]) -> tuple[NDArray[np.uint8], NDArray[np.uint8] | None]:
    """Return (bgr_or_gray, alpha_or_None). Never mutates input."""
    if image.ndim == 3 and image.shape[2] == 4:
        return image[:, :, :3].copy(), image[:, :, 3].copy()
    return image.copy(), None


def gray_to_bgr(gray: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Grayscale (H,W) -> BGR (H,W,3) tanpa cv2.cvtColor."""
    if gray.ndim == 3:
        return gray
    return np.stack([gray, gray, gray], axis=2).astype(np.uint8)


def merge_alpha(
    processed: NDArray[np.uint8],
    alpha: NDArray[np.uint8] | None,
    *,
    flip_alpha: bool = False,
    flip_code: int | None = None,
) -> NDArray[np.uint8]:
    """Recombine processed BGR/gray with original alpha.

    Args:
        processed: RGB/BGR or grayscale result (uint8).
        alpha: original alpha channel or None.
        flip_alpha: if True, also flip the alpha channel (for mirroring).
        flip_code: flip code (0=vertical, 1=horizontal, -1=both) used when flip_alpha=True.
    """
    if alpha is None:
        return processed

    out_alpha = alpha
    if flip_alpha and flip_code is not None:
        if flip_code == 1:          # horizontal
            out_alpha = np.ascontiguousarray(alpha[:, ::-1])
        elif flip_code == 0:        # vertical
            out_alpha = np.ascontiguousarray(alpha[::-1, :])
        else:                       # both (-1)
            out_alpha = np.ascontiguousarray(alpha[::-1, ::-1])

    if processed.ndim == 2:
        processed = gray_to_bgr(processed)

    # Concatenate along channel axis: (H, W, 3) + (H, W, 1) -> (H, W, 4)
    return np.concatenate(
        [processed, out_alpha[:, :, np.newaxis]], axis=2
    ).astype(np.uint8)
