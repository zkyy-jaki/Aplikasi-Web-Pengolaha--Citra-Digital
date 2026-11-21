"""Geometry operation handlers: mirroring."""

import cv2
import numpy as np
from numpy.typing import NDArray

from app.services.alpha_utils import merge_alpha, split_alpha


def mirror_horizontal(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    flipped = cv2.flip(bgr, 1)
    return merge_alpha(flipped, alpha, flip_alpha=True, flip_code=1)


def mirror_vertical(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    flipped = cv2.flip(bgr, 0)
    return merge_alpha(flipped, alpha, flip_alpha=True, flip_code=0)


def mirror_both(image: NDArray[np.uint8]) -> NDArray[np.uint8]:
    bgr, alpha = split_alpha(image)
    flipped = cv2.flip(bgr, -1)
    return merge_alpha(flipped, alpha, flip_alpha=True, flip_code=-1)
