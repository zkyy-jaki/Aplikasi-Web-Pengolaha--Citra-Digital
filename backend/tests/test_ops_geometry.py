"""Tests: geometry operations — mirroring."""

import numpy as np

from app.services.ops_geometry import mirror_both, mirror_horizontal, mirror_vertical
from tests.conftest import make_rgb, make_rgba


class TestMirroring:
    def test_horizontal_flip(self):
        img = np.zeros((4, 4, 3), dtype=np.uint8)
        img[:, 0] = 255  # mark left column
        out = mirror_horizontal(img)
        # Left column should now be right
        assert np.all(out[:, 3] == 255)
        assert np.all(out[:, 0] == 0)

    def test_vertical_flip(self):
        img = np.zeros((4, 4, 3), dtype=np.uint8)
        img[0, :] = 255  # mark top row
        out = mirror_vertical(img)
        assert np.all(out[3, :] == 255)
        assert np.all(out[0, :] == 0)

    def test_both_flip(self):
        img = np.zeros((4, 4, 3), dtype=np.uint8)
        img[0, 0] = 255  # top-left pixel
        out = mirror_both(img)
        assert out[3, 3, 0] == 255
        assert out[0, 0, 0] == 0

    def test_alpha_flipped_horizontally(self):
        img = make_rgba(w=4, h=4)
        img[:, :, 3] = 0
        img[:, 0, 3] = 200  # alpha on left column
        out = mirror_horizontal(img)
        assert np.all(out[:, 3, 3] == 200)  # should be on right column now
        assert np.all(out[:, 0, 3] == 0)

    def test_alpha_flipped_vertically(self):
        img = make_rgba(w=4, h=4)
        img[:, :, 3] = 0
        img[0, :, 3] = 200  # alpha on top row
        out = mirror_vertical(img)
        assert np.all(out[3, :, 3] == 200)

    def test_immutability_horizontal(self):
        img = make_rgb()
        copy = img.copy()
        mirror_horizontal(img)
        np.testing.assert_array_equal(img, copy)

    def test_immutability_vertical(self):
        img = make_rgb()
        copy = img.copy()
        mirror_vertical(img)
        np.testing.assert_array_equal(img, copy)

    def test_shape_preserved(self):
        img = make_rgb(w=80, h=60)
        for fn in (mirror_horizontal, mirror_vertical, mirror_both):
            out = fn(img)
            assert out.shape == img.shape
