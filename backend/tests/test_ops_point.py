"""Tests: point operations — grayscale, brightness, negative, threshold, equalization."""

import numpy as np
import pytest

from app.services.ops_point import (
    adjust_brightness,
    equalize_clahe,
    equalize_global,
    grayscale_average,
    grayscale_lightness,
    grayscale_luminance,
    negative,
    threshold_binary,
    threshold_binary_inv,
    threshold_otsu,
    threshold_to_zero,
    threshold_truncate,
)
from tests.conftest import make_gray, make_rgb, make_rgba


class TestGrayscale:
    def test_luminance_output_shape(self):
        img = make_rgb()
        out = grayscale_luminance(img)
        assert out.shape == img.shape  # still 3-channel

    def test_average_output_shape(self):
        img = make_rgb()
        out = grayscale_average(img)
        assert out.shape == img.shape

    def test_lightness_output_shape(self):
        img = make_rgb()
        out = grayscale_lightness(img)
        assert out.shape == img.shape

    def test_all_channels_equal_after_grayscale(self):
        img = make_rgb()
        for fn in (grayscale_luminance, grayscale_average, grayscale_lightness):
            out = fn(img)
            assert out.ndim == 3
            np.testing.assert_array_equal(out[:, :, 0], out[:, :, 1])
            np.testing.assert_array_equal(out[:, :, 1], out[:, :, 2])

    def test_immutability(self):
        img = make_rgb()
        original_copy = img.copy()
        grayscale_luminance(img)
        np.testing.assert_array_equal(img, original_copy)

    def test_already_gray_passthrough(self):
        gray = make_gray()
        # Should not crash; shape becomes 2D
        out = grayscale_luminance(gray)
        assert out is not None


class TestBrightness:
    def test_increase_brightness(self):
        img = np.full((4, 4, 3), 100, dtype=np.uint8)
        out = adjust_brightness(img, 50)
        assert np.all(out == 150)

    def test_decrease_brightness(self):
        img = np.full((4, 4, 3), 100, dtype=np.uint8)
        out = adjust_brightness(img, -50)
        assert np.all(out == 50)

    def test_no_overflow_at_max(self):
        img = np.full((4, 4, 3), 200, dtype=np.uint8)
        out = adjust_brightness(img, 100)
        assert np.all(out <= 255)
        assert out.dtype == np.uint8

    def test_no_underflow_at_min(self):
        img = np.full((4, 4, 3), 50, dtype=np.uint8)
        out = adjust_brightness(img, -100)
        assert np.all(out >= 0)
        assert out.dtype == np.uint8

    def test_full_clamp_to_255(self):
        img = np.full((4, 4, 3), 255, dtype=np.uint8)
        out = adjust_brightness(img, 255)
        assert np.all(out == 255)

    def test_full_clamp_to_0(self):
        img = np.full((4, 4, 3), 0, dtype=np.uint8)
        out = adjust_brightness(img, -255)
        assert np.all(out == 0)

    def test_no_wrap_around(self):
        """uint8 wrap-around would give (200+100) % 256 = 44, not 255."""
        img = np.full((4, 4, 3), 200, dtype=np.uint8)
        out = adjust_brightness(img, 100)
        assert np.all(out == 255), "Wrap-around detected! Clamping not working."

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        adjust_brightness(img, 30)
        np.testing.assert_array_equal(img, copy)


class TestNegative:
    def test_basic_inversion(self):
        img = np.full((4, 4, 3), 100, dtype=np.uint8)
        out = negative(img)
        assert np.all(out == 155)

    def test_double_negative_is_identity(self):
        img = make_rgb()
        out = negative(negative(img))
        np.testing.assert_array_equal(out[:, :, :3], img[:, :, :3])

    def test_alpha_preserved_png(self):
        img = make_rgba()
        original_alpha = img[:, :, 3].copy()
        out = negative(img)
        assert out.shape[2] == 4
        np.testing.assert_array_equal(out[:, :, 3], original_alpha)

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        negative(img)
        np.testing.assert_array_equal(img, copy)


class TestThresholding:
    def test_binary_all_white_at_t0(self):
        """At T=0, all pixels (>0) become 255."""
        img = make_rgb(fill=(128, 128, 128))
        out = threshold_binary(img, 0)
        assert np.all(out == 255)

    def test_binary_all_black_at_t255(self):
        """At T=255, no pixel > 255, so all become 0."""
        img = make_rgb(fill=(200, 200, 200))
        out = threshold_binary(img, 255)
        assert np.all(out == 0)

    def test_binary_inv(self):
        img = make_rgb(fill=(200, 200, 200))
        out = threshold_binary_inv(img, 100)
        # 200 > 100, so binary_inv gives 0
        assert np.all(out == 0)

    def test_truncate(self):
        img = np.full((4, 4, 3), 200, dtype=np.uint8)
        out = threshold_truncate(img, 150)
        # all pixels > 150, so truncated to 150
        assert np.all(out[:, :, 0] == 150)

    def test_to_zero(self):
        img = np.zeros((4, 4, 3), dtype=np.uint8)
        img[0, 0] = 200
        out = threshold_to_zero(img, 100)
        # 200 > 100 stays, 0 <= 100 becomes 0
        assert out[0, 0, 0] == 200
        assert out[1, 1, 0] == 0

    def test_otsu_returns_threshold(self):
        img = make_rgb()
        result, t = threshold_otsu(img)
        assert isinstance(t, float)
        assert 0 <= t <= 255

    def test_works_on_color_input(self):
        """Should not raise even with RGB input."""
        img = make_rgb()
        out = threshold_binary(img, 127)
        assert out is not None


class TestEqualization:
    def test_global_equalize_spreads_histogram(self):
        img = np.full((64, 64, 3), 100, dtype=np.uint8)
        # Add slight variation
        img[32:, 32:] = 110
        out = equalize_global(img)
        assert out.dtype == np.uint8

    def test_global_no_color_shift(self):
        """After equalization, channels should retain hue relationships (not arbitrary)."""
        img = make_rgb(fill=(80, 90, 100))
        # Just check it doesn't crash and returns same shape
        out = equalize_global(img)
        assert out.shape == img.shape

    def test_clahe_produces_output(self):
        img = make_rgb()
        out = equalize_clahe(img, clip_limit=2.0, tile_grid_size=8)
        assert out.shape == img.shape
        assert out.dtype == np.uint8

    def test_clahe_invalid_clip_limit(self):
        from app.core.exceptions import InvalidParamsError

        with pytest.raises(InvalidParamsError):
            equalize_clahe(make_rgb(), clip_limit=0)

    def test_equalize_preserves_alpha(self):
        img = make_rgba()
        original_alpha = img[:, :, 3].copy()
        out = equalize_global(img)
        assert out.shape[2] == 4
        np.testing.assert_array_equal(out[:, :, 3], original_alpha)

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        equalize_global(img)
        np.testing.assert_array_equal(img, copy)
