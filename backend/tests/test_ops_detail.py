"""Tests: detail operations — sharpening, edge detection, sketch."""

import numpy as np
import pytest

from app.core.exceptions import InvalidParamsError
from app.services.ops_detail import (
    edge_canny,
    edge_laplacian,
    edge_prewitt,
    edge_sobel,
    sharpen_kernel_standard,
    sharpen_kernel_strong,
    sharpen_unsharp_mask,
    sketch,
)
from tests.conftest import make_rgb, make_salt_pepper


class TestSharpening:
    def test_kernel_standard(self):
        img = make_rgb()
        out = sharpen_kernel_standard(img)
        assert out.shape == img.shape
        assert out.dtype == np.uint8

    def test_kernel_strong(self):
        img = make_rgb()
        out = sharpen_kernel_strong(img)
        assert out.shape == img.shape

    def test_unsharp_mask(self):
        img = make_rgb()
        out = sharpen_unsharp_mask(img, 1.5)
        assert out.shape == img.shape

    def test_unsharp_mask_invalid_alpha(self):
        with pytest.raises(InvalidParamsError):
            sharpen_unsharp_mask(make_rgb(), alpha_strength=5.0)

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        sharpen_kernel_standard(img)
        np.testing.assert_array_equal(img, copy)


class TestEdgeDetection:
    def test_sobel_combined(self):
        img = make_rgb()
        out = edge_sobel(img, "combined")
        assert out.shape == img.shape
        assert out.dtype == np.uint8

    def test_sobel_x(self):
        img = make_rgb()
        out = edge_sobel(img, "x")
        assert out is not None

    def test_sobel_y(self):
        img = make_rgb()
        out = edge_sobel(img, "y")
        assert out is not None

    def test_prewitt(self):
        img = make_rgb()
        out = edge_prewitt(img)
        assert out.shape == img.shape

    def test_laplacian(self):
        img = make_rgb()
        out = edge_laplacian(img)
        assert out.shape == img.shape

    def test_laplacian_with_preblur(self):
        img = make_rgb()
        out = edge_laplacian(img, pre_gaussian=True)
        assert out.shape == img.shape

    def test_canny_valid(self):
        img = make_rgb()
        out = edge_canny(img, 50, 150)
        assert out.shape == img.shape

    def test_canny_low_gt_high_raises(self):
        with pytest.raises(InvalidParamsError):
            edge_canny(make_rgb(), low_threshold=150, high_threshold=50)

    def test_canny_equal_thresholds_ok(self):
        out = edge_canny(make_rgb(), 100, 100)
        assert out is not None

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        edge_sobel(img)
        np.testing.assert_array_equal(img, copy)

    def test_canny_produces_binary_result(self):
        import cv2
        img = make_rgb()
        out = edge_canny(img, 50, 150)
        gray = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)
        unique = np.unique(gray)
        assert set(unique).issubset({0, 255})


class TestSketch:
    def test_basic(self):
        img = make_rgb()
        out = sketch(img, kernel_size=21)
        assert out.shape == img.shape
        assert out.dtype == np.uint8

    def test_no_division_by_zero_on_white(self):
        """White image: I_gray=255, I_inv=0, I_blur=0, denom=255-0=255 — should not error."""
        img = np.full((32, 32, 3), 255, dtype=np.uint8)
        out = sketch(img, kernel_size=5)
        assert out is not None

    def test_kernel_effect_on_thickness(self):
        img = make_salt_pepper()
        out_small = sketch(img, 5)
        out_large = sketch(img, 35)
        # Different kernel sizes produce different results
        assert not np.array_equal(out_small, out_large)

    def test_even_kernel_raises(self):
        with pytest.raises(InvalidParamsError):
            sketch(make_rgb(), kernel_size=20)

    def test_out_of_range_kernel_raises(self):
        with pytest.raises(InvalidParamsError):
            sketch(make_rgb(), kernel_size=55)

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        sketch(img, 5)
        np.testing.assert_array_equal(img, copy)
