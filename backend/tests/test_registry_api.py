"""Tests: registry pattern and API endpoints."""

import io

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import InvalidParamsError, OperationNotFoundError
from app.services.registry import execute_operation, get_registry, resolve
from tests.conftest import bgr_to_png_bytes, make_rgb, make_rgba


class TestRegistry:
    def test_all_operations_registered(self):
        reg = get_registry()
        expected_ops = {
            "grayscale", "brightness", "negative", "threshold", "equalize",
            "blur_gaussian", "blur_averaging", "blur_median", "blur_bilateral", "blur_filter2d",
            "sharpen", "edge_sobel", "edge_prewitt", "edge_laplacian", "edge_canny",
            "sketch", "mirror",
        }
        assert expected_ops.issubset(set(reg.keys()))

    def test_unknown_operation_raises(self):
        with pytest.raises(OperationNotFoundError):
            resolve("nonexistent_op")

    def test_invalid_params_raises(self):
        with pytest.raises(InvalidParamsError):
            execute_operation("brightness", make_rgb(), {"beta": 999})

    def test_grayscale_luminance(self):
        img = make_rgb()
        out = execute_operation("grayscale", img, {"method": "luminance"})
        assert out.shape == img.shape

    def test_negative(self):
        img = make_rgb()
        out = execute_operation("negative", img, {})
        assert out is not None

    def test_mirror_horizontal(self):
        img = make_rgb()
        out = execute_operation("mirror", img, {"direction": "horizontal"})
        assert out.shape == img.shape

    def test_mirror_none_returns_identity(self):
        img = make_rgb()
        out = execute_operation("mirror", img, {"direction": "none"})
        assert np.array_equal(out, img)
        assert out is not img  # must be a copy

    def test_mirror_none_with_alpha_channel(self):
        img = make_rgba()
        out = execute_operation("mirror", img, {"direction": "none"})
        assert np.array_equal(out, img)
        assert out.shape == img.shape

    def test_canny_low_gt_high_via_registry(self):
        with pytest.raises((InvalidParamsError, Exception)):
            execute_operation(
                "edge_canny", make_rgb(), {"low_threshold": 200, "high_threshold": 50}
            )


class TestAPIEndpoints:
    def test_health(self, client: TestClient):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_upload_valid_image(self, client: TestClient):
        img = make_rgb()
        data = bgr_to_png_bytes(img)
        resp = client.post(
            "/api/images/upload",
            files={"file": ("test.png", io.BytesIO(data), "image/png")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "session_id" in body

    def test_upload_invalid_file(self, client: TestClient):
        from tests.conftest import fake_pdf_with_jpg_ext

        fake = fake_pdf_with_jpg_ext()
        resp = client.post(
            "/api/images/upload",
            files={"file": ("bad.jpg", io.BytesIO(fake), "image/jpeg")},
        )
        assert resp.status_code == 422
        body = resp.json()
        assert body["error_code"] == "INVALID_FILE"

    def test_process_grayscale(self, client: TestClient):
        img = make_rgb()
        data = bgr_to_png_bytes(img)
        upload = client.post(
            "/api/images/upload",
            files={"file": ("t.png", io.BytesIO(data), "image/png")},
        ).json()
        sid = upload["session_id"]

        resp = client.post(
            f"/api/images/{sid}/process",
            json={"operation": "grayscale", "params": {"method": "luminance"}, "commit": False},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "preview_base64" in body
        assert body["processing_time_ms"] >= 0

    def test_process_unknown_op(self, client: TestClient):
        img = make_rgb()
        data = bgr_to_png_bytes(img)
        upload = client.post(
            "/api/images/upload",
            files={"file": ("t.png", io.BytesIO(data), "image/png")},
        ).json()
        sid = upload["session_id"]
        resp = client.post(
            f"/api/images/{sid}/process",
            json={"operation": "unknown_op", "params": {}},
        )
        assert resp.status_code == 422

    def test_history_undo_redo_reset(self, client: TestClient):
        img = make_rgb()
        data = bgr_to_png_bytes(img)
        sid = client.post(
            "/api/images/upload",
            files={"file": ("t.png", io.BytesIO(data), "image/png")},
        ).json()["session_id"]

        client.post(
            f"/api/images/{sid}/process",
            json={"operation": "negative", "params": {}, "commit": True},
        )

        resp = client.post(f"/api/images/{sid}/history/undo")
        assert resp.status_code == 200

        resp = client.post(f"/api/images/{sid}/history/redo")
        assert resp.status_code == 200

        resp = client.post(f"/api/images/{sid}/history/reset")
        assert resp.status_code == 200

    def test_export_png(self, client: TestClient):
        img = make_rgb()
        data = bgr_to_png_bytes(img)
        sid = client.post(
            "/api/images/upload",
            files={"file": ("t.png", io.BytesIO(data), "image/png")},
        ).json()["session_id"]

        resp = client.get(f"/api/images/{sid}/export?format=png")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"
        assert resp.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_session_not_found(self, client: TestClient):
        resp = client.post(
            "/api/images/00000000-0000-0000-0000-000000000000/process",
            json={"operation": "negative", "params": {}},
        )
        assert resp.status_code == 422
        assert resp.json()["error_code"] == "SESSION_NOT_FOUND"

    def test_samples_endpoint(self, client: TestClient):
        resp = client.get("/api/samples")
        assert resp.status_code == 200
        body = resp.json()
        assert "samples" in body
        assert len(body["samples"]) == 3

    def test_process_otsu_returns_threshold(self, client: TestClient):
        img = make_rgb()
        img[:32, :] = 40
        img[32:, :] = 200
        data = bgr_to_png_bytes(img)
        sid = client.post(
            "/api/images/upload",
            files={"file": ("otsu.png", io.BytesIO(data), "image/png")},
        ).json()["session_id"]

        resp = client.post(
            f"/api/images/{sid}/process",
            json={"operation": "threshold", "params": {"method": "otsu"}, "commit": False},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["otsu_threshold"] is not None
        assert isinstance(body["otsu_threshold"], float)
