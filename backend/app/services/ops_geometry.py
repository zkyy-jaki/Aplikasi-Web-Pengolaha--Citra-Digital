"""Geometry operation handlers: mirroring (pure NumPy, no cv2)."""

import numpy as np
from numpy.typing import NDArray

from app.services.alpha_utils import merge_alpha, split_alpha


def mirror_horizontal(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    flipped = np.ascontiguousarray(bgr[:, ::-1])
    return merge_alpha(flipped, alpha, flip_alpha=True, flip_code=1)


def mirror_vertical(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    flipped = np.ascontiguousarray(bgr[::-1, :])
    return merge_alpha(flipped, alpha, flip_alpha=True, flip_code=0)


def mirror_both(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    flipped = np.ascontiguousarray(bgr[::-1, ::-1])
    return merge_alpha(flipped, alpha, flip_alpha=True, flip_code=-1)
