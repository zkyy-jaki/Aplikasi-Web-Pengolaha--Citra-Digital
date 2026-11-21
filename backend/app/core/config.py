from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # File upload limits
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
        {"image/jpeg", "image/png", "image/bmp", "image/webp"}
    )

    # Magic bytes signatures for validation
    MAGIC_BYTES: dict[bytes, str] = {
        b"\xff\xd8\xff": "image/jpeg",
        b"\x89PNG\r\n\x1a\n": "image/png",
        b"BM": "image/bmp",
        b"RIFF": "image/webp",  # partial; full check includes offset 8: b"WEBP"
    }

    # Preview / resolution limits
    PREVIEW_MAX_SIDE: int = 1280
    LARGE_IMAGE_THRESHOLD: int = 4000

    # History stack
    HISTORY_MAX_STATES: int = 20

    # Session TTL in seconds (30 minutes)
    SESSION_TTL_SECONDS: int = 1800

    # Blur kernel constraints
    BLUR_KERNEL_MIN: int = 3
    BLUR_KERNEL_MAX: int = 31

    # Sketch blur kernel constraints
    SKETCH_KERNEL_MIN: int = 3
    SKETCH_KERNEL_MAX: int = 51

    # Brightness range
    BRIGHTNESS_MIN: int = -255
    BRIGHTNESS_MAX: int = 255

    # Canny thresholds
    CANNY_THRESHOLD_MIN: int = 0
    CANNY_THRESHOLD_MAX: int = 255

    # Export quality
    JPEG_QUALITY_MIN: int = 10
    JPEG_QUALITY_MAX: int = 100
    JPEG_QUALITY_DEFAULT: int = 90


settings = Settings()
