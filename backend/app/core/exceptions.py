class AppError(Exception):
    """Base domain exception."""

    def __init__(
        self, message: str, error_code: str = "APP_ERROR", detail: str | None = None
    ) -> None:
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.detail = detail


class InvalidFileError(AppError):
    def __init__(self, detail: str = "") -> None:
        super().__init__("File tidak valid atau bukan gambar.", "INVALID_FILE", detail)


class FileTooLargeError(AppError):
    def __init__(self, size_bytes: int, limit_bytes: int) -> None:
        super().__init__(
            f"Ukuran file ({size_bytes} bytes) melebihi batas {limit_bytes} bytes.",
            "FILE_TOO_LARGE",
            f"size={size_bytes}, limit={limit_bytes}",
        )


class SessionNotFoundError(AppError):
    def __init__(self, session_id: str) -> None:
        super().__init__(f"Sesi '{session_id}' tidak ditemukan.", "SESSION_NOT_FOUND", session_id)


class InvalidParamsError(AppError):
    def __init__(self, detail: str = "") -> None:
        super().__init__("Parameter operasi tidak valid.", "INVALID_PARAMS", detail)


class OperationNotFoundError(AppError):
    def __init__(self, operation: str) -> None:
        super().__init__(f"Operasi '{operation}' tidak dikenal.", "OPERATION_NOT_FOUND", operation)


class HistoryError(AppError):
    def __init__(self, detail: str = "") -> None:
        super().__init__("Operasi history tidak dapat dilakukan.", "HISTORY_ERROR", detail)
