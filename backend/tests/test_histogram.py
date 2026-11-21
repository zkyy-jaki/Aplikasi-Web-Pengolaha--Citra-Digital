"""Tests: histogram computation."""

import numpy as np

from app.services.histogram import compute_histogram
from tests.conftest import make_gray, make_rgb, make_rgba


class TestHistogram:
    def test_rgb_mode(self):
        img = make_rgb()
        result = compute_histogram(img)
        assert result.mode == "rgb"
        assert len(result.channels) == 3
        channel_names = {c.channel for c in result.channels}
        assert channel_names == {"red", "green", "blue"}

    def test_grayscale_mode(self):
        img = make_gray()
        result = compute_histogram(img)
        assert result.mode == "grayscale"
        assert len(result.channels) == 1
        assert result.channels[0].channel == "gray"

    def test_bin_count(self):
        img = make_rgb()
        result = compute_histogram(img)
        for ch in result.channels:
            assert len(ch.values) == 256

    def test_stats_min_max(self):
        img = np.full((4, 4, 3), 128, dtype=np.uint8)
        result = compute_histogram(img)
        assert result.stats.min == 128
        assert result.stats.max == 128

    def test_stats_mean(self):
        img = np.zeros((4, 4, 3), dtype=np.uint8)
        img[:, :, :] = 100
        result = compute_histogram(img)
        assert abs(result.stats.mean - 100.0) < 0.5

    def test_stats_std_dev_uniform(self):
        img = np.full((8, 8, 3), 200, dtype=np.uint8)
        result = compute_histogram(img)
        assert result.stats.std_dev < 1.0  # uniform image has ~0 std dev

    def test_rgba_handled(self):
        img = make_rgba()
        result = compute_histogram(img)
        assert result.mode == "rgb"  # alpha stripped for hist

    def test_histogram_total_pixels(self):
        img = make_rgb(w=8, h=8)
        result = compute_histogram(img)
        # Total counts across all channels = H*W for each channel
        h, w = 8, 8
        for ch in result.channels:
            assert sum(ch.values) == h * w
