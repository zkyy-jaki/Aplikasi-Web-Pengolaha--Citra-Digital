import {
  OperationType,
  OperationParamsMap,
  AnyOperationParams,
  ZoomLevel,
  Filter2DParams,
  GrayscaleParams,
  BrightnessParams,
  ThresholdParams,
  EqualizeParams,
  GaussianBlurParams,
  AveragingBlurParams,
  MedianBlurParams,
  BilateralBlurParams,
  SharpenParams,
  SobelParams,
  LaplacianParams,
  CannyParams,
  SketchParams,
  MirrorParams,
} from '@/types/operations';

export type OperationIconName =
  | 'Contrast'
  | 'SunMedium'
  | 'FlipVertical2'
  | 'Binary'
  | 'BarChartHorizontal'
  | 'Sparkles'
  | 'Grid'
  | 'ShieldAlert'
  | 'Layers'
  | 'Table2'
  | 'Zap'
  | 'Compass'
  | 'ScanLine'
  | 'Activity'
  | 'Focus'
  | 'PenTool'
  | 'FlipHorizontal2';

export interface OperationMeta {
  id: OperationType;
  label: string;
  category: 'TONE & COLOR' | 'BLUR FILTERS' | 'DETAIL & EDGE' | 'GEOMETRY';
  description: string;
  iconName: OperationIconName;
  defaultEquation: string;
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
    iconName: 'Contrast',
    defaultEquation: 'Y = 0.299R + 0.587G + 0.114B',
  },
  {
    id: 'brightness',
    label: 'Brightness',
    category: 'TONE & COLOR',
    description: 'Adjust linear brightness level with safe clamping',
    iconName: 'SunMedium',
    defaultEquation: 'I_out(x,y) = clip(I_in(x,y) + β, 0, 255)',
  },
  {
    id: 'negative',
    label: 'Negative',
    category: 'TONE & COLOR',
    description: 'Invert pixel intensities (255 - I) preserving Alpha transparency',
    iconName: 'FlipVertical2',
    defaultEquation: 'I_out(x,y) = 255 - I_in(x,y),  A_out = A_in',
  },
  {
    id: 'threshold',
    label: 'Thresholding',
    category: 'TONE & COLOR',
    description: 'Binary segmentation (Binary, Inverse, Truncate, To Zero, Otsu)',
    iconName: 'Binary',
    defaultEquation: 'I_out = 255 if I_in > T else 0',
  },
  {
    id: 'equalize',
    label: 'Equalization',
    category: 'TONE & COLOR',
    description: 'Histogram equalization (Global YCrCb or Adaptive CLAHE)',
    iconName: 'BarChartHorizontal',
    defaultEquation: 's_k = (L - 1) · Σ_{j=0..k} p_Y(r_j)',
  },

  // BLUR FILTERS
  {
    id: 'blur_gaussian',
    label: 'Gaussian Blur',
    category: 'BLUR FILTERS',
    description: 'Smooth noise using a 2D Gaussian bell curve kernel',
    iconName: 'Sparkles',
    defaultEquation: 'G(x,y) = (1 / 2πσ²) · exp(-(x² + y²) / 2σ²)',
  },
  {
    id: 'blur_averaging',
    label: 'Averaging Blur',
    category: 'BLUR FILTERS',
    description: 'Uniform box filter computing arithmetic mean of neighboring pixels',
    iconName: 'Grid',
    defaultEquation: 'K(i,j) = 1 / (k × k)',
  },
  {
    id: 'blur_median',
    label: 'Median Blur',
    category: 'BLUR FILTERS',
    description: 'Non-linear filter removing salt-and-pepper noise while preserving edges',
    iconName: 'ShieldAlert',
    defaultEquation: 'I_out(x,y) = median{ I_in(x+i, y+j) | (i,j) ∈ W_k×k }',
  },
  {
    id: 'blur_bilateral',
    label: 'Bilateral Filter',
    category: 'BLUR FILTERS',
    description: 'Edge-preserving smoothing considering spatial distance and color range',
    iconName: 'Layers',
    defaultEquation: 'I_out = (1/W_p) Σ I(x_i) · f_r(||I(x_i)-I(x)||) · g_s(||x_i-x||)',
  },
  {
    id: 'blur_filter2d',
    label: 'Standard Filter 2D',
    category: 'BLUR FILTERS',
    description: 'Custom 3×3 or 5×5 spatial convolution matrix with auto-normalization',
    iconName: 'Table2',
    defaultEquation: 'I_out = (K * I_in) / max(Σ K_ij, 1)',
  },

  // DETAIL & EDGE
  {
    id: 'sharpen',
    label: 'Sharpening',
    category: 'DETAIL & EDGE',
    description: 'Enhance high-frequency details (Standard, Strong, Unsharp Mask)',
    iconName: 'Zap',
    defaultEquation: 'K = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]',
  },
  {
    id: 'edge_sobel',
    label: 'Sobel Operator',
    category: 'DETAIL & EDGE',
    description: 'First-order gradient edge detection (Gx, Gy, or Magnitude)',
    iconName: 'Compass',
    defaultEquation: 'G = √(Gx² + Gy²)',
  },
  {
    id: 'edge_prewitt',
    label: 'Prewitt Operator',
    category: 'DETAIL & EDGE',
    description: 'Differential edge detection with uniform ±1 kernels',
    iconName: 'ScanLine',
    defaultEquation: 'Gx = [-1 0 1; -1 0 1; -1 0 1],  G = √(Gx² + Gy²)',
  },
  {
    id: 'edge_laplacian',
    label: 'Laplacian',
    category: 'DETAIL & EDGE',
    description: 'Second-order isotropic derivative with optional Gaussian pre-filter',
    iconName: 'Activity',
    defaultEquation: '∇²I = ∂²I/∂x² + ∂²I/∂y²',
  },
  {
    id: 'edge_canny',
    label: 'Canny Detector',
    category: 'DETAIL & EDGE',
    description: 'Multi-stage optimal edge detector with hysteresis thresholding',
    iconName: 'Focus',
    defaultEquation: 'T_low ≤ ∇I ≤ T_high (Hysteresis)',
  },
  {
    id: 'sketch',
    label: 'Pencil Sketch',
    category: 'DETAIL & EDGE',
    description: 'Pencil drawing effect via inverted Gaussian blur Color Dodge blend',
    iconName: 'PenTool',
    defaultEquation: 'I_out = min(255, (I_gray × 256) / max(1, 255 - G_k(255 - I_gray)))',
  },

  // GEOMETRY
  {
    id: 'mirror',
    label: 'Mirroring',
    category: 'GEOMETRY',
    description: 'Geometric coordinate flip along horizontal, vertical, or both axes',
    iconName: 'FlipHorizontal2',
    defaultEquation: "x' = W - 1 - x,  y' = H - 1 - y",
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

export function getOperationEquation(
  op: OperationType,
  params: AnyOperationParams
): { title: string; formula: string } {
  switch (op) {
    case 'grayscale': {
      const p = params as GrayscaleParams;
      if (p.method === 'average') {
        return { title: 'ARITHMETIC MEAN', formula: 'Y = (R + G + B) / 3' };
      }
      if (p.method === 'lightness') {
        return { title: 'EXTREMUM MIDPOINT', formula: 'Y = (max(R,G,B) + min(R,G,B)) / 2' };
      }
      return { title: 'ITU-R BT.601 LUMINANCE', formula: 'Y = 0.299R + 0.587G + 0.114B' };
    }
    case 'brightness': {
      const p = params as BrightnessParams;
      const beta = p.beta ?? 0;
      const sign = beta >= 0 ? `+ ${beta}` : `- ${Math.abs(beta)}`;
      return {
        title: 'LINEAR INTENSITY OFFSET',
        formula: `I_out(x,y) = clip(I_in(x,y) ${sign}, 0, 255)`,
      };
    }
    case 'negative':
      return {
        title: 'PHOTOMETRIC INVERSION',
        formula: 'I_out(x,y) = 255 - I_in(x,y),  A_out = A_in',
      };
    case 'threshold': {
      const p = params as ThresholdParams;
      const t = p.thresh ?? 127;
      if (p.method === 'otsu') {
        return {
          title: 'OTSU INTRA-CLASS VARIANCE',
          formula: 'min_t σ²_w(t) = ω₀(t)σ²₀(t) + ω₁(t)σ²₁(t)',
        };
      }
      if (p.method === 'binary_inv') {
        return { title: 'INVERSE BINARY STEP', formula: `I_out = 0 if I_in > ${t} else 255` };
      }
      if (p.method === 'truncate') {
        return { title: 'UPPER TRUNCATION', formula: `I_out = ${t} if I_in > ${t} else I_in` };
      }
      if (p.method === 'to_zero') {
        return { title: 'LOWER FLOOR', formula: `I_out = I_in if I_in > ${t} else 0` };
      }
      return { title: 'BINARY STEP', formula: `I_out = 255 if I_in > ${t} else 0` };
    }
    case 'equalize': {
      const p = params as EqualizeParams;
      if (p.mode === 'clahe') {
        const clip = (p.clip_limit ?? 2.0).toFixed(1);
        const grid = p.tile_grid_size ?? 8;
        return {
          title: 'ADAPTIVE CLAHE (YCrCb)',
          formula: `ClipLimit = ${clip},  TileGrid = ${grid}×${grid}`,
        };
      }
      return {
        title: 'CDF LUMINANCE REMAPPING',
        formula: 's_k = (L - 1) · Σ_{j=0..k} p_Y(r_j)',
      };
    }
    case 'blur_gaussian': {
      const p = params as GaussianBlurParams;
      const k = p.kernel_size ?? 5;
      const sig = p.sigma === 0 ? 'auto' : p.sigma.toFixed(1);
      return {
        title: `2D GAUSSIAN (${k}×${k}, σ=${sig})`,
        formula: 'G(x,y) = (1 / 2πσ²) · exp(-(x² + y²) / 2σ²)',
      };
    }
    case 'blur_averaging': {
      const p = params as AveragingBlurParams;
      const k = p.kernel_size ?? 5;
      return {
        title: `UNIFORM BOX KERNEL (${k}×${k})`,
        formula: `K(i,j) = 1 / (${k}×${k}) = ${(1 / (k * k)).toFixed(4)}`,
      };
    }
    case 'blur_median': {
      const p = params as MedianBlurParams;
      const k = p.kernel_size ?? 5;
      return {
        title: `RANK-ORDER MEDIAN (${k}×${k})`,
        formula: `I_out(x,y) = median{ I_in(x+i, y+j) | (i,j) ∈ W_${k}×${k} }`,
      };
    }
    case 'blur_bilateral': {
      const p = params as BilateralBlurParams;
      return {
        title: `BILATERAL (d=${p.diameter}, σc=${p.sigma_color}, σs=${p.sigma_space})`,
        formula: 'I_out = (1/W_p) Σ I(x_i) · f_r(||I(x_i)-I(x)||) · g_s(||x_i-x||)',
      };
    }
    case 'blur_filter2d': {
      const p = params as Filter2DParams;
      const size = p.kernel?.length ?? 3;
      return {
        title: `SPATIAL CONVOLUTION (${size}×${size})`,
        formula: p.auto_normalize
          ? 'I_out = (K * I_in) / max(Σ K_ij, 1)'
          : 'I_out = clip(K * I_in, 0, 255)',
      };
    }
    case 'sharpen': {
      const p = params as SharpenParams;
      if (p.method === 'strong') {
        return {
          title: 'LAPLACIAN 8-NEIGHBOR SHARPEN',
          formula: 'K = [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]',
        };
      }
      if (p.method === 'unsharp_mask') {
        const a = (p.alpha_strength ?? 1.0).toFixed(2);
        return {
          title: `UNSHARP MASKING (α=${a})`,
          formula: `I_out = clip(I_in + ${a} · (I_in - G * I_in), 0, 255)`,
        };
      }
      return {
        title: 'LAPLACIAN 4-NEIGHBOR SHARPEN',
        formula: 'K = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]',
      };
    }
    case 'edge_sobel': {
      const p = params as SobelParams;
      const k = p.ksize ?? 3;
      const formula =
        p.direction === 'x'
          ? 'Gx = ∂I/∂x (Horizontal Gradient)'
          : p.direction === 'y'
          ? 'Gy = ∂I/∂y (Vertical Gradient)'
          : 'G = √(Gx² + Gy²)';
      return {
        title: `SOBEL 1ST DERIVATIVE (${k}×${k})`,
        formula,
      };
    }
    case 'edge_prewitt':
      return {
        title: 'PREWITT GRADIENT MAGNITUDE',
        formula: 'Gx = [-1 0 1; -1 0 1; -1 0 1],  G = √(Gx² + Gy²)',
      };
    case 'edge_laplacian': {
      const p = params as LaplacianParams;
      return {
        title: p.pre_gaussian ? 'LAPLACIAN OF GAUSSIAN (LoG)' : '2ND ISOTROPIC DERIVATIVE',
        formula: '∇²I = ∂²I/∂x² + ∂²I/∂y²',
      };
    }
    case 'edge_canny': {
      const p = params as CannyParams;
      return {
        title: 'CANNY HYSTERESIS DETECTOR',
        formula: `T_low = ${p.low_threshold},  T_high = ${p.high_threshold}  (T_low ≤ T_high)`,
      };
    }
    case 'sketch': {
      const p = params as SketchParams;
      const k = p.kernel_size ?? 21;
      return {
        title: `COLOR DODGE PENCIL (k=${k}×${k})`,
        formula: `I_out = min(255, (I_gray × 256) / max(1, 255 - G_${k}(255 - I_gray)))`,
      };
    }
    case 'mirror': {
      const p = params as MirrorParams;
      const formula =
        p.direction === 'horizontal'
          ? "x' = W - 1 - x,  y' = y"
          : p.direction === 'vertical'
          ? "x' = x,  y' = H - 1 - y"
          : p.direction === 'both'
          ? "x' = W - 1 - x,  y' = H - 1 - y"
          : "x' = x,  y' = y (Identity)";
      return {
        title: 'COORDINATE AFFINE FLIP',
        formula,
      };
    }
  }
}

export function filterOperationsByQuery(query: string): OperationMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return OPERATIONS;
  return OPERATIONS.filter(
    (op) =>
      op.label.toLowerCase().includes(q) ||
      op.id.toLowerCase().includes(q) ||
      op.description.toLowerCase().includes(q)
  );
}

const NUMERIC_ZOOMS: readonly (0.5 | 1 | 2)[] = [0.5, 1, 2];

export function stepZoomLevel(current: ZoomLevel, direction: 'in' | 'out'): ZoomLevel {
  if (current === 'fit') {
    return direction === 'in' ? 1 : 0.5;
  }
  const idx = NUMERIC_ZOOMS.indexOf(current);
  if (idx === -1) return 1;
  if (direction === 'in') {
    return NUMERIC_ZOOMS[Math.min(NUMERIC_ZOOMS.length - 1, idx + 1)];
  }
  return NUMERIC_ZOOMS[Math.max(0, idx - 1)];
}

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
