# Live Camera Multi-Layer Pipeline & Auto-Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable multi-layer filter stacking (`Apply (Commit)`, layer visibility toggle, layer deletion, Undo/Redo/Reset) directly in Live Camera Filter mode with single-request stateless backend execution and automatic layer-stack transfer when capturing a snapshot.

**Architecture:** We extend `POST /api/images/process-frame` to accept a JSON `pipeline` array of operations that execute sequentially in NumPy memory on each video frame in a single HTTP round-trip. On the frontend, `useWebcam` manages a capped (`LIVE_MAX_LAYERS = 5`) live layer stack (`liveHistorySteps`, `liveHistoryIndex`) that feeds `[...enabledCommittedLayers, activeDraftLayer]` to `processLiveFrame` and transfers committed layers into `useImageWorkspace.handleUploadFile` upon `Capture Snapshot`.

**Tech Stack:** FastAPI, NumPy, OpenCV, Pytest (backend); React 19, TypeScript, Tailwind CSS 3.4, Node built-in test runner + jiti/sucrase (frontend).

**Spec:** `docs/superpowers/specs/2026-11-28-live-camera-pipeline-design.md`

## Global Constraints

- Single HTTP round-trip and single JPEG encode/decode per video frame (`POST /api/images/process-frame`).
- Maintain backward compatibility when `pipeline` form field is omitted (single `operation` + `params` still works).
- Cap committed live camera layers at `LIVE_MAX_LAYERS = 5` to preserve real-time frame rate (`~15 FPS`).
- Preserve the existing KROMA // Lab color palette, `1px solid` border discipline, and `font-mono` technical telemetry.

## Review Focus

1. **Sequential pipeline execution order and intermediate channel conversions in `/api/images/process-frame`:** Applying `grayscale` (which returns a 2D or 3-channel grayscale array) followed by `edge_canny` or `brightness` in a single `pipeline` array must pass each step's output array directly into the next step and return the final Otsu threshold header if any step in the pipeline computed Otsu.
2. **Invalid or oversized `pipeline` JSON payload on `/api/images/process-frame`:** Sending malformed JSON, a non-list `pipeline`, or a pipeline with more than 10 steps must raise `InvalidParamsError` (`HTTP 422`) rather than crashing with a 500 error.
3. **Muted (`enabled: false`) layers in Live Camera Pipeline:** Toggling the eye icon off on a committed live layer must exclude that layer from the `pipeline` sent to `/api/images/process-frame` while keeping it visible (struck-through) in the `PIPELINE HISTORY` stack.
4. **Enforcing `LIVE_MAX_LAYERS = 5` cap on Live Commit:** Attempting to commit a 6th live layer must be prevented cleanly (Apply button disabled at 5 layers and guard in `applyLiveStep`) without corrupting existing layers.
5. **Auto-transferring both enabled and muted live layers on `Capture Snapshot`:** When a snapshot is captured with 2 committed live layers where layer 1 is muted (`enabled: false`) and layer 2 is enabled (`enabled: true`), `handleUploadFile` must replay both layers onto the new session and toggle layer 1 off so the static workspace starts with the exact same visual state and layer stack.

---

### Task 1: Backend Multi-Step Pipeline Execution in `POST /api/images/process-frame`

**Files:**
- Modify: `backend/app/routers/images.py:113-156`
- Test: `backend/tests/test_live_frame.py`

**Interfaces:**
- Consumes: `registry.execute_operation(operation: str, image: NDArray[np.uint8], params: dict)`
- Produces:
  - `POST /api/images/process-frame` accepting form fields:
    - `file: UploadFile = File(...)`
    - `operation: str = Form("grayscale")`
    - `params: str = Form("{}")`
    - `pipeline: str | None = Form(None)` (JSON list of `{"operation": str, "params": dict}`, max length 10)

- [ ] **Step 1: Write the failing backend tests for multi-step `pipeline` execution and validation in `backend/tests/test_live_frame.py`**

Add to `TestLiveFrameEndpoint` in `backend/tests/test_live_frame.py`:

```python
    def test_live_frame_multi_step_pipeline_executes_sequentially(self, client):
        img = make_rgb(w=64, h=64, fill=(100, 150, 200))
        jpeg_bytes = bgr_to_jpeg_bytes(img)
        pipeline = json.dumps([
            {"operation": "grayscale", "params": {"method": "luminance"}},
            {"operation": "brightness", "params": {"beta": 40}},
            {"operation": "threshold", "params": {"method": "otsu", "thresh": 127}},
        ])
        resp = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", jpeg_bytes, "image/jpeg")},
            data={"operation": "grayscale", "params": "{}", "pipeline": pipeline},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/jpeg"
        assert "X-Processing-Time-Ms" in resp.headers
        assert "X-Otsu-Threshold" in resp.headers

    def test_live_frame_invalid_pipeline_rejected(self, client):
        img = make_rgb(w=32, h=32)
        jpeg_bytes = bgr_to_jpeg_bytes(img)

        # Non-list pipeline JSON
        resp1 = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", jpeg_bytes, "image/jpeg")},
            data={"operation": "grayscale", "params": "{}", "pipeline": '{"bad": true}'},
        )
        assert resp1.status_code == 422

        # Oversized pipeline (> 10 steps)
        too_many = json.dumps([{"operation": "negative", "params": {}}] * 11)
        resp2 = client.post(
            "/api/images/process-frame",
            files={"file": ("frame.jpg", jpeg_bytes, "image/jpeg")},
            data={"operation": "grayscale", "params": "{}", "pipeline": too_many},
        )
        assert resp2.status_code == 422
```

- [ ] **Step 2: Run pytest to verify the new tests fail**

Run: `pytest backend/tests/test_live_frame.py -v`
Expected: FAIL (`test_live_frame_multi_step_pipeline_executes_sequentially` fails with missing `X-Otsu-Threshold` header and `test_live_frame_invalid_pipeline_rejected` returns `200` instead of `422` because `pipeline` is ignored)

- [ ] **Step 3: Implement `pipeline` parsing, validation, and sequential execution in `backend/app/routers/images.py`**

In `backend/app/routers/images.py`:
- Update `process_live_frame` signature to:
  ```python
  @router.post("/process-frame")
  def process_live_frame(
      file: UploadFile = File(...),
      operation: str = Form("grayscale"),
      params: str = Form("{}"),
      pipeline: str | None = Form(None),
  ) -> Response:
  ```
- When `pipeline is not None and pipeline.strip() != ""`:
  - Parse `parsed_pipeline = json.loads(pipeline)` (catching `json.JSONDecodeError` -> `InvalidParamsError`).
  - Validate `isinstance(parsed_pipeline, list)` and `1 <= len(parsed_pipeline) <= 10` and every item is a `dict` with `"operation"` (`str`) and optional `"params"` (`dict`), raising `InvalidParamsError` otherwise.
  - Loop through `steps` sequentially on `current = frame`, updating `otsu_thresh` whenever `registry.execute_operation` returns a `(result, thresh)` tuple.
- When `pipeline` is `None` or empty, execute the single `(operation, parsed_params)` step as before.

- [ ] **Step 4: Run pytest to verify all backend live-frame and full-suite tests pass**

Run: `pytest backend/tests -v`
Expected: PASS (all tests including `test_live_frame.py` pass)

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/images.py backend/tests/test_live_frame.py
git commit -m "feat(backend): support multi-step pipeline array in stateless live frame endpoint"
```

---

### Task 2: Frontend Live Pipeline Helper, State Management in `useWebcam`, and Snapshot Auto-Transfer in `useImageWorkspace`

**Files:**
- Modify: `frontend/src/types/operations.ts`
- Modify: `frontend/src/constants/operations.ts`
- Modify: `frontend/src/services/api.ts:138-192`
- Modify: `frontend/src/hooks/useWebcam.ts`
- Modify: `frontend/src/hooks/useImageWorkspace.ts:105-145`
- Modify: `frontend/src/constants/__tests__/operations.test.ts`

**Interfaces:**
- Consumes: `POST /api/images/process-frame` `pipeline` field, `processImage`, `toggleHistoryStep`
- Produces:
  - `LIVE_MAX_LAYERS = 5` and `LivePipelineStep` interface (`{ operation: OperationType; params: Record<string, unknown> }`)
  - Pure helper `buildEffectiveLivePipeline(steps: HistoryStepItem[], historyIndex: number, activeOp: OperationType, draftParams: AnyOperationParams): LivePipelineStep[]` in `frontend/src/constants/operations.ts`
  - `formatCompactLayerLabel(op: string, params: Record<string, unknown>): string` in `frontend/src/constants/operations.ts`
  - Updated `processLiveFrame(frameBlob: Blob, operation: string, params: Record<string, unknown>, signal?: AbortSignal, pipeline?: LivePipelineStep[]): Promise<LiveFrameResult>` in `frontend/src/services/api.ts`
  - Extended `useWebcam` return values:
    - `liveHistoryList: string[]`
    - `liveHistorySteps: HistoryStepItem[]`
    - `liveHistoryIndex: number`
    - `canLiveUndo: boolean`
    - `canLiveRedo: boolean`
    - `canLiveReset: boolean`
    - `canLiveApply: boolean`
    - `applyLiveStep: () => void`
    - `toggleLiveStep: (stepIndex: number) => void`
    - `deleteLiveStep: (stepIndex: number) => void`
    - `handleLiveHistoryAction: (action: 'undo' | 'redo' | 'reset') => void`
  - Updated `handleUploadFile(file: File, initialLayers?: HistoryStepItem[]) => Promise<void>` in `useImageWorkspace.ts`

- [ ] **Step 1: Write the failing unit test for `buildEffectiveLivePipeline` and `formatCompactLayerLabel` in `frontend/src/constants/__tests__/operations.test.ts`**

Add to `frontend/src/constants/__tests__/operations.test.ts`:

```ts
  it('builds effective live pipeline from enabled committed layers up to historyIndex plus active draft op', () => {
    const steps = [
      { id: '1', operation: 'grayscale', params: { method: 'luminance' }, label: 'grayscale (luminance)', enabled: true },
      { id: '2', operation: 'blur_gaussian', params: { kernel_size: 5, sigma: 0 }, label: 'blur_gaussian (kernel_size=5, sigma=0)', enabled: false },
      { id: '3', operation: 'negative', params: {}, label: 'negative', enabled: true },
      { id: '4', operation: 'mirror', params: { direction: 'horizontal' }, label: 'mirror (horizontal)', enabled: true },
    ];
    // historyIndex = 3 means steps[0..2] are active, steps[3] was undone; steps[1] is muted
    const pipeline = buildEffectiveLivePipeline(steps, 3, 'edge_canny', { low_threshold: 50, high_threshold: 150 });
    assert.equal(pipeline.length, 3);
    assert.equal(pipeline[0].operation, 'grayscale');
    assert.equal(pipeline[1].operation, 'negative');
    assert.equal(pipeline[2].operation, 'edge_canny');
  });
```

- [ ] **Step 2: Run frontend test runner to verify the test fails**

Run: `npm --prefix frontend test -- operations.test.ts`
Expected: FAIL with `buildEffectiveLivePipeline is not a function`

- [ ] **Step 3: Implement `buildEffectiveLivePipeline`, `formatCompactLayerLabel`, `processLiveFrame` pipeline support, `useWebcam` live layer stack, and `useImageWorkspace` snapshot auto-transfer**

1. In `frontend/src/types/operations.ts`:
   - Export `LivePipelineStep`:
     ```ts
     export interface LivePipelineStep {
       operation: OperationType;
       params: Record<string, unknown>;
     }
     ```
2. In `frontend/src/constants/operations.ts`:
   - Export `LIVE_MAX_LAYERS = 5`.
   - Export `formatCompactLayerLabel(op: string, params: Record<string, unknown>): string`.
   - Export `buildEffectiveLivePipeline(steps: HistoryStepItem[], historyIndex: number, activeOp: OperationType, draftParams: AnyOperationParams): LivePipelineStep[]` which takes `steps.slice(0, historyIndex).filter((s) => s.enabled)` mapped to `{ operation: s.operation as OperationType, params: s.params }`, and appends `{ operation: activeOp, params: draftParams as unknown as Record<string, unknown> }`.
3. In `frontend/src/services/api.ts`:
   - Add optional parameter `pipeline?: LivePipelineStep[]` to `processLiveFrame`, and when `pipeline && pipeline.length > 0`, append `formData.append('pipeline', JSON.stringify(pipeline))`.
4. In `frontend/src/hooks/useWebcam.ts`:
   - Update `onSnapshotCaptured: (file: File, committedLiveSteps?: HistoryStepItem[]) => Promise<void>` in `UseWebcamOptions`.
   - Add `liveHistorySteps` (`HistoryStepItem[]`) and `liveHistoryIndex` (`number`, default `0`) state + refs (`liveHistoryStepsRef`, `liveHistoryIndexRef`) so the `requestAnimationFrame` loop always reads the latest stack without restarting the loop.
   - Implement `applyLiveStep`, `toggleLiveStep`, `deleteLiveStep`, and `handleLiveHistoryAction('undo' | 'redo' | 'reset')`.
   - In `captureSnapshot()`, snapshot `const committedToTransfer = liveHistoryStepsRef.current.slice(0, liveHistoryIndexRef.current)` before `closeCamera()`, then reset live history and invoke `await onSnapshotCaptured(file, committedToTransfer)`.
5. In `frontend/src/hooks/useImageWorkspace.ts`:
   - Extend `handleUploadFile(file: File, initialLayers?: HistoryStepItem[])`: after `uploadImage(file)` succeeds, if `initialLayers && initialLayers.length > 0`, loop `i = 0..initialLayers.length - 1`:
     - Call `await processImage(res.session_id, layer.operation, layer.params, true)`.
     - If `!layer.enabled`, call `await toggleHistoryStep(res.session_id, i)`.
     - Set final preview, histogram, `historyList`, `historySteps`, and `historyIndex` from the last response.

- [ ] **Step 4: Run frontend test suite and TypeScript check to verify tests pass**

Run: `npm --prefix frontend test && npm --prefix frontend run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/operations.ts frontend/src/constants/operations.ts frontend/src/constants/__tests__/operations.test.ts frontend/src/services/api.ts frontend/src/hooks/useWebcam.ts frontend/src/hooks/useImageWorkspace.ts
git commit -m "feat(frontend): add live camera multi-layer stack and auto-transfer on snapshot capture"
```

---

### Task 3: UI Integration in `RightInspector`, `TopBar`, `CenterStage`, and `App.tsx`

**Files:**
- Modify: `frontend/src/components/layout/RightInspector.tsx`
- Modify: `frontend/src/components/layout/TopBar.tsx`
- Modify: `frontend/src/components/layout/CenterStage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/__tests__/RightInspector.test.ts`

**Interfaces:**
- Consumes: `liveHistoryList`, `liveHistorySteps`, `liveHistoryIndex`, `canLiveUndo`, `canLiveRedo`, `canLiveReset`, `canLiveApply`, `applyLiveStep`, `toggleLiveStep`, `deleteLiveStep`, `handleLiveHistoryAction` from `useWebcam`
- Produces:
  - Interactive `Apply (Commit)` and `Cancel` buttons in `RightInspector` when `isCameraOpen && isLiveFilter` (with `X/5 LIVE LAYERS` counter badge and `00 Live Camera Feed [BASE]` base row in `PIPELINE HISTORY`)
  - Active `Undo`, `Redo`, and `Reset` buttons in `TopBar` when `isCameraOpen && isLiveFilter`
  - Live layer count indicator in `CenterStage` camera control bar

- [ ] **Step 1: Write the failing test in `frontend/src/components/layout/__tests__/RightInspector.test.ts`**

Add a third test case to `frontend/src/components/layout/__tests__/RightInspector.test.ts`:

```ts
  it('enables Apply (Commit) and renders Live Camera Feed layer stack when isCameraOpen and isLiveFilter are true', () => {
    const html = renderToStaticMarkup(
      React.createElement(RightInspector, {
        activeOp: 'edge_canny',
        draftParams: { low_threshold: 50, high_threshold: 150 },
        currentHistogram: null,
        originalHistogram: null,
        historyList: ['Live Camera Feed', '1. grayscale (luminance)'],
        historyIndex: 1,
        historySteps: [
          {
            id: 'live-1',
            operation: 'grayscale',
            params: { method: 'luminance' },
            label: 'grayscale (luminance)',
            enabled: true,
          },
        ],
        otsuCalculatedT: null,
        isProcessing: false,
        hasImage: false,
        isCameraOpen: true,
        isLiveFilter: true,
        onUpdateParams: () => {},
        onApply: () => {},
        onCancel: () => {},
        onToggleHistoryStep: () => {},
        onDeleteHistoryStep: () => {},
      })
    );

    assert.match(html, /1\/5 LIVE LAYERS/);
    assert.match(html, /Live Camera Feed/);
    assert.match(html, /grayscale \(luminance\)/);
    assert.match(html, /aria-label="Toggle layer 1"/);
    assert.match(html, /aria-label="Delete layer 1"/);
  });
```

- [ ] **Step 2: Run frontend test runner to verify the test fails**

Run: `npm --prefix frontend test -- RightInspector.test.ts`
Expected: FAIL (`The input did not match the regular expression /1\/5 LIVE LAYERS/`)

- [ ] **Step 3: Wire Live Filter multi-layer state in `RightInspector.tsx`, `TopBar.tsx`, `CenterStage.tsx`, and `App.tsx`**

1. In `frontend/src/components/layout/RightInspector.tsx`:
   - Define `const canInteractPipeline = effectiveHasImage || (isCameraOpen && isLiveFilter);` and `const isAtLiveLayerCap = isCameraOpen && isLiveFilter && committedLayerItems.length >= LIVE_MAX_LAYERS;`.
   - Enable `Cancel` when `canInteractPipeline` and `Apply (Commit)` when `canInteractPipeline && !isProcessing && !isAtLiveLayerCap`.
   - Update the camera helper banner to inform the user:
     - When `isLiveFilter` is ON: `'Live Pipeline active (max 5 layers). Click "Apply (Commit)" to stack filters live, or "Capture Snapshot" to transfer layers to workspace.'`
     - When `isLiveFilter` is OFF: `'Turn on "Live Filter" to preview & stack operations on camera, or click "Capture Snapshot".'`
   - In Section 3 (`PIPELINE HISTORY`):
     - Show `${committedLayerItems.length}/${LIVE_MAX_LAYERS} LIVE LAYERS` when `isCameraOpen && isLiveFilter`, or `${committedLayerItems.length} LAYERS` for static images.
     - Render the layer stack whenever `canInteractPipeline && historyList.length > 0`, using `Live Camera Feed` as base row `00` when `isCameraOpen && isLiveFilter` (and `Original Image` otherwise).
2. In `frontend/src/components/layout/TopBar.tsx`:
   - Allow `Undo`, `Redo`, and `Reset` buttons to be clicked whenever `canUndo`, `canRedo`, `canReset` are `true` (removing the `!hasImage` guard on those three buttons since `App.tsx` computes `canUndo`/`canRedo`/`canReset` for both static and live-filter modes).
3. In `frontend/src/App.tsx`:
   - Route `historyList`, `historySteps`, `historyIndex`, `onApply`, `onCancel`, `onToggleHistoryStep`, `onDeleteHistoryStep`, and `canUndo`/`canRedo`/`canReset` (`onUndo`/`onRedo`/`onReset`) to `webcam`'s live pipeline handlers when `webcam.isCameraOpen && webcam.isLiveFilter`, and to `useImageWorkspace`'s handlers otherwise.
   - Update the `Enter` and `Ctrl+Z` / `Ctrl+Y` keyboard shortcuts in `App.tsx` so they also trigger live commit / live undo / live redo when `webcam.isCameraOpen && webcam.isLiveFilter`.

- [ ] **Step 4: Run full frontend and backend test suites, typecheck, and linter**

Run: `pytest backend/tests -v && npm --prefix frontend test && npm --prefix frontend run typecheck && npm --prefix frontend run lint`
Expected: PASS (all backend and frontend tests pass with 0 warnings and 0 errors)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/RightInspector.tsx frontend/src/components/layout/TopBar.tsx frontend/src/components/layout/CenterStage.tsx frontend/src/App.tsx frontend/src/components/layout/__tests__/RightInspector.test.ts
git commit -m "feat(ui): enable live filter layer commit, history stack controls, and snapshot transfer"
```
