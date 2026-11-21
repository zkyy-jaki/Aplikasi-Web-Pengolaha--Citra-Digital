import {
  OperationType,
  OperationParamsMap,
  Filter2DParams,
} from '@/types/operations';

export interface OperationMeta {
  id: OperationType;
  label: string;
  category: 'TONE & COLOR' | 'BLUR FILTERS' | 'DETAIL & EDGE' | 'GEOMETRY';
  description: string;
}

export const OPERATION_CATEGORIES = [
  'TONE & COLOR',
  'BLUR FILTERS',
  'DETAIL & EDGE',
  'GEOMETRY',
] as const;

export const OPERATIONS: OperationMeta[] = [
  // TONE & COLOR
  {
    id: 'grayscale',
    label: 'Grayscale',
    category: 'TONE & COLOR',
    description: 'Convert color image to grayscale (Luminance, Average, Lightness)',
  },
  {
    id: 'brightness',
    label: 'Brightness',
    category: 'TONE & COLOR',
    description: 'Adjust linear brightness level with safe clamping',
  },
  {
    id: 'negative',
    label: 'Negative',
    category: 'TONE & COLOR',
    description: 'Invert pixel intensities (255 - I) preserving Alpha transparency',
  },
  {
    id: 'threshold',
    label: 'Thresholding',
    category: 'TONE & COLOR',
    description: 'Binary segmentation (Binary, Inverse, Truncate, To Zero, Otsu)',
  },
  {
    id: 'equalize',
    label: 'Equalization',
    category: 'TONE & COLOR',
    description: 'Histogram equalization (Global YCrCb or Adaptive CLAHE)',
  },

  // BLUR FILTERS
  {
    id: 'blur_gaussian',
    label: 'Gaussian Blur',
    category: 'BLUR FILTERS',
    description: 'Smooth noise using a 2D Gaussian bell curve kernel',
  },
  {
    id: 'blur_averaging',
    label: 'Averaging Blur',
    category: 'BLUR FILTERS',
    description: 'Uniform box filter computing arithmetic mean of neighboring pixels',
  },
  {
    id: 'blur_median',
    label: 'Median Blur',
    category: 'BLUR FILTERS',
    description: 'Non-linear filter removing salt-and-pepper noise while preserving edges',
  },
  {
    id: 'blur_bilateral',
    label: 'Bilateral Filter',
    category: 'BLUR FILTERS',
    description: 'Edge-preserving smoothing considering spatial distance and color range',
  },
  {
    id: 'blur_filter2d',
    label: 'Standard Filter 2D',
    category: 'BLUR FILTERS',
    description: 'Custom 3×3 or 5×5 spatial convolution matrix with auto-normalization',
  },

  // DETAIL & EDGE
  {
    id: 'sharpen',
    label: 'Sharpening',
    category: 'DETAIL & EDGE',
    description: 'Enhance high-frequency details (Standard, Strong, Unsharp Mask)',
  },
  {
    id: 'edge_sobel',
    label: 'Sobel Operator',
    category: 'DETAIL & EDGE',
    description: 'First-order gradient edge detection (Gx, Gy, or Magnitude)',
  },
  {
    id: 'edge_prewitt',
    label: 'Prewitt Operator',
    category: 'DETAIL & EDGE',
    description: 'Differential edge detection with uniform ±1 kernels',
  },
  {
    id: 'edge_laplacian',
    label: 'Laplacian',
    category: 'DETAIL & EDGE',
    description: 'Second-order isotropic derivative with optional Gaussian pre-filter',
  },
  {
    id: 'edge_canny',
    label: 'Canny Detector',
    category: 'DETAIL & EDGE',
    description: 'Multi-stage optimal edge detector with hysteresis thresholding',
  },
  {
    id: 'sketch',
    label: 'Pencil Sketch',
    category: 'DETAIL & EDGE',
    description: 'Pencil drawing effect via inverted Gaussian blur Color Dodge blend',
  },

  // GEOMETRY
  {
    id: 'mirror',
    label: 'Mirroring',
    category: 'GEOMETRY',
    description: 'Geometric coordinate flip along horizontal, vertical, or both axes',
  },
];

export const DEFAULT_PARAMS: { [K in OperationType]: OperationParamsMap[K] } = {
  grayscale: { method: 'luminance' },
  brightness: { beta: 0 },
  negative: {},
  threshold: { method: 'binary', thresh: 127 },
  equalize: { mode: 'global', clip_limit: 2.0, tile_grid_size: 8 },
  blur_gaussian: { kernel_size: 5, sigma: 0.0 },
  blur_averaging: { kernel_size: 5 },
  blur_median: { kernel_size: 5 },
  blur_bilateral: { diameter: 9, sigma_color: 75.0, sigma_space: 75.0 },
  blur_filter2d: {
    kernel: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ],
    auto_normalize: true,
  },
  sharpen: { method: 'standard', alpha_strength: 1.0 },
  edge_sobel: { direction: 'combined', ksize: 3 },
  edge_prewitt: {},
  edge_laplacian: { pre_gaussian: false },
  edge_canny: { low_threshold: 50, high_threshold: 150 },
  sketch: { kernel_size: 21 },
  mirror: { direction: 'none' },
};

export const MATRIX_PRESETS: { name: string; params: Filter2DParams }[] = [
  {
    name: 'Gaussian Approx (3×3)',
    params: {
      kernel: [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1],
      ],
      auto_normalize: true,
    },
  },
  {
    name: 'Box Blur (3×3)',
    params: {
      kernel: [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ],
      auto_normalize: true,
    },
  },
  {
    name: 'Ridge Detection (3×3)',
    params: {
      kernel: [
        [-1, -1, -1],
        [-1, 8, -1],
        [-1, -1, -1],
      ],
      auto_normalize: false,
    },
  },
  {
    name: 'Gaussian Flat (5×5)',
    params: {
      kernel: [
        [1, 4, 7, 4, 1],
        [4, 16, 26, 16, 4],
        [7, 26, 41, 26, 7],
        [4, 16, 26, 16, 4],
        [1, 4, 7, 4, 1],
      ],
      auto_normalize: true,
    },
  },
];
