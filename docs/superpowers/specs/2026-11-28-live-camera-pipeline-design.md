# Live Camera Multi-Layer Pipeline & Auto-Transfer Design Spec

## 1. Intent & Why
Users experimenting with real-time webcam filters in **KROMA // Lab** want to stack multiple image processing operations (e.g., `Grayscale` -> `Gaussian Blur` -> `Canny Detector`) live on the camera stream via **Apply (Commit)**, toggle or remove individual layers in **Pipeline History**, and seamlessly carry that exact layer stack over into the static workspace session when clicking **Capture Snapshot** — without degrading real-time frame rate or introducing stateful server memory leaks.

## 2. Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Support sequential multi-step pipeline execution on a single frame in `POST /api/images/process-frame` so network and JPEG encoding overhead remain 1× per frame.
  - Enable **Apply (Commit)**, **Cancel**, **Undo / Redo / Reset**, and **Pipeline History** layer actions (**Eye** visibility toggle and **Trash** delete) while the webcam is open with **Live Filter: ON**.
  - Cap live camera committed layers at **5 layers** (`LIVE_MAX_LAYERS = 5`) to guarantee smooth real-time throughput (`~15 FPS`).
  - Automatically transfer and replay all committed live layers (including their `enabled` visibility states) onto the newly created image session when the user clicks **Capture Snapshot**.
- **Non-Goals:**
  - Computing 256-bin histograms on every live video frame (histograms remain static-session telemetry computed once a snapshot is captured).
- **Anti-Goals:**
  - Creating server-side stateful sessions per video frame or sending multiple sequential HTTP requests per single video frame.

## 3. Approaches Considered
- **Approach A (Stateless Pipeline Array Only):** Maintain a client-side live layer stack sent as a JSON `pipeline` array on each frame to `/api/images/process-frame`, capped at 5 layers, but discard the stack on snapshot capture.
- **Approach B (Selected — Stateless Pipeline Array + Auto-Transfer on Snapshot):** Same single-request stateless `pipeline` execution per frame as Approach A, plus automatic replay of committed live layers (and their muted/enabled states) onto the new backend session right after `Capture Snapshot` uploads the raw base frame.

## 4. Architecture & Component Specifications

### 4.1 Backend (`backend/app/routers/images.py`)
- Extend `POST /api/images/process-frame` to accept an optional form field `pipeline: str | None = Form(None)` alongside `operation: str = Form("grayscale")` and `params: str = Form("{}")`.
- If `pipeline` is provided and non-empty:
  - Parse `pipeline` as a JSON list of objects `[{"operation": str, "params": dict}]`.
  - Validate that `pipeline` is a list of dicts with length `<= 10` (raising `InvalidParamsError` otherwise).
  - Execute each step sequentially on `frame` in memory via `registry.execute_operation(step["operation"], frame, step.get("params", {}))`, capturing any `otsu_thresh` from the last step that returns a tuple.
- If `pipeline` is omitted, fall back to executing single `operation` + `params` for full backward compatibility.

### 4.2 Frontend API & Live Layer Stack (`frontend/src/services/api.ts` & `frontend/src/hooks/useWebcam.ts`)
- Define `LivePipelineStep`:
  ```ts
  export interface LivePipelineStep {
    operation: OperationType;
    params: Record<string, unknown>;
  }
  ```
- Update `processLiveFrame(frameBlob, operation, params, signal, pipeline?: LivePipelineStep[])` in `frontend/src/services/api.ts` to append `formData.append('pipeline', JSON.stringify(pipeline))` when `pipeline` is provided.
- In `useWebcam.ts`:
  - Export `LIVE_MAX_LAYERS = 5`.
  - Maintain `liveHistorySteps: HistoryStepItem[]` and `liveHistoryIndex: number` (`0` = base camera feed, `1..N` = committed live layers).
  - Provide live history actions:
    - `applyLiveStep(op: OperationType, params: AnyOperationParams)`: truncates forward undone steps up to `liveHistoryIndex`, enforces `LIVE_MAX_LAYERS` cap (reporting a clear toast error if already at 5 layers), and appends a new `HistoryStepItem` with formatted label.
    - `toggleLiveStep(stepIndex: number)`: toggles `enabled` on `liveHistorySteps[stepIndex]`.
    - `deleteLiveStep(stepIndex: number)`: removes `liveHistorySteps[stepIndex]` and adjusts `liveHistoryIndex`.
    - `undoLiveStep()`, `redoLiveStep()`, `resetLiveSteps()`.
  - In the `requestAnimationFrame` live loop:
    - Build the effective pipeline: all `liveHistorySteps.slice(0, liveHistoryIndex).filter((s) => s.enabled)` followed by the current draft `{ operation: activeOpRef.current, params: draftParamsRef.current }`.
    - Send this combined `pipeline` in a single `processLiveFrame` call.
  - On `captureSnapshot()`:
    - Capture the raw (mirrored if `isMirrored`) full-resolution `<video>` frame as a `File`.
    - Pass both `file` and the active committed steps `liveHistorySteps.slice(0, liveHistoryIndex)` to `onSnapshotCaptured(file, committedLiveSteps)`.

### 4.3 Snapshot Auto-Transfer (`frontend/src/hooks/useImageWorkspace.ts`)
- Update `handleUploadFile(file: File, initialLayers?: HistoryStepItem[])`:
  - After `uploadImage(file)` creates `session_id`, if `initialLayers && initialLayers.length > 0`:
    - Sequentially call `processImage(sessionId, step.operation, step.params, true)` for each step in `initialLayers`.
    - For any step where `step.enabled === false`, call `toggleHistoryStep(sessionId, idx)` so muted layers remain muted in the transferred static session.
    - Update `currentPreviewB64`, `livePreviewB64`, `currentHistogram`, `historyList`, `historySteps`, and `historyIndex` from the final response.

### 4.4 UI Wiring (`frontend/src/App.tsx` & `frontend/src/components/layout/RightInspector.tsx`)
- When `isCameraOpen && isLiveFilter`:
  - `TopBar` Undo/Redo/Reset buttons bind to `webcam.undoLiveStep`, `webcam.redoLiveStep`, and `webcam.resetLiveSteps`.
  - `RightInspector` enables **Cancel** and **Apply (Commit)** buttons, displays `00 Live Camera Feed [BASE]` + `liveHistorySteps` in **Pipeline History** (with `X/5 LIVE LAYERS` badge), and routes layer eye-toggle / trash-delete clicks to `webcam.toggleLiveStep` and `webcam.deleteLiveStep`.
