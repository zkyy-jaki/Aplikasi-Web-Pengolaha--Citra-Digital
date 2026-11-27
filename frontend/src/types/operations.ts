/**
 * Type definitions matching backend PCD contracts and schemas.
 */

export interface ChannelHistogram {
  channel: 'blue' | 'green' | 'red' | 'gray';
  values: number[]; // 256 bins
}

export interface HistogramStats {
  min: number;
  max: number;
  mean: number;
  std_dev: number;
}

export interface HistogramResult {
  channels: ChannelHistogram[];
  stats: HistogramStats;
  mode: 'rgb' | 'grayscale';
}

export interface UploadResponse {
  session_id: string;
  width: number;
  height: number;
  format: string;
  channels: number;
  filename: string;
  preview_base64: string;
  histogram: HistogramResult;
}

export interface ProcessResponse {
  session_id: string;
  preview_base64: string;
  histogram: HistogramResult;
  processing_time_ms: number;
  otsu_threshold?: number | null;
  history?: string[] | null;
  history_steps?: HistoryStepItem[] | null;
  history_index?: number | null;
}

export interface HistoryStepItem {
  id: string;
  operation: string;
  params: Record<string, unknown>;
  label: string;
  enabled: boolean;
}

export interface HistoryResponse {
  session_id: string;
  history: string[];
  history_steps?: HistoryStepItem[];
  history_index: number;
  preview_base64: string;
  histogram: HistogramResult;
}

export interface ApiErrorResponse {
  error_code: string;
  message: string;
  detail?: string | null;
}

// ---------------------------------------------------------------------------
// Discriminated Unions for Operation Parameters
// ---------------------------------------------------------------------------

export type GrayscaleMethod = 'luminance' | 'average' | 'lightness';
export interface GrayscaleParams {
  method: GrayscaleMethod;
}

export interface BrightnessParams {
  beta: number; // -255 to 255
}

export type ThresholdMethod = 'binary' | 'binary_inv' | 'truncate' | 'to_zero' | 'otsu';
export interface ThresholdParams {
  method: ThresholdMethod;
  thresh: number; // 0 to 255
}

export type EqualizeMode = 'global' | 'clahe';
export interface EqualizeParams {
  mode: EqualizeMode;
  clip_limit: number;
  tile_grid_size: number;
}

export interface GaussianBlurParams {
  kernel_size: number; // 3..31 odd
  sigma: number; // >= 0
}

export interface AveragingBlurParams {
  kernel_size: number; // 3..31 odd
}

export interface MedianBlurParams {
  kernel_size: number; // 3..31 odd
}

export interface BilateralBlurParams {
  diameter: number; // 1..15
  sigma_color: number; // 10..150
  sigma_space: number; // 10..150
}

export interface Filter2DParams {
  kernel: number[][]; // 3x3 or 5x5
  auto_normalize: boolean;
}

export type SharpenMethod = 'standard' | 'strong' | 'unsharp_mask';
export interface SharpenParams {
  method: SharpenMethod;
  alpha_strength: number; // 0.0 to 3.0
}

export type SobelDirection = 'combined' | 'x' | 'y';
export interface SobelParams {
  direction: SobelDirection;
  ksize: number; // 3 or 5
}

export interface PrewittParams {
  [key: string]: never;
}

export interface LaplacianParams {
  pre_gaussian: boolean;
}

export interface CannyParams {
  low_threshold: number; // 0..255
  high_threshold: number; // 0..255
}

export interface SketchParams {
  kernel_size: number; // 3..51 odd
}

export type MirrorDirection = 'none' | 'horizontal' | 'vertical' | 'both';
export interface MirrorParams {
  direction: MirrorDirection;
}

export type OperationType =
  | 'grayscale'
  | 'brightness'
  | 'negative'
  | 'threshold'
  | 'equalize'
  | 'blur_gaussian'
  | 'blur_averaging'
  | 'blur_median'
  | 'blur_bilateral'
  | 'blur_filter2d'
  | 'sharpen'
  | 'edge_sobel'
  | 'edge_prewitt'
  | 'edge_laplacian'
  | 'edge_canny'
  | 'sketch'
  | 'mirror';

export type OperationParamsMap = {
  grayscale: GrayscaleParams;
  brightness: BrightnessParams;
  negative: Record<string, never>;
  threshold: ThresholdParams;
  equalize: EqualizeParams;
  blur_gaussian: GaussianBlurParams;
  blur_averaging: AveragingBlurParams;
  blur_median: MedianBlurParams;
  blur_bilateral: BilateralBlurParams;
  blur_filter2d: Filter2DParams;
  sharpen: SharpenParams;
  edge_sobel: SobelParams;
  edge_prewitt: Record<string, never>;
  edge_laplacian: LaplacianParams;
  edge_canny: CannyParams;
  sketch: SketchParams;
  mirror: MirrorParams;
};

export type AnyOperationParams = OperationParamsMap[OperationType];

export type ViewMode = 'single' | 'side-by-side' | 'split';
export type ZoomLevel = 'fit' | 0.5 | 1 | 2;
