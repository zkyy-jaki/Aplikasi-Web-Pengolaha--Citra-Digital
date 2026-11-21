"""FastAPI application entry point."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.exceptions import AppError
from app.core.logging import configure_logging, get_logger
from app.routers import images, samples

configure_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="PCD Backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(images.router)
app.include_router(samples.router)


@app.exception_handler(AppError)
def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    logger.warning("AppError: %s | %s", exc.error_code, exc.message)
    return JSONResponse(
        status_code=422,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "detail": exc.detail,
        },
    )


@app.exception_handler(ValidationError)
def validation_error_handler(_request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "Validasi input gagal",
            "detail": str(exc),
        },
    )


@app.exception_handler(Exception)
def generic_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": "Terjadi kesalahan internal.",
            "detail": str(exc),
        },
    )


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}
