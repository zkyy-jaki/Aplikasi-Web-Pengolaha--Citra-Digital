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
    description: 'Konversi citra berwarna menjadi skala keabuan (Luminance, Average, Lightness)',
  },
  {
    id: 'brightness',
    label: 'Brightness',
    category: 'TONE & COLOR',
    description: 'Penyesuaian tingkat kecerahan linear dengan anti-overflow clamping',
  },
  {
    id: 'negative',
    label: 'Negative',
    category: 'TONE & COLOR',
    description: 'Inversi intensitas piksel (255 - I) dengan preservasi kanal Alpha',
  },
  {
    id: 'threshold',
    label: 'Thresholding',
    category: 'TONE & COLOR',
    description: 'Segmentasi biner/ambang batas (Binary, Inverse, Truncate, To Zero, Otsu)',
  },
  {
    id: 'equalize',
    label: 'Equalization',
    category: 'TONE & COLOR',
    description: 'Histogram Equalization (YCrCb luminance-only atau CLAHE)',
  },

  // BLUR FILTERS
  {
    id: 'blur_gaussian',
    label: 'Gaussian Blur',
    category: 'BLUR FILTERS',
    description: 'Reduksi derau alami dengan pembobotan kurva lonceng Gaussian',
  },
  {
    id: 'blur_averaging',
    label: 'Averaging Blur',
    category: 'BLUR FILTERS',
    description: 'Filter kotak rata-rata aritmetika piksel tetangga',
  },
  {
    id: 'blur_median',
    label: 'Median Blur',
    category: 'BLUR FILTERS',
    description: 'Pembersih salt-and-pepper noise terbaik tanpa merusak ketajaman garis tepi',
  },
  {
    id: 'blur_bilateral',
    label: 'Bilateral Filter',
    category: 'BLUR FILTERS',
    description: 'Edge-preserving smoothing: menghaluskan permukaan namun menjaga batas tepi',
  },
  {
    id: 'blur_filter2d',
    label: 'Standard Filter 2D',
    category: 'BLUR FILTERS',
    description: 'Konvolusi spasial umum dengan matriks kernel 3×3 atau 5×5 kustom',
  },

  // DETAIL & EDGE
  {
    id: 'sharpen',
    label: 'Sharpening',
    category: 'DETAIL & EDGE',
    description: 'Penajaman tepi dengan Kernel Standard, Strong, atau Unsharp Masking',
  },
  {
    id: 'edge_sobel',
    label: 'Sobel Operator',
    category: 'DETAIL & EDGE',
    description: 'Deteksi gradien arah horizontal (Gx), vertikal (Gy), atau kombinasi',
  },
  {
    id: 'edge_prewitt',
    label: 'Prewitt Operator',
    category: 'DETAIL & EDGE',
    description: 'Deteksi tepi menggunakan kernel diferensial seragam ±1',
  },
  {
    id: 'edge_laplacian',
    label: 'Laplacian',
    category: 'DETAIL & EDGE',
    description: 'Turunan kedua untuk mendeteksi diskontinuitas ke segala arah (LoG opsional)',
  },
  {
    id: 'edge_canny',
    label: 'Canny Detector',
    category: 'DETAIL & EDGE',
    description: 'Deteksi tepi optimal multi-tahap dengan hysteresis thresholding',
  },
  {
    id: 'sketch',
    label: 'Pencil Sketch',
    category: 'DETAIL & EDGE',
    description: 'Efek sketsa arsir pensil hitam-putih via Color Dodge blend guard',
  },

  // GEOMETRY
  {
    id: 'mirror',
    label: 'Mirroring',
    category: 'GEOMETRY',
    description: 'Pencerminan koordinat piksel horizontal, vertikal, atau kedua sumbu',
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
  mirror: { direction: 'horizontal' },
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
