"""Histogram computation and pixel statistics (pure NumPy, no cv2)."""

import numpy as np
from numpy.typing import NDArray
from pydantic import BaseModel


class ChannelHistogram(BaseModel):
    channel: str
    values: list[int]  # 256 bins


class HistogramStats(BaseModel):
    min: float
    max: float
    mean: float
    std_dev: float


class HistogramResult(BaseModel):
    channels: list[ChannelHistogram]
    stats: HistogramStats
    mode: str  # "rgb" | "grayscale"


def compute_histogram(image: NDArray[np.uint8]) -> HistogramResult:
    is_gray = image.ndim == 2 or (image.ndim == 3 and image.shape[2] == 1)

    if is_gray:
        gray = image if image.ndim == 2 else image[:, :, 0]
        hist_vals = np.bincount(gray.ravel(), minlength=256).tolist()
        channels = [ChannelHistogram(channel="gray", values=hist_vals)]
        flat = gray.flatten().astype(np.float64)
        stats = HistogramStats(
            min=float(flat.min()),
            max=float(flat.max()),
            mean=float(flat.mean()),
            std_dev=float(flat.std()),
        )
        return HistogramResult(channels=channels, stats=stats, mode="grayscale")

    # Colour image — use BGR channels (strip alpha if present)
    bgr = image[:, :, :3]
    names = ["blue", "green", "red"]
    channels = []
    for i, name in enumerate(names):
        h = np.bincount(bgr[:, :, i].ravel(), minlength=256).tolist()
        channels.append(ChannelHistogram(channel=name, values=h))

    flat = bgr.flatten().astype(np.float64)
    stats = HistogramStats(
        min=float(flat.min()),
        max=float(flat.max()),
        mean=float(flat.mean()),
        std_dev=float(flat.std()),
    )
    return HistogramResult(channels=channels, stats=stats, mode="rgb")
