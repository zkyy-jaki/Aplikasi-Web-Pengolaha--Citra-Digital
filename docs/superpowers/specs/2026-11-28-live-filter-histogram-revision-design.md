# Live Filter 320px Resolution Lock, Real-Time Histogram & Vertical Stacked Histogram Layout Design Spec

## 1. Intent & Why
During real-time webcam filtering in **KROMA // Lab**, heavy spatial convolution filters (Gaussian, Averaging, Median, Bilateral, and 2D Convolution) can bottleneck frame throughput if processed at high resolution, and an intrinsic 320px `<canvas>` without synchronized CSS box dimensions renders visually smaller than a 1080p `<video>` element. Additionally, users need real-time visual feedback of pixel intensity distribution changes during Live Filter mode and a direct vertical comparison (**Original** on top, **Current / Filtered** on bottom) to observe shifts in intensity across the `0–255` axis.

## 2. Goals & Non-Goals
- **Goals:**
  1. **320px Downscaled Processing & Visual Aspect-Ratio Lock:** Lock the internal processing resolution of the **Live Filtered** canvas to a maximum width of `320px` (`height = Math.round((srcH / srcW) * targetW)`), while synchronizing the visual box size and aspect ratio (`aspect-ratio` + `w-full h-full object-contain`) between **Raw Camera** and **Live Filtered** viewports.
  2. **Real-Time Throttled Histogram in Live Filter Mode:** Compute real-time 256-bin RGB and Luminance histograms directly from the downscaled `320px` canvas `ImageData` (`offscreen` raw frame and `displayCanvas` filtered frame) with `~80ms` throttling so the main thread remains smooth without frame drops.
  3. **Vertical Stacked Histogram Layout (Original Top, Current Bottom):** Stack **Histogram Original** above **Histogram Current (Filtered)** with identical width, identical container height (`h-20`), and synchronized X-axis domain (`0–255`) so tonal shifts (Thresholding, Equalization, Brightness) align vertically.
- **Non-Goals:**
  - Altering any of the 17 backend image processing algorithms or breaking static image upload/sample workflows.

## 3. Architecture & Component Specifications

### 3.1 Downscaled Dimension & Fast `ImageData` Histogram Utility (`frontend/src/utils/liveHistogram.ts`)
- `LIVE_FILTER_MAX_WIDTH = 320`
- `LIVE_HISTOGRAM_THROTTLE_MS = 80`
- `computeLiveFilterDimensions(srcWidth: number, srcHeight: number, maxWidth = LIVE_FILTER_MAX_WIDTH): { width: number; height: number }`:
  - Computes `width = Math.min(maxWidth, Math.max(1, Math.round(srcWidth)))` and proportional `height = Math.max(1, Math.round((srcHeight / srcWidth) * width))`.
- `computeHistogramFromImageData(rgbaData: Uint8ClampedArray | number[], width: number, height: number): HistogramResult`:
  - Single-pass O(N) scan over downscaled RGBA buffer (`<= 320×240` pixels, `< 0.5ms` execution time) producing 256-bin counts for `red`, `green`, `blue`, and ITU-R BT.601 `gray` (`Math.round(0.299*R + 0.587*G + 0.114*B)`), plus `stats: { min, max, mean, std_dev }`.

### 3.2 Real-Time Loop & Visual Viewport Sync (`frontend/src/hooks/useWebcam.ts` & `frontend/src/components/layout/CenterStage.tsx`)
- In `useWebcam.ts`:
  - Default `liveResolution` to `320`.
  - Use `computeLiveFilterDimensions(video.videoWidth, video.videoHeight, LIVE_FILTER_MAX_WIDTH)` in the `requestAnimationFrame` loop so both `offscreen` capture canvas and `liveCanvasRef` display canvas keep internal HTML `width` capped at `320px` with proportional `height`.
  - Maintain `liveOriginalHistogram` and `liveCurrentHistogram` state, updated at most once every `LIVE_HISTOGRAM_THROTTLE_MS` (`80ms`) from `offCtx.getImageData(0, 0, targetW, targetH)` and `dCtx.getImageData(0, 0, targetW, targetH)`.
- In `CenterStage.tsx`:
  - Apply uniform `style={{ aspectRatio: camera.streamResolution ? `${camera.streamResolution.w} / ${camera.streamResolution.h}` : '16 / 9' }}` and identical box classes (`relative w-full max-w-full max-h-[calc(100vh-12rem)] aspect-video rounded-sm border border-panelBorder overflow-hidden bg-black/5 flex items-center justify-center`) to both the Raw Camera frame and the Live Filtered frame, with `w-full h-full object-contain` on both `<video>` and `<canvas>`.

### 3.3 Vertical Stacked Histogram Panel (`frontend/src/components/layout/RightInspector.tsx` & `frontend/src/App.tsx`)
- Replace the single-chart `Cur | Orig` toggle in `RightInspector.tsx` with a vertical stack (`flex flex-col gap-2`, `data-testid="histogram-vertical-stack"`):
  - **Top Container:** `ORIGINAL` histogram chart (`h-20 w-full`, X-axis `0..255`).
  - **Bottom Container:** `CURRENT (FILTERED)` histogram chart (`h-20 w-full`, X-axis `0..255`).
- In `App.tsx`, pass `originalHistogram={webcam.isCameraOpen && webcam.isLiveFilter ? webcam.liveOriginalHistogram : originalHistogram}` and `currentHistogram={webcam.isCameraOpen && webcam.isLiveFilter ? webcam.liveCurrentHistogram : currentHistogram}` to `RightInspector`.
