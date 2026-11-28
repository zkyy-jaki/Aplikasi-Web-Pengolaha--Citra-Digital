# Live Filter 320px Downscaling, Real-Time Histogram & Vertical Stacked Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize Live Filter performance by locking internal processing resolution to a maximum width of `320px` with identical visual display aspect ratio to Raw Camera, compute throttled real-time histograms directly from the `320px` canvas `ImageData`, and stack Original (top) vs. Current/Filtered (bottom) histograms vertically for direct `0–255` intensity comparison.

**Architecture:** We add a pure client-side utility module (`frontend/src/utils/liveHistogram.ts`) that computes proportional `320px`-capped canvas dimensions and 256-bin RGB/Luminance histograms + statistics from downscaled RGBA `ImageData` in `< 0.5ms`. `useWebcam` locks both the offscreen capture canvas and the live filtered display canvas to `320px` max width while updating `liveOriginalHistogram` and `liveCurrentHistogram` on an `80ms` throttle. `CenterStage` synchronizes CSS `aspect-ratio` and `w-full h-full object-contain` boxes across Raw `<video>` and Filtered `<canvas>`, while `RightInspector` renders Original (top) and Current (bottom) histograms in a unified vertical stack.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 3.4, Recharts 3, Node built-in test runner + jiti/sucrase.

**Spec:** `docs/superpowers/specs/2026-11-28-live-filter-histogram-revision-design.md`

## Global Constraints

- Internal `width` of the Live Filtered `<canvas>` must not exceed `LIVE_FILTER_MAX_WIDTH = 320` pixels (`height` scaled proportionally to the camera stream's aspect ratio).
- Visual display containers for **Raw Camera** and **Live Filtered** must have identical CSS aspect ratio, width, height, and `object-fit: contain` behavior in both `single` and `side-by-side` view modes.
- Real-time histogram computation during Live Filter mode must read `ImageData` from the downscaled `320px` canvases (never full camera resolution) and throttle React state updates (`LIVE_HISTOGRAM_THROTTLE_MS = 80`) to avoid main-thread frame drops.
- All 17 existing image processing operations and static image upload/sample workflows must remain intact.

## Review Focus

1. **Zero or non-standard camera stream dimensions (`0×0` before metadata loads, or portrait `720×1280` stream):** `computeLiveFilterDimensions` must safely handle `0` or negative inputs by returning a valid positive fallback (`320×180`) and must cap portrait streams by width (`320×569`) while preserving the exact aspect ratio.
2. **Empty or uniform-intensity `ImageData` buffers in `computeHistogramFromImageData`:** An empty buffer (`length === 0`) or a single-color frame (e.g., all black or all `128`) must return finite `min`, `max`, `mean`, and `std_dev: 0` without `NaN` or division-by-zero errors.
3. **Visual box mismatch between `1920×1080` `<video>` and `320×180` `<canvas>`:** Without explicit `w-full h-full object-contain` and shared `aspectRatio` container styling, a `320×180` canvas shrinks to 320 CSS pixels wide. Both frame containers must enforce `w-full` + `aspectRatio` and `w-full h-full object-contain` on their media elements.
4. **Stale live histograms after turning Live Filter OFF or closing the camera:** Turning off `isLiveFilter` or calling `closeCamera()` must clear `liveOriginalHistogram` and `liveCurrentHistogram` to `null` so `RightInspector` does not display frozen camera histograms when returning to Snapshot Ready mode.
5. **Vertical alignment and scale consistency between Original (top) and Current (bottom) histograms:** Both stacked histogram charts in `RightInspector` must render all 256 bins (`0..255`), use identical container heights (`h-20`) and widths (`w-full`), and respond simultaneously to the `RGB | Luma` mode toggle.

---

### Task 1: Downscaled 320px Dimension & Fast `ImageData` Histogram Helpers

**Files:**
- Create: `frontend/src/utils/liveHistogram.ts`
- Test: `frontend/src/utils/__tests__/liveHistogram.test.ts`

**Interfaces:**
- Consumes: `HistogramResult` from `frontend/src/types/operations.ts`
- Produces:
  - `LIVE_FILTER_MAX_WIDTH = 320`
  - `LIVE_HISTOGRAM_THROTTLE_MS = 80`
  - `computeLiveFilterDimensions(srcWidth: number, srcHeight: number, maxWidth?: number): { width: number; height: number }`
  - `computeHistogramFromImageData(rgbaData: Uint8ClampedArray | number[], width: number, height: number): HistogramResult`

- [ ] **Step 1: Write the failing unit tests in `frontend/src/utils/__tests__/liveHistogram.test.ts`**

Create `frontend/src/utils/__tests__/liveHistogram.test.ts`:

```ts
import { describe, it, assert } from '@/test/harness';
import {
  LIVE_FILTER_MAX_WIDTH,
  computeLiveFilterDimensions,
  computeHistogramFromImageData,
} from '@/utils/liveHistogram';

describe('liveHistogram utilities for 320px downscaling and fast ImageData histograms', () => {
  it('caps width at 320px and scales height proportionally for landscape, portrait, and small streams', () => {
    assert.equal(LIVE_FILTER_MAX_WIDTH, 320);

    // 1920x1080 (16:9) -> 320x180
    const hd = computeLiveFilterDimensions(1920, 1080);
    assert.equal(hd.width, 320);
    assert.equal(hd.height, 180);

    // 1280x960 (4:3) -> 320x240
    const vga = computeLiveFilterDimensions(1280, 960);
    assert.equal(vga.width, 320);
    assert.equal(vga.height, 240);

    // Portrait 720x1280 (9:16) -> 320x569
    const portrait = computeLiveFilterDimensions(720, 1280);
    assert.equal(portrait.width, 320);
    assert.equal(portrait.height, 569);

    // Stream smaller than 320px wide -> preserved without upscaling
    const tiny = computeLiveFilterDimensions(160, 120);
    assert.equal(tiny.width, 160);
    assert.equal(tiny.height, 120);

    // Invalid / uninitialized 0x0 stream -> safe 320x180 fallback
    const zero = computeLiveFilterDimensions(0, 0);
    assert.equal(zero.width, 320);
    assert.equal(zero.height, 180);
  });

  it('computes 256-bin RGB + Grayscale histogram and luminance stats from RGBA ImageData', () => {
    // 2 pixels: pixel 0 = (R:0, G:0, B:0, A:255) -> gray 0
    //           pixel 1 = (R:255, G:255, B:255, A:255) -> gray 255
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const hist = computeHistogramFromImageData(rgba, 2, 1);

    assert.equal(hist.mode, 'rgb');
    assert.equal(hist.channels.length, 4);

    const red = hist.channels.find((c) => c.channel === 'red')!;
    const green = hist.channels.find((c) => c.channel === 'green')!;
    const blue = hist.channels.find((c) => c.channel === 'blue')!;
    const gray = hist.channels.find((c) => c.channel === 'gray')!;

    assert.equal(red.values.length, 256);
    assert.equal(red.values[0], 1);
    assert.equal(red.values[255], 1);
    assert.equal(green.values[0], 1);
    assert.equal(blue.values[255], 1);
    assert.equal(gray.values[0], 1);
    assert.equal(gray.values[255], 1);

    assert.equal(hist.stats.min, 0);
    assert.equal(hist.stats.max, 255);
    assert.equal(hist.stats.mean, 127.5);
    assert.equal(hist.stats.std_dev, 127.5);
  });

  it('handles empty ImageData buffer gracefully without NaN stats', () => {
    const empty = computeHistogramFromImageData(new Uint8ClampedArray(0), 0, 0);
    assert.equal(empty.stats.min, 0);
    assert.equal(empty.stats.max, 0);
    assert.equal(empty.stats.mean, 0);
    assert.equal(empty.stats.std_dev, 0);
  });
});
```

- [ ] **Step 2: Run the frontend test runner to verify the test fails**

Run: `npm --prefix frontend test -- liveHistogram.test.ts`
Expected: FAIL with `Cannot find module '@/utils/liveHistogram'`

- [ ] **Step 3: Implement `frontend/src/utils/liveHistogram.ts`**

Create `frontend/src/utils/liveHistogram.ts` exporting:
- `LIVE_FILTER_MAX_WIDTH = 320`
- `LIVE_HISTOGRAM_THROTTLE_MS = 80`
- `computeLiveFilterDimensions(srcWidth: number, srcHeight: number, maxWidth: number = LIVE_FILTER_MAX_WIDTH): { width: number; height: number }`:
  - If `srcWidth <= 0 || srcHeight <= 0 || !Number.isFinite(srcWidth) || !Number.isFinite(srcHeight)`, return `{ width: maxWidth, height: Math.max(1, Math.round((maxWidth * 9) / 16)) }`.
  - Compute `const width = Math.min(maxWidth, Math.max(1, Math.round(srcWidth)));`
  - Compute `const height = Math.max(1, Math.round((srcHeight / srcWidth) * width));`
  - Return `{ width, height }`.
- `computeHistogramFromImageData(rgbaData: Uint8ClampedArray | number[], width: number, height: number): HistogramResult`:
  - Allocate 256-element arrays `redBins`, `greenBins`, `blueBins`, `grayBins` initialized to `0`.
  - Loop `i = 0` to `rgbaData.length - 3` step `4`, incrementing `redBins[r]`, `greenBins[g]`, `blueBins[b]`, and `grayBins[luma]` where `luma = Math.min(255, Math.max(0, Math.round(0.299 * r + 0.587 * g + 0.114 * b)))`.
  - Track `min`, `max`, `sum`, and compute `mean` and population `std_dev` across all pixels (returning `{ min: 0, max: 0, mean: 0, std_dev: 0 }` when `pixelCount === 0`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- liveHistogram.test.ts`
Expected: PASS (3 tests passing)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/liveHistogram.ts frontend/src/utils/__tests__/liveHistogram.test.ts
git commit -m "feat(histogram): add 320px downscale dimension helper and fast ImageData histogram calculator"
```

---

### Task 2: 320px Internal Canvas Lock, Throttled Live Histogram in `useWebcam`, and Aspect-Ratio Sync in `CenterStage`

**Files:**
- Modify: `frontend/src/hooks/useWebcam.ts`
- Modify: `frontend/src/components/layout/CenterStage.tsx`
- Modify: `frontend/src/components/layout/__tests__/CenterStage.test.ts`

**Interfaces:**
- Consumes: `LIVE_FILTER_MAX_WIDTH`, `LIVE_HISTOGRAM_THROTTLE_MS`, `computeLiveFilterDimensions`, `computeHistogramFromImageData` from `frontend/src/utils/liveHistogram.ts`
- Produces:
  - `useWebcam` returns `liveOriginalHistogram: HistogramResult | null` and `liveCurrentHistogram: HistogramResult | null`, defaults `liveResolution` to `320`, locks `offscreen` and `liveCanvasRef` internal dimensions to `computeLiveFilterDimensions(video.videoWidth, video.videoHeight, LIVE_FILTER_MAX_WIDTH)` (`width <= 320`), and computes throttled real-time histograms from their `ImageData`.
  - `CenterStage` renders synchronized Raw Camera (`data-testid="raw-camera-frame"`) and Live Filtered (`data-testid="live-filtered-frame"`) containers with matching `aspectRatio` and `w-full h-full object-contain` on both `<video>` and `<canvas>`.

- [ ] **Step 1: Write the failing test in `frontend/src/components/layout/__tests__/CenterStage.test.ts`**

Add a third test case to `frontend/src/components/layout/__tests__/CenterStage.test.ts`:

```ts
  it('synchronizes Raw Camera and Live Filtered viewport containers with matching aspect-ratio and w-full h-full object-contain', () => {
    const html = renderToStaticMarkup(
      React.createElement(CenterStage, {
        metadata: null,
        originalPreviewB64: null,
        livePreviewB64: null,
        viewMode: 'side-by-side',
        zoom: 'fit',
        splitPosition: 50,
        cursorPos: { x: null, y: null },
        processingTimeMs: 0,
        isProcessing: false,
        camera: {
          ...baseCamera,
          isCameraOpen: true,
          isLiveFilter: true,
          liveResolution: 320,
          streamResolution: { w: 1280, h: 720 },
          liveFps: 15,
          liveProcessingMs: 11.4,
        },
        videoRef: React.createRef(),
        liveCanvasRef: React.createRef(),
        onSelectFile: () => {},
        onLoadSample: () => {},
        onSplitChange: () => {},
        onCursorMove: () => {},
      })
    );

    assert.match(html, /data-testid="raw-camera-frame"/);
    assert.match(html, /data-testid="live-filtered-frame"/);
    assert.match(html, /aspect-ratio:1280 \/ 720/);
    assert.match(html, /<video[^>]*class="[^"]*w-full h-full object-contain/);
    assert.match(html, /<canvas[^>]*class="[^"]*w-full h-full object-contain/);
  });
```

- [ ] **Step 2: Run the frontend test runner to verify the test fails**

Run: `npm --prefix frontend test -- CenterStage.test.ts`
Expected: FAIL (`The input did not match the regular expression /data-testid="raw-camera-frame"/`)

- [ ] **Step 3: Update `useWebcam.ts` and `CenterStage.tsx`**

1. In `frontend/src/hooks/useWebcam.ts`:
   - Import `HistogramResult` from `@/types/operations` and `LIVE_FILTER_MAX_WIDTH`, `LIVE_HISTOGRAM_THROTTLE_MS`, `computeLiveFilterDimensions`, `computeHistogramFromImageData` from `@/utils/liveHistogram`.
   - Change `liveResolution` initial state to `useState<LiveResolution>(320)`.
   - Add state:
     ```ts
     const [liveOriginalHistogram, setLiveOriginalHistogram] = useState<HistogramResult | null>(null);
     const [liveCurrentHistogram, setLiveCurrentHistogram] = useState<HistogramResult | null>(null);
     ```
   - Reset `setLiveOriginalHistogram(null)` and `setLiveCurrentHistogram(null)` inside `closeCamera()` and when `isLiveFilter` is turned off.
   - In the Phase 2 `requestAnimationFrame` loop (`useEffect` on `[isCameraOpen, isLiveFilter]`):
     - Add `let lastHistogramAt = 0;`.
     - Compute downscaled dimensions locked to max width `320px`:
       ```ts
       const maxWidth = Math.min(LIVE_FILTER_MAX_WIDTH, liveResRef.current);
       const { width: targetW, height: targetH } = computeLiveFilterDimensions(
         video.videoWidth,
         video.videoHeight,
         maxWidth
       );
       ```
     - After drawing `bitmap` onto `displayCanvas`:
       - Lock internal canvas attributes:
         ```ts
         if (displayCanvas.width !== targetW || displayCanvas.height !== targetH) {
           displayCanvas.width = targetW;
           displayCanvas.height = targetH;
         }
         const dCtx = displayCanvas.getContext('2d');
         if (dCtx) {
           dCtx.drawImage(bitmap, 0, 0, targetW, targetH);
           const perfNow = performance.now();
           if (perfNow - lastHistogramAt >= LIVE_HISTOGRAM_THROTTLE_MS) {
             lastHistogramAt = perfNow;
             const rawImgData = offCtx.getImageData(0, 0, targetW, targetH);
             const filteredImgData = dCtx.getImageData(0, 0, targetW, targetH);
             setLiveOriginalHistogram(
               computeHistogramFromImageData(rawImgData.data, targetW, targetH)
             );
             setLiveCurrentHistogram(
               computeHistogramFromImageData(filteredImgData.data, targetW, targetH)
             );
           }
         }
         ```
   - Return `liveOriginalHistogram: isCameraOpen && isLiveFilter ? liveOriginalHistogram : null` and `liveCurrentHistogram: isCameraOpen && isLiveFilter ? liveCurrentHistogram : null` from `useWebcam`.

2. In `frontend/src/components/layout/CenterStage.tsx`:
   - In `CenterStage`, compute:
     ```ts
     const cameraAspectRatio = camera.streamResolution
       ? `${camera.streamResolution.w} / ${camera.streamResolution.h}`
       : '16 / 9';
     ```
   - Update both the Raw Webcam `<video>` container and Live Filtered `<canvas>` container (lines 295–345):
     - Give both outer cells `relative w-full h-full flex items-center justify-center overflow-hidden` (when visible).
     - Give the Raw Camera frame `data-testid="raw-camera-frame"`, class `relative w-full max-w-full max-h-[calc(100vh-12rem)] aspect-video rounded-sm border border-panelBorder overflow-hidden bg-black/5 flex items-center justify-center`, and `style={{ aspectRatio: cameraAspectRatio }}`.
     - Give `<video>` class `block w-full h-full object-contain ${camera.isMirrored ? 'scale-x-[-1]' : ''}`.
     - Give the Live Filtered frame `data-testid="live-filtered-frame"`, class `relative w-full max-w-full max-h-[calc(100vh-12rem)] aspect-video rounded-sm border border-panelBorder overflow-hidden bg-black/5 flex items-center justify-center`, and `style={{ aspectRatio: cameraAspectRatio }}`.
     - Give `<canvas>` class `block w-full h-full object-contain`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- CenterStage.test.ts`
Expected: PASS (3 tests passing)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useWebcam.ts frontend/src/components/layout/CenterStage.tsx frontend/src/components/layout/__tests__/CenterStage.test.ts
git commit -m "feat(camera): lock live filtered canvas internal width to 320px, sync viewport aspect-ratio, and compute throttled live histograms"
```

---

### Task 3: Vertical Stacked Histogram Layout (Original vs. Current) in `RightInspector` & Live Wiring in `App.tsx`

**Files:**
- Modify: `frontend/src/components/layout/RightInspector.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/__tests__/RightInspector.test.ts`

**Interfaces:**
- Consumes: `liveOriginalHistogram` and `liveCurrentHistogram` from `useWebcam`; `originalHistogram` and `currentHistogram` from `useImageWorkspace`
- Produces:
  - Vertical stacked histogram panel (`data-testid="histogram-vertical-stack"`) in `RightInspector.tsx` with **Histogram Original** (`data-testid="histogram-chart-original"`) on top and **Histogram Current (Filtered)** (`data-testid="histogram-chart-current"`) directly below it, sharing identical width (`w-full`), height (`h-20`), and X-axis scale (`0–255`).
  - Real-time live histogram updates in `RightInspector` whenever `isCameraOpen && isLiveFilter` is active.

- [ ] **Step 1: Write the failing tests in `frontend/src/components/layout/__tests__/RightInspector.test.ts`**

Add two test cases to `frontend/src/components/layout/__tests__/RightInspector.test.ts`:

```ts
  it('stacks Histogram Original on top and Histogram Current (Filtered) below with identical height and 0-255 scale', () => {
    const html = renderToStaticMarkup(
      React.createElement(RightInspector, {
        activeOp: 'threshold',
        draftParams: { method: 'binary', thresh: 127 },
        currentHistogram: sampleHistogram,
        originalHistogram: sampleHistogram,
        historyList: ['Original Image'],
        historyIndex: 0,
        historySteps: [],
        otsuCalculatedT: null,
        isProcessing: false,
        hasImage: true,
        onUpdateParams: () => {},
        onApply: () => {},
        onCancel: () => {},
      })
    );

    assert.match(html, /data-testid="histogram-vertical-stack"/);
    const origIdx = html.indexOf('data-testid="histogram-chart-original"');
    const curIdx = html.indexOf('data-testid="histogram-chart-current"');
    assert.ok(origIdx !== -1 && curIdx !== -1, 'Both original and current histogram containers must be rendered');
    assert.ok(origIdx < curIdx, 'Histogram Original must be stacked above Histogram Current');
    assert.match(html, /ORIGINAL/);
    assert.match(html, /CURRENT \(FILTERED\)/);
    assert.match(html, /0–255/);
  });

  it('renders live real-time histograms in vertical stack when camera is open with Live Filter ON', () => {
    const html = renderToStaticMarkup(
      React.createElement(RightInspector, {
        activeOp: 'equalize',
        draftParams: { mode: 'global', clip_limit: 2.0, tile_grid_size: 8 },
        currentHistogram: sampleHistogram,
        originalHistogram: sampleHistogram,
        historyList: [],
        historyIndex: -1,
        historySteps: [],
        otsuCalculatedT: null,
        isProcessing: false,
        hasImage: false,
        isCameraOpen: true,
        isLiveFilter: true,
        onUpdateParams: () => {},
        onApply: () => {},
        onCancel: () => {},
      })
    );

    assert.match(html, /data-testid="histogram-chart-original"/);
    assert.match(html, /data-testid="histogram-chart-current"/);
    assert.match(html, />118\.4</);
    assert.doesNotMatch(html, /Stateless camera mode/);
  });
```

- [ ] **Step 2: Run the frontend test runner to verify the new tests fail**

Run: `npm --prefix frontend test -- RightInspector.test.ts`
Expected: FAIL (`The input did not match the regular expression /data-testid="histogram-vertical-stack"/`)

- [ ] **Step 3: Implement vertical stacked histograms in `RightInspector.tsx` and wire live histograms in `App.tsx`**

1. In `frontend/src/components/layout/RightInspector.tsx`:
   - Define `const effectiveHasImage = hasImage && !isCameraOpen;` and `const hasActiveHistogram = effectiveHasImage || (isCameraOpen && isLiveFilter);`.
   - Remove `histTarget` state and the `Cur | Orig` button group (since both `ORIGINAL` and `CURRENT (FILTERED)` are now rendered simultaneously in the vertical stack).
   - Extract a helper `buildHistogramChartData(hist: HistogramResult | null, mode: 'rgb' | 'gray')` that builds the 256-bin array (`bin: 0..255`) when `hasActiveHistogram && hist?.channels?.length`.
   - Compute `originalChartData = React.useMemo(() => buildHistogramChartData(originalHistogram, histMode), [hasActiveHistogram, originalHistogram, histMode])` and `currentChartData = React.useMemo(() => buildHistogramChartData(currentHistogram, histMode), [hasActiveHistogram, currentHistogram, histMode])`.
   - Render Section 1 (`Histogram`) with:
     - Header bar: `Histogram` title + `LIVE 320PX` badge when `isCameraOpen && isLiveFilter`, `RGB | Luma` mode toggle (enabled whenever `hasActiveHistogram`), and `Download` button.
     - Vertical stack container (`div` with `ref={chartRef}`, `data-testid="histogram-vertical-stack"`, `className="flex flex-col gap-1.5"`):
       - **Top Panel (`data-testid="histogram-chart-original"`):**
         - Header row showing `ORIGINAL` label on the left and `0–255` scale indicator (plus `MEAN` stat if available) on the right.
         - Chart box (`className="h-20 w-full bg-white rounded-sm border border-panelBorder p-1 flex items-center justify-center"`) rendering `<ResponsiveContainer width="100%" height="100%"><AreaChart data={originalChartData} ...><XAxis dataKey="bin" type="number" domain={[0, 255]} hide /><YAxis hide domain={[0, 'auto']} />...</AreaChart></ResponsiveContainer>`.
       - **Bottom Panel (`data-testid="histogram-chart-current"`):**
         - Header row showing `CURRENT (FILTERED)` label on the left and `0–255` scale indicator (plus `MEAN` stat if available) on the right.
         - Chart box (`className="h-20 w-full bg-white rounded-sm border border-panelBorder p-1 flex items-center justify-center"`) rendering `<ResponsiveContainer width="100%" height="100%"><AreaChart data={currentChartData} ...><XAxis dataKey="bin" type="number" domain={[0, 255]} hide /><YAxis hide domain={[0, 'auto']} />...</AreaChart></ResponsiveContainer>`.
     - Keep the 4-column monospace stats (`MIN`, `MAX`, `MEAN`, `STD`) below the vertical stack bound to `currentHistogram?.stats` when `hasActiveHistogram && currentHistogram?.stats`.

2. In `frontend/src/App.tsx`:
   - Pass live histograms when `webcam.isCameraOpen && webcam.isLiveFilter`:
     ```tsx
     currentHistogram={
       webcam.isCameraOpen && webcam.isLiveFilter
         ? webcam.liveCurrentHistogram
         : currentHistogram
     }
     originalHistogram={
       webcam.isCameraOpen && webcam.isLiveFilter
         ? webcam.liveOriginalHistogram
         : originalHistogram
     }
     ```

- [ ] **Step 4: Run the full frontend test suite, TypeScript typecheck, and linter**

Run: `npm --prefix frontend test && npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: PASS (all unit tests pass, 0 TypeScript errors, 0 lint errors)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/RightInspector.tsx frontend/src/App.tsx frontend/src/components/layout/__tests__/RightInspector.test.ts
git commit -m "feat(histogram): stack Original and Current histograms vertically and wire real-time live filter histograms"
```
