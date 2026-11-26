"""Tests: stateless live camera frame processing endpoint."""

import io
import json

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.services import session_manager
from tests.conftest import bgr_to_jpeg_bytes, make_rgb


class TestLiveFrameEndpoint:
    def test_live_frame_grayscale_stateless(self, client: TestClient):
        initial_sessions = len(session_manager._store)
        img = make_rgb(w=320, h=240)
        jpg = bgr_to_jpeg_bytes(img)

        resp = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", io.BytesIO(jpg), "image/jpeg")},
            data={"operation": "grayscale", "params": json.dumps({"method": "luminance"})},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/jpeg"
        assert "X-Processing-Time-Ms" in resp.headers
        assert float(resp.headers["X-Processing-Time-Ms"]) >= 0.0
        # Verify returned JPEG is valid
        arr = np.frombuffer(resp.content, dtype=np.uint8)
        decoded = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        assert decoded is not None
        assert decoded.shape == (240, 320, 3)
        # Stateless guarantee: no session created
        assert len(session_manager._store) == initial_sessions

    def test_live_frame_canny_and_otsu_headers(self, client: TestClient):
        img = make_rgb(w=160, h=120)
        img[:60, :] = 30
        img[60:, :] = 220
        jpg = bgr_to_jpeg_bytes(img)

        resp_canny = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", io.BytesIO(jpg), "image/jpeg")},
            data={
                "operation": "edge_canny",
                "params": json.dumps({"low_threshold": 50, "high_threshold": 150}),
            },
        )
        assert resp_canny.status_code == 200

        resp_otsu = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", io.BytesIO(jpg), "image/jpeg")},
            data={"operation": "threshold", "params": json.dumps({"method": "otsu"})},
        )
        assert resp_otsu.status_code == 200
        assert "X-Otsu-Threshold" in resp_otsu.headers

    def test_live_frame_1080p_accepted_without_upscale_error(self, client: TestClient):
        img = make_rgb(w=1920, h=1080)
        jpg = bgr_to_jpeg_bytes(img)
        resp = client.post(
            "/api/images/process-frame",
            files={"file": ("frame_1080p.jpg", io.BytesIO(jpg), "image/jpeg")},
            data={"operation": "negative", "params": "{}"},
        )
        assert resp.status_code == 200
        arr = np.frombuffer(resp.content, dtype=np.uint8)
        decoded = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        assert decoded is not None
        assert decoded.shape == (1080, 1920, 3)

    def test_live_frame_invalid_inputs(self, client: TestClient):
        jpg = bgr_to_jpeg_bytes(make_rgb(w=64, h=64))

        # Unknown operation
        r1 = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", io.BytesIO(jpg), "image/jpeg")},
            data={"operation": "unknown_op", "params": "{}"},
        )
        assert r1.status_code == 422
        assert r1.json()["error_code"] == "OPERATION_NOT_FOUND"

        # Invalid JSON params
        r2 = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", io.BytesIO(jpg), "image/jpeg")},
            data={"operation": "negative", "params": "{bad-json"},
        )
        assert r2.status_code == 422
        assert r2.json()["error_code"] == "INVALID_PARAMS"

        # Corrupt image bytes
        r3 = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", io.BytesIO(b"not-an-image"), "image/jpeg")},
            data={"operation": "negative", "params": "{}"},
        )
        assert r3.status_code == 422
        assert r3.json()["error_code"] == "INVALID_FILE"
