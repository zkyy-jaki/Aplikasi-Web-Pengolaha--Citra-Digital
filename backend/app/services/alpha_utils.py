"""Alpha channel utilities — keep transparency intact across operations."""

import cv2
import numpy as np
from numpy.typing import NDArray


def split_alpha(image: NDArray[np.uint8]) -> tuple[NDArray[np.uint8], NDArray[np.uint8] | None]:
    """Return (bgr_or_gray, alpha_or_None). Never mutates input."""
    if image.ndim == 3 and image.shape[2] == 4:
        return image[:, :, :3].copy(), image[:, :, 3].copy()
    return image.copy(), None


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
        flip_code: cv2 flip code (0=vertical, 1=horizontal, -1=both) used when flip_alpha=True.
    """
    if alpha is None:
        return processed

    out_alpha = alpha
    if flip_alpha and flip_code is not None:
        out_alpha = cv2.flip(alpha, flip_code)

    if processed.ndim == 2:
        processed = cv2.cvtColor(processed, cv2.COLOR_GRAY2BGR)

    return cv2.merge([processed[:, :, 0], processed[:, :, 1], processed[:, :, 2], out_alpha])
