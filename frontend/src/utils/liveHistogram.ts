import { HistogramResult } from '@/types/operations';

export const LIVE_FILTER_MAX_WIDTH = 320;
export const LIVE_HISTOGRAM_THROTTLE_MS = 80;

/**
 * Downscales camera frame dimensions so the internal processing width never exceeds
 * `maxWidth` (default 320px), scaling height proportionally to preserve the stream's
 * aspect ratio.
 */
export function computeLiveFilterDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number = LIVE_FILTER_MAX_WIDTH
): { width: number; height: number } {
  const safeMaxW = Math.max(1, Math.round(maxWidth));
  if (
    !Number.isFinite(srcWidth) ||
    !Number.isFinite(srcHeight) ||
    srcWidth <= 0 ||
    srcHeight <= 0
  ) {
    return {
      width: safeMaxW,
      height: Math.max(1, Math.round((safeMaxW * 9) / 16)),
    };
  }

  const width = Math.min(safeMaxW, Math.max(1, Math.round(srcWidth)));
  const height = Math.max(1, Math.round((srcHeight / srcWidth) * width));
  return { width, height };
}

/**
 * Computes a 256-bin RGB + ITU-R BT.601 Luminance histogram and summary statistics
 * directly from a downscaled Canvas 2D RGBA ImageData buffer in O(N) single pass.
 */
export function computeHistogramFromImageData(
  rgbaData: Uint8ClampedArray | number[],
  _width: number,
  _height: number
): HistogramResult {
  const redBins = new Array<number>(256).fill(0);
  const greenBins = new Array<number>(256).fill(0);
  const blueBins = new Array<number>(256).fill(0);
  const grayBins = new Array<number>(256).fill(0);

  const len = rgbaData.length;
  const pixelCount = Math.floor(len / 4);

  if (pixelCount <= 0) {
    return {
      mode: 'rgb',
      channels: [
        { channel: 'red', values: redBins },
        { channel: 'green', values: greenBins },
        { channel: 'blue', values: blueBins },
        { channel: 'gray', values: grayBins },
      ],
      stats: { min: 0, max: 0, mean: 0, std_dev: 0 },
    };
  }

  let minLuma = 255;
  let maxLuma = 0;
  let sumLuma = 0;

  for (let i = 0; i <= len - 4; i += 4) {
    const r = rgbaData[i] & 0xff;
    const g = rgbaData[i + 1] & 0xff;
    const b = rgbaData[i + 2] & 0xff;

    redBins[r] += 1;
    greenBins[g] += 1;
    blueBins[b] += 1;

    const luma = Math.min(255, Math.max(0, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
    grayBins[luma] += 1;

    if (luma < minLuma) minLuma = luma;
    if (luma > maxLuma) maxLuma = luma;
    sumLuma += luma;
  }

  const mean = sumLuma / pixelCount;
  let varianceSum = 0;
  for (let bin = 0; bin < 256; bin++) {
    const count = grayBins[bin];
    if (count > 0) {
      const diff = bin - mean;
      varianceSum += count * diff * diff;
    }
  }
  const stdDev = Math.sqrt(varianceSum / pixelCount);

  return {
    mode: 'rgb',
    channels: [
      { channel: 'red', values: redBins },
      { channel: 'green', values: greenBins },
      { channel: 'blue', values: blueBins },
      { channel: 'gray', values: grayBins },
    ],
    stats: {
      min: minLuma,
      max: maxLuma,
      mean,
      std_dev: stdDev,
    },
  };
}
