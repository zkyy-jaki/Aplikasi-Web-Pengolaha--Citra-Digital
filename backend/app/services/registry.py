"""Operation registry — maps operation names to (ParamSchema, handler_callable)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.core.exceptions import InvalidParamsError, OperationNotFoundError
from app.services import ops_blur, ops_detail, ops_geometry, ops_point

# ---------------------------------------------------------------------------
# Parameter Schemas
# ---------------------------------------------------------------------------

class NoParams(BaseModel):
    pass


class GrayscaleParams(BaseModel):
    method: str = Field("luminance", pattern="^(luminance|average|lightness)$")


class BrightnessParams(BaseModel):
    beta: int = Field(0, ge=-255, le=255)


class ThresholdParams(BaseModel):
    method: str = Field("binary", pattern="^(binary|binary_inv|truncate|to_zero|otsu)$")
    thresh: int = Field(127, ge=0, le=255)


class EqualizeParams(BaseModel):
    mode: str = Field("global", pattern="^(global|clahe)$")
    clip_limit: float = Field(2.0, gt=0)
    tile_grid_size: int = Field(8, ge=1)


class GaussianBlurParams(BaseModel):
    kernel_size: int = Field(5, ge=3, le=31)
    sigma: float = Field(0.0, ge=0)

    @field_validator("kernel_size")
    @classmethod
    def must_be_odd(cls, v: int) -> int:
        if v % 2 == 0:
            raise ValueError("kernel_size harus ganjil")
        return v


class AveragingBlurParams(BaseModel):
    kernel_size: int = Field(5, ge=3, le=31)

    @field_validator("kernel_size")
    @classmethod
    def must_be_odd(cls, v: int) -> int:
        if v % 2 == 0:
            raise ValueError("kernel_size harus ganjil")
        return v


class MedianBlurParams(BaseModel):
    kernel_size: int = Field(5, ge=3, le=31)

    @field_validator("kernel_size")
    @classmethod
    def must_be_odd(cls, v: int) -> int:
        if v % 2 == 0:
            raise ValueError("kernel_size harus ganjil")
        return v


class BilateralBlurParams(BaseModel):
    diameter: int = Field(9, ge=1, le=15)
    sigma_color: float = Field(75.0, ge=10, le=150)
    sigma_space: float = Field(75.0, ge=10, le=150)


class Filter2DParams(BaseModel):
    kernel: list[list[float]]
    auto_normalize: bool = True


class SharpenParams(BaseModel):
    method: str = Field("standard", pattern="^(standard|strong|unsharp_mask)$")
    alpha_strength: float = Field(1.0, ge=0.0, le=3.0)


class SobelParams(BaseModel):
    direction: str = Field("combined", pattern="^(combined|x|y)$")
    ksize: int = Field(3, ge=3, le=5)


class LaplacianParams(BaseModel):
    pre_gaussian: bool = False


class CannyParams(BaseModel):
    low_threshold: int = Field(50, ge=0, le=255)
    high_threshold: int = Field(150, ge=0, le=255)

    @field_validator("high_threshold")
    @classmethod
    def high_gte_low(cls, v: int, info: Any) -> int:
        low = info.data.get("low_threshold", 0)
        if v < low:
            raise ValueError("high_threshold harus >= low_threshold")
        return v


class SketchParams(BaseModel):
    kernel_size: int = Field(21, ge=3, le=51)

    @field_validator("kernel_size")
    @classmethod
    def must_be_odd(cls, v: int) -> int:
        if v % 2 == 0:
            raise ValueError("kernel_size harus ganjil")
        return v


class MirrorParams(BaseModel):
    direction: str = Field("none", pattern="^(none|horizontal|vertical|both)$")


# ---------------------------------------------------------------------------
# Registry entry type
# ---------------------------------------------------------------------------

type ParamSchema = type[BaseModel]
type Handler = Callable[..., Any]

_REGISTRY: dict[str, tuple[ParamSchema, Handler]] = {}


def _register(name: str, schema: ParamSchema, handler: Handler) -> None:
    _REGISTRY[name] = (schema, handler)


def _dispatch_grayscale(image: Any, **params: Any) -> Any:
    method = params.get("method", "luminance")
    dispatch = {
        "luminance": ops_point.grayscale_luminance,
        "average": ops_point.grayscale_average,
        "lightness": ops_point.grayscale_lightness,
    }
    return dispatch[method](image)


def _dispatch_threshold(image: Any, **params: Any) -> Any:
    method = params.get("method", "binary")
    thresh = params.get("thresh", 127)
    dispatch = {
        "binary": lambda img: ops_point.threshold_binary(img, thresh),
        "binary_inv": lambda img: ops_point.threshold_binary_inv(img, thresh),
        "truncate": lambda img: ops_point.threshold_truncate(img, thresh),
        "to_zero": lambda img: ops_point.threshold_to_zero(img, thresh),
        "otsu": lambda img: ops_point.threshold_otsu(img),
    }
    return dispatch[method](image)


def _dispatch_equalize(image: Any, **params: Any) -> Any:
    if params.get("mode", "global") == "clahe":
        return ops_point.equalize_clahe(
            image,
            clip_limit=params.get("clip_limit", 2.0),
            tile_grid_size=params.get("tile_grid_size", 8),
        )
    return ops_point.equalize_global(image)


def _dispatch_sharpen(image: Any, **params: Any) -> Any:
    method = params.get("method", "standard")
    dispatch = {
        "standard": ops_detail.sharpen_kernel_standard,
        "strong": ops_detail.sharpen_kernel_strong,
        "unsharp_mask": lambda img: ops_detail.sharpen_unsharp_mask(
            img, params.get("alpha_strength", 1.0)
        ),
    }
    return dispatch[method](image)


def _dispatch_mirror(image: Any, **params: Any) -> Any:
    direction = params.get("direction", "none")
    if direction == "none":
        return image.copy()
    dispatch = {
        "horizontal": ops_geometry.mirror_horizontal,
        "vertical": ops_geometry.mirror_vertical,
        "both": ops_geometry.mirror_both,
    }
    return dispatch[direction](image)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_register("grayscale", GrayscaleParams, _dispatch_grayscale)
_register(
    "brightness",
    BrightnessParams,
    lambda img, **p: ops_point.adjust_brightness(img, p["beta"]),
)
_register("negative", NoParams, lambda img, **_: ops_point.negative(img))
_register("threshold", ThresholdParams, _dispatch_threshold)
_register("equalize", EqualizeParams, _dispatch_equalize)

_register("blur_gaussian", GaussianBlurParams,
          lambda img, **p: ops_blur.blur_gaussian(img, p["kernel_size"], p["sigma"]))
_register("blur_averaging", AveragingBlurParams,
          lambda img, **p: ops_blur.blur_averaging(img, p["kernel_size"]))
_register("blur_median", MedianBlurParams,
          lambda img, **p: ops_blur.blur_median(img, p["kernel_size"]))
_register(
    "blur_bilateral",
    BilateralBlurParams,
    lambda img, **p: ops_blur.blur_bilateral(
        img, p["diameter"], p["sigma_color"], p["sigma_space"]
    ),
)
_register("blur_filter2d", Filter2DParams,
          lambda img, **p: ops_blur.blur_filter2d(img, p["kernel"], p["auto_normalize"]))

_register("sharpen", SharpenParams, _dispatch_sharpen)
_register("edge_sobel", SobelParams,
          lambda img, **p: ops_detail.edge_sobel(img, p["direction"], p["ksize"]))
_register("edge_prewitt", NoParams, lambda img, **_: ops_detail.edge_prewitt(img))
_register("edge_laplacian", LaplacianParams,
          lambda img, **p: ops_detail.edge_laplacian(img, p["pre_gaussian"]))
_register("edge_canny", CannyParams,
          lambda img, **p: ops_detail.edge_canny(img, p["low_threshold"], p["high_threshold"]))
_register("sketch", SketchParams, lambda img, **p: ops_detail.sketch(img, p["kernel_size"]))

_register("mirror", MirrorParams, _dispatch_mirror)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_registry() -> dict[str, tuple[ParamSchema, Handler]]:
    return dict(_REGISTRY)


def resolve(operation: str) -> tuple[ParamSchema, Handler]:
    if operation not in _REGISTRY:
        raise OperationNotFoundError(operation)
    return _REGISTRY[operation]


def execute_operation(operation: str, image: Any, raw_params: dict[str, Any]) -> Any:
    schema_cls, handler = resolve(operation)
    try:
        validated = schema_cls(**raw_params)
    except Exception as exc:
        raise InvalidParamsError(str(exc)) from exc
    return handler(image, **validated.model_dump())
