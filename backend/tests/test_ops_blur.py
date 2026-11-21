"""Tests: blur operations."""

from typing import ClassVar

import numpy as np
import pytest

from app.core.exceptions import InvalidParamsError
from app.services.ops_blur import (
    blur_averaging,
    blur_bilateral,
    blur_filter2d,
    blur_gaussian,
    blur_median,
)
from tests.conftest import make_rgb, make_rgba, make_salt_pepper


class TestGaussianBlur:
    def test_basic(self):
        img = make_rgb()
        out = blur_gaussian(img, kernel_size=5)
        assert out.shape == img.shape
        assert out.dtype == np.uint8

    def test_even_kernel_raises(self):
        with pytest.raises(InvalidParamsError):
            blur_gaussian(make_rgb(), kernel_size=4)

    def test_out_of_range_kernel(self):
        with pytest.raises(InvalidParamsError):
            blur_gaussian(make_rgb(), kernel_size=33)

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        blur_gaussian(img, 5)
        np.testing.assert_array_equal(img, copy)

    def test_alpha_preserved(self):
        img = make_rgba()
        alpha = img[:, :, 3].copy()
        out = blur_gaussian(img, 3)
        assert out.shape[2] == 4
        np.testing.assert_array_equal(out[:, :, 3], alpha)


class TestAveragingBlur:
    def test_basic(self):
        img = make_rgb()
        out = blur_averaging(img, 5)
        assert out.shape == img.shape

    def test_even_kernel_raises(self):
        with pytest.raises(InvalidParamsError):
            blur_averaging(make_rgb(), 6)


class TestMedianBlur:
    def test_removes_salt_pepper(self):
        img = make_salt_pepper()
        out = blur_median(img, 5)
        # Median should reduce extreme pixel counts
        salt_before = np.sum(img == 255)
        salt_after = np.sum(out == 255)
        assert salt_after < salt_before

    def test_even_kernel_raises(self):
        with pytest.raises(InvalidParamsError):
            blur_median(make_rgb(), 4)

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        blur_median(img, 3)
        np.testing.assert_array_equal(img, copy)


class TestBilateralBlur:
    def test_basic(self):
        img = make_rgb()
        out = blur_bilateral(img)
        assert out.shape == img.shape

    def test_invalid_diameter(self):
        with pytest.raises(InvalidParamsError):
            blur_bilateral(make_rgb(), diameter=20)

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        blur_bilateral(img)
        np.testing.assert_array_equal(img, copy)


class TestFilter2D:
    _default_kernel: ClassVar = [[1, 2, 1], [2, 4, 2], [1, 2, 1]]

    def test_basic_normalized(self):
        img = make_rgb()
        out = blur_filter2d(img, self._default_kernel, auto_normalize=True)
        assert out.shape == img.shape
        assert out.dtype == np.uint8

    def test_non_numeric_raises(self):
        with pytest.raises((InvalidParamsError, Exception)):
            blur_filter2d(make_rgb(), [["a", "b", "c"], [1, 2, 3], [1, 2, 3]], True)

    def test_zero_sum_kernel_with_normalize_raises(self):
        kernel = [[-1, 1, -1], [1, 0, 1], [-1, 1, -1]]
        # Sum = 0, auto_normalize=True should raise
        with pytest.raises(InvalidParamsError):
            blur_filter2d(make_rgb(), kernel, auto_normalize=True)

    def test_wrong_shape_raises(self):
        with pytest.raises(InvalidParamsError):
            blur_filter2d(make_rgb(), [[1, 2], [3, 4]], True)

    def test_no_normalize(self):
        # With auto_normalize=False, sum=0 kernel is allowed
        kernel = [[-1, 1, -1], [1, 0, 1], [-1, 1, -1]]
        out = blur_filter2d(make_rgb(), kernel, auto_normalize=False)
        assert out is not None

    def test_immutability(self):
        img = make_rgb()
        copy = img.copy()
        blur_filter2d(img, self._default_kernel, True)
        np.testing.assert_array_equal(img, copy)

    def test_5x5_kernel(self):
        kernel = [[1] * 5 for _ in range(5)]
        out = blur_filter2d(make_rgb(), kernel, auto_normalize=True)
        assert out.shape == make_rgb().shape
