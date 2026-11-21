"""Tests: file upload, magic byte validation, session management, export."""


import numpy as np
import pytest

from app.core.exceptions import FileTooLargeError, InvalidFileError
from app.services.session_manager import export_image, get_session, upload_image
from tests.conftest import (
    bgr_to_jpeg_bytes,
    bgr_to_png_bytes,
    fake_pdf_with_jpg_ext,
    make_rgb,
    make_rgba,
)


class TestMagicByteValidation:
    def test_valid_jpeg_accepted(self):
        img = make_rgb()
        data = bgr_to_jpeg_bytes(img)
        result = upload_image(data, "test.jpg")
        assert "session_id" in result
        assert result["format"] == "image/jpeg"

    def test_valid_png_accepted(self):
        img = make_rgba()
        data = bgr_to_png_bytes(img)
        result = upload_image(data, "test.png")
        assert result["channels"] == 4

    def test_pdf_disguised_as_jpg_rejected(self):
        with pytest.raises(InvalidFileError) as exc_info:
            upload_image(fake_pdf_with_jpg_ext(), "malicious.jpg")
        assert exc_info.value.error_code == "INVALID_FILE"

    def test_empty_bytes_rejected(self):
        with pytest.raises(InvalidFileError):
            upload_image(b"", "empty.jpg")

    def test_file_too_large_rejected(self):
        large = b"\xff\xd8\xff" + b"\x00" * (11 * 1024 * 1024)
        with pytest.raises(FileTooLargeError):
            upload_image(large, "big.jpg")


class TestUploadMetadata:
    def test_dimensions_reported(self):
        img = make_rgb(w=80, h=60)
        data = bgr_to_png_bytes(img)
        result = upload_image(data, "img.png")
        assert result["width"] == 80
        assert result["height"] == 60

    def test_rgba_channels_reported(self):
        img = make_rgba(w=32, h=32)
        data = bgr_to_png_bytes(img)
        result = upload_image(data, "img.png")
        assert result["channels"] == 4

    def test_preview_base64_present(self):
        img = make_rgb()
        data = bgr_to_png_bytes(img)
        result = upload_image(data, "img.png")
        assert isinstance(result["preview_base64"], str)
        assert len(result["preview_base64"]) > 0


class TestHistoryStack:
    def _upload(self) -> str:
        img = make_rgb()
        data = bgr_to_png_bytes(img)
        return upload_image(data, "img.png")["session_id"]

    def test_initial_history_empty(self):
        sid = self._upload()
        s = get_session(sid)
        assert s.history_index == -1
        assert len(s.history) == 0

    def test_push_increases_history(self):
        sid = self._upload()
        s = get_session(sid)
        dummy = make_rgb()
        s.push(dummy, "test_op", {})
        assert len(s.history) == 1
        assert s.history_index == 0

    def test_undo_returns_previous(self):
        sid = self._upload()
        s = get_session(sid)
        original = s.current_image.copy()
        modified = (original.astype(np.int16) + 50).clip(0, 255).astype(np.uint8)
        s.push(modified, "brightness", {"beta": 50})
        undone = s.undo()
        np.testing.assert_array_equal(undone, original)

    def test_redo_after_undo(self):
        sid = self._upload()
        s = get_session(sid)
        modified = (s.current_image.astype(np.int16) + 30).clip(0, 255).astype(np.uint8)
        s.push(modified, "brightness", {"beta": 30})
        s.undo()
        redone = s.redo()
        np.testing.assert_array_equal(redone, modified)

    def test_reset_returns_original(self):
        sid = self._upload()
        s = get_session(sid)
        original = s.current_image.copy()
        for _ in range(3):
            m = (s.current_image.astype(np.int16) + 10).clip(0, 255).astype(np.uint8)
            s.push(m, "brightness", {"beta": 10})
        result = s.reset()
        np.testing.assert_array_equal(result, original)
        assert len(s.history) == 0

    def test_history_capped_at_max(self):
        from app.core.config import settings

        sid = self._upload()
        s = get_session(sid)
        for i in range(settings.HISTORY_MAX_STATES + 5):
            dummy = make_rgb(fill=(i % 255, 0, 0))
            s.push(dummy, "op", {"i": i})
        assert len(s.history) <= settings.HISTORY_MAX_STATES

    def test_branching_clears_forward_history(self):
        sid = self._upload()
        s = get_session(sid)
        s.push(make_rgb(fill=(10, 0, 0)), "op1", {})
        s.push(make_rgb(fill=(20, 0, 0)), "op2", {})
        s.undo()
        s.push(make_rgb(fill=(99, 0, 0)), "op_new", {})
        assert len(s.history) == 2


class TestExport:
    def _upload_and_get_sid(self) -> str:
        img = make_rgb(w=64, h=64)
        data = bgr_to_png_bytes(img)
        return upload_image(data, "img.png")["session_id"]

    def test_export_png(self):
        sid = self._upload_and_get_sid()
        data, ct = export_image(sid, "png")
        assert ct == "image/png"
        assert data[:8] == b"\x89PNG\r\n\x1a\n"

    def test_export_jpeg(self):
        sid = self._upload_and_get_sid()
        data, ct = export_image(sid, "jpeg", quality=90)
        assert ct == "image/jpeg"
        assert data[:3] == b"\xff\xd8\xff"

    def test_export_bmp(self):
        sid = self._upload_and_get_sid()
        data, ct = export_image(sid, "bmp")
        assert ct == "image/bmp"
        assert data[:2] == b"BM"

    def test_jpeg_smaller_at_lower_quality(self):
        img = make_salt_pepper()
        data_img = bgr_to_png_bytes(img)
        sid2 = upload_image(data_img, "noise.png")["session_id"]
        d50, _ = export_image(sid2, "jpeg", quality=50)
        d95, _ = export_image(sid2, "jpeg", quality=95)
        assert len(d50) < len(d95)


def make_salt_pepper():
    from tests.conftest import make_salt_pepper as _make
    return _make()
