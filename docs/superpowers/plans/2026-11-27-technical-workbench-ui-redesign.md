# KROMA // Lab Technical Workbench UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Digital Image Processing web application UI into a high-precision technical desktop workbench (`KROMA // Lab`) inspired by Figma, Linear, and Darktable while preserving the existing color palette and all functional image processing capabilities.

**Architecture:** We extend the backend session history model to support non-destructive per-layer visibility toggling (`toggle_step`) and deletion (`delete_step`) with pipeline recomputation, expose those actions through the frontend API and workspace hook, and install Vitest + React Testing Library for component verification. We then refactor the operation metadata catalogue (adding micro-icons and dynamic mathematical equations/kernels) and systematically rebuild `TopBar`, `LeftSidebar`, `CenterStage`, `RightInspector`, and parameter control panels to enforce `1px solid` structural borders, sharp `2px–4px` geometry, and strict `font-sans` vs. `font-mono` typography discipline.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 3.4, Lucide React, Recharts, Vitest + React Testing Library (frontend), FastAPI, NumPy, OpenCV, Pytest (backend).

**Spec:** `docs/superpowers/specs/2026-11-27-technical-workbench-ui-redesign.md`

## Global Constraints

- Preserve exact color palette tokens in `frontend/tailwind.config.js`: `canvas: '#F3ECEF'`, `panel: '#FFF8FA'`, `panelHeader: '#FFF8FA'`, `panelBorder: '#EBD5DD'`, `subtleBg: '#FCEAF0'`, `textPrimary: '#2B1F24'`, `mutedText: '#7A636C'`, `accent: '#C85A7C'`, `accentHover: '#B3486A'`, `accentLight: '#FCEAF0'`.
- Replace all structural drop shadows (`shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`) on panels, cards, and buttons with `1px solid` borders (`border-panelBorder` or `border-accent`).
- Use sharp geometry (`rounded-sm` / `2px` or `rounded` / `4px`); never use `rounded-xl` or pill containers.
- Enforce typography split: `font-sans` (`Inter`) for UI labels and titles; `font-mono` (`JetBrains Mono`) for all technical telemetry (pixel dimensions, coordinates, zoom percentages, histogram statistics, latency/FPS, filenames, version tag `v1.0`, and mathematical equations/kernels).
- Hide `Open Image` and `Use Camera` triggers from `TopBar` when in empty state (`!metadata && !isCameraOpen`); show compact file/camera switcher triggers (`Buka` / `Ganti` and `Kamera`) in `TopBar` only after an image is loaded or camera is active.

## Review Focus

1. **Toggling or deleting an earlier history step when multiple steps are committed:** Disabling or deleting step `0` (the first committed filter after Original) must recompute all subsequent active steps up to `history_index` from `session.original` rather than returning stale cached images.
2. **All committed history steps hidden (muted) via eye toggle:** When every committed step up to `history_index` is toggled `enabled=False`, `current_image` and the returned preview/histogram must cleanly equal the original uploaded image without raising an index error.
3. **Zoom stepping from `'fit'` mode in TopBar:** Clicking `-` or `+` when `zoom === 'fit'` must transition deterministically (`-` -> `0.5`, `+` -> `1`) and selecting from the zoom preset dropdown must accept `'fit'`, `0.5`, `1`, and `2`.
4. **Search filtering in LeftSidebar with collapsed category accordions:** Typing a search query must display matching operations even if the user previously collapsed that category, and a query matching zero operations must render an explicit empty-search state (`Tidak ada operasi yang cocok`).
5. **Dynamic equation readout in RightInspector when operation parameters change:** Switching sub-methods (e.g., Grayscale `luminance` -> `average` -> `lightness`, or Threshold `binary` -> `otsu`) must immediately update the `EQUATION / KERNEL` specification box to show the exact mathematical formula for the active parameter combination.

---

### Task 1: Backend Layer-Stack History Operations (Toggle Visibility & Delete Step)

**Files:**
- Modify: `backend/app/services/session_manager.py:57-114`
- Modify: `backend/app/routers/images.py:93-96`
- Test: `backend/tests/test_session.py`

**Interfaces:**
- Consumes: `registry.execute_operation(operation: str, image: NDArray[np.uint8], params: dict) -> NDArray[np.uint8] | tuple[NDArray[np.uint8], float]`
- Produces:
  - `HistoryStepSchema` dict in `apply_history_action` and session responses: `{"id": str, "operation": str, "params": dict, "label": str, "enabled": bool}`
  - `SessionState.toggle_step(step_index: int) -> NDArray[np.uint8]`
  - `SessionState.delete_step(step_index: int) -> NDArray[np.uint8]`
  - `POST /api/images/{session_id}/history/{action}` supporting `action: Literal["undo", "redo", "reset"]`
  - `PATCH /api/images/{session_id}/history/{step_index}/toggle` -> `HistoryResponse`
  - `DELETE /api/images/{session_id}/history/{step_index}` -> `HistoryResponse`

- [ ] **Step 1: Write the failing backend tests for layer toggle, layer delete, and recomputation**

Add to `backend/tests/test_session.py` inside `TestHistoryStack`:

```python
    def test_toggle_step_recomputes_pipeline(self):
        from app.services.session_manager import toggle_history_step
        sid = self._upload()
        s = get_session(sid)
        base = s.current_image.copy()
        # Push two brightness steps via registry recompute
        from app.services import registry
        img1 = registry.execute_operation("brightness", base, {"beta": 40})
        s.push(img1, "brightness", {"beta": 40})
        img2 = registry.execute_operation("brightness", img1, {"beta": 30})
        s.push(img2, "brightness", {"beta": 30})

        # Mute first step (index 0): result should equal base + 30
        res = toggle_history_step(sid, 0)
        assert res["history_steps"][0]["enabled"] is False
        assert res["history_steps"][1]["enabled"] is True
        expected = registry.execute_operation("brightness", base, {"beta": 30})
        np.testing.assert_array_equal(s.current_image, expected)

    def test_toggle_all_steps_off_returns_original(self):
        from app.services.session_manager import toggle_history_step
        from app.services import registry
        sid = self._upload()
        s = get_session(sid)
        base = s.original.copy()
        img1 = registry.execute_operation("negative", base, {})
        s.push(img1, "negative", {})

        res = toggle_history_step(sid, 0)
        assert res["history_steps"][0]["enabled"] is False
        np.testing.assert_array_equal(s.current_image, base)

    def test_delete_step_removes_and_recomputes(self):
        from app.services.session_manager import delete_history_step
        from app.services import registry
        sid = self._upload()
        s = get_session(sid)
        base = s.original.copy()
        img1 = registry.execute_operation("brightness", base, {"beta": 25})
        s.push(img1, "brightness", {"beta": 25})
        img2 = registry.execute_operation("negative", img1, {})
        s.push(img2, "negative", {})

        res = delete_history_step(sid, 0)
        assert len(res["history"]) == 1
        assert res["history_index"] == 0
        expected = registry.execute_operation("negative", base, {})
        np.testing.assert_array_equal(s.current_image, expected)
```

- [ ] **Step 2: Run pytest to verify the new tests fail**

Run: `pytest backend/tests/test_session.py -k "test_toggle_step or test_delete_step" -v`
Expected: FAIL with `ImportError: cannot import name 'toggle_history_step' from 'app.services.session_manager'`

- [ ] **Step 3: Implement `enabled` flag, pipeline recomputation, `toggle_history_step`, and `delete_history_step` in `backend/app/services/session_manager.py` and routes in `backend/app/routers/images.py`**

In `backend/app/services/session_manager.py`:
- Add `enabled: bool = True` and `step_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])` to `HistoryEntry`.
- Add `SessionState.recompute_from(start_index: int = 0) -> None` which walks `0..len(self.history)-1`, maintaining `running_img` starting from `self.original` (or the last enabled entry before `start_index`), executing `registry.execute_operation(entry.operation, running_img, entry.params)` when `entry.enabled` is `True`, and storing the resulting image on `entry.image` (when `entry.enabled` is `False`, set `entry.image = running_img.copy()`).
- Update `SessionState.current_image` so that if `self.history_index < 0` it returns `self.original`, otherwise it returns `self.history[self.history_index].image`.
- Add `SessionState.history_steps() -> list[dict]` returning `[{"id": e.step_id, "operation": e.operation, "params": e.params, "label": f"{e.operation}", "enabled": e.enabled} for e in self.history]`.
- Include `"history_steps": session.history_steps()` in the dict returned by `apply_history_action`, `toggle_history_step(session_id: str, step_index: int) -> dict`, and `delete_history_step(session_id: str, step_index: int) -> dict`.
- In `backend/app/routers/images.py`, add:
  - `@router.patch("/{session_id}/history/{step_index}/toggle")` calling `toggle_history_step(session_id, step_index)`
  - `@router.delete("/{session_id}/history/{step_index}")` calling `delete_history_step(session_id, step_index)`

- [ ] **Step 4: Run backend test suite to verify all tests pass**

Run: `pytest backend/tests -v`
Expected: PASS (all existing and new session tests pass)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/session_manager.py backend/app/routers/images.py backend/tests/test_session.py
git commit -m "feat(backend): support toggling and deleting individual pipeline history steps"
```

---

### Task 2: Frontend Test Harness, Operation Metadata Catalogue (Micro-Icons & Technical Equations), and Layer-Stack API Wiring

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`
- Modify: `frontend/src/types/operations.ts:42-50`
- Modify: `frontend/src/constants/operations.ts`
- Modify: `frontend/src/services/api.ts:79-89`
- Modify: `frontend/src/hooks/useImageWorkspace.ts`
- Create: `frontend/src/constants/__tests__/operations.test.ts`

**Interfaces:**
- Consumes: Backend endpoints `PATCH /api/images/{session_id}/history/{step_index}/toggle` and `DELETE /api/images/{session_id}/history/{step_index}`
- Produces:
  - `HistoryStepItem` in `frontend/src/types/operations.ts`:
    ```ts
    export interface HistoryStepItem {
      id: string;
      operation: string;
      params: Record<string, unknown>;
      label: string;
      enabled: boolean;
    }
    ```
  - Updated `OperationMeta` in `frontend/src/constants/operations.ts`:
    ```ts
    export interface OperationMeta {
      id: OperationType;
      label: string;
      category: 'TONE & COLOR' | 'BLUR FILTERS' | 'DETAIL & EDGE' | 'GEOMETRY';
      description: string;
      iconName:
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
      defaultEquation: string;
    }
    ```
  - `getOperationEquation(op: OperationType, params: AnyOperationParams): { title: string; formula: string }` in `frontend/src/constants/operations.ts`
  - `toggleHistoryStep(sessionId: string, stepIndex: number): Promise<HistoryResponse>` and `deleteHistoryStep(sessionId: string, stepIndex: number): Promise<HistoryResponse>` in `frontend/src/services/api.ts`
  - `historySteps: HistoryStepItem[]`, `handleToggleHistoryStep: (stepIndex: number) => Promise<void>`, `handleDeleteHistoryStep: (stepIndex: number) => Promise<void>` returned from `useImageWorkspace`

- [ ] **Step 1: Install Vitest + React Testing Library and configure test script**

Install dev dependencies (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`) in `frontend/`, add `"test": "vitest run"` to `frontend/package.json`, configure `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], globals: true }` in `frontend/vite.config.ts`, and create `frontend/src/test/setup.ts` importing `@testing-library/jest-dom/vitest` plus a `ResizeObserver` mock for Recharts.

- [ ] **Step 2: Write the failing test in `frontend/src/constants/__tests__/operations.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { OPERATIONS, DEFAULT_PARAMS, getOperationEquation } from '@/constants/operations';

describe('OPERATIONS technical catalogue', () => {
  it('assigns an iconName and defaultEquation to every operation', () => {
    expect(OPERATIONS).toHaveLength(17);
    for (const op of OPERATIONS) {
      expect(op.iconName).toBeTruthy();
      expect(op.defaultEquation.length).toBeGreaterThan(3);
    }
  });

  it('computes dynamic mathematical equations when parameters change', () => {
    expect(getOperationEquation('grayscale', { method: 'luminance' }).formula).toContain(
      'Y = 0.299R + 0.587G + 0.114B'
    );
    expect(getOperationEquation('grayscale', { method: 'average' }).formula).toContain(
      'Y = (R + G + B) / 3'
    );
    expect(getOperationEquation('grayscale', { method: 'lightness' }).formula).toContain(
      'Y = (max(R,G,B) + min(R,G,B)) / 2'
    );
    expect(getOperationEquation('threshold', { method: 'otsu', thresh: 127 }).formula).toContain(
      'σ²_w(t) = ω₀(t)σ²₀(t) + ω₁(t)σ²₁(t)'
    );
    expect(getOperationEquation('blur_gaussian', DEFAULT_PARAMS.blur_gaussian).formula).toContain(
      'G(x,y) = (1 / 2πσ²) · exp(-(x² + y²) / 2σ²)'
    );
  });
});
```

- [ ] **Step 3: Run Vitest to verify the test fails**

Run: `npm --prefix frontend test`
Expected: FAIL with `getOperationEquation is not a function`

- [ ] **Step 4: Implement `iconName`, `defaultEquation`, `getOperationEquation`, and history step API/hook wiring**

1. In `frontend/src/types/operations.ts`:
   - Add `HistoryStepItem` interface and optional `history_steps?: HistoryStepItem[]` on `HistoryResponse`.
2. In `frontend/src/constants/operations.ts`:
   - Add `iconName` and `defaultEquation` to all 17 items in `OPERATIONS`.
   - Export `getOperationEquation(op: OperationType, params: AnyOperationParams): { title: string; formula: string }` covering every `OperationType` and sub-mode:
     - `grayscale`:
       - `luminance`: `{ title: 'ITU-R BT.601 LUMINANCE', formula: 'Y = 0.299R + 0.587G + 0.114B' }`
       - `average`: `{ title: 'ARITHMETIC MEAN', formula: 'Y = (R + G + B) / 3' }`
       - `lightness`: `{ title: 'EXTREMUM MIDPOINT', formula: 'Y = (max(R,G,B) + min(R,G,B)) / 2' }`
     - `brightness`: `{ title: 'LINEAR INTENSITY OFFSET', formula: 'I_out(x,y) = clip(I_in(x,y) + β, 0, 255),  β = ' + p.beta }`
     - `negative`: `{ title: 'PHOTOMETRIC INVERSION', formula: 'I_out(x,y) = 255 - I_in(x,y),  A_out = A_in' }`
     - `threshold`:
       - `binary`: `{ title: 'BINARY STEP', formula: `I_out = 255 if I_in > ${p.thresh} else 0` }`
       - `binary_inv`: `{ title: 'INVERSE BINARY STEP', formula: `I_out = 0 if I_in > ${p.thresh} else 255` }`
       - `truncate`: `{ title: 'UPPER TRUNCATION', formula: `I_out = ${p.thresh} if I_in > ${p.thresh} else I_in` }`
       - `to_zero`: `{ title: 'LOWER FLOOR', formula: `I_out = I_in if I_in > ${p.thresh} else 0` }`
       - `otsu`: `{ title: 'OTSU INTRA-CLASS VARIANCE', formula: 'min_t σ²_w(t) = ω₀(t)σ²₀(t) + ω₁(t)σ²₁(t)' }`
     - `equalize`:
       - `global`: `{ title: 'CDF LUMINANCE REMAPPING', formula: 's_k = (L - 1) · Σ_{j=0..k} p_Y(r_j)' }`
       - `clahe`: `{ title: 'ADAPTIVE CLAHE (YCrCb)', formula: `ClipLimit = ${p.clip_limit.toFixed(1)},  Grid = ${p.tile_grid_size}×${p.tile_grid_size}` }`
     - `blur_gaussian`: `{ title: '2D GAUSSIAN CONVOLUTION', formula: `G(x,y) = (1 / 2πσ²) · exp(-(x² + y²) / 2σ²),  k=${p.kernel_size}×${p.kernel_size}` }`
     - `blur_averaging`: `{ title: 'UNIFORM BOX KERNEL', formula: `K(i,j) = 1 / (${p.kernel_size}×${p.kernel_size}) = ${(1 / (p.kernel_size * p.kernel_size)).toFixed(4)}` }`
     - `blur_median`: `{ title: 'NON-LINEAR RANK ORDER', formula: `I_out(x,y) = median{ I_in(x+i, y+j) | (i,j) ∈ W_${p.kernel_size}×${p.kernel_size} }` }`
     - `blur_bilateral`: `{ title: 'BILATERAL SPATIAL-RANGE', formula: `I_out = (1/W_p) Σ I(x_i) · f_r(||I(x_i)-I(x)||, σc=${p.sigma_color}) · g_s(||x_i-x||, σs=${p.sigma_space})` }`
     - `blur_filter2d`: `{ title: `SPATIAL CONVOLUTION (${p.kernel.length}×${p.kernel.length})`, formula: 'I_out = (K * I_in)' + (p.auto_normalize ? ' / max(Σ K_ij, 1)' : '') }`
     - `sharpen`:
       - `standard`: `{ title: 'LAPLACIAN 4-NEIGHBOR SHARPEN', formula: 'K = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]' }`
       - `strong`: `{ title: 'LAPLACIAN 8-NEIGHBOR SHARPEN', formula: 'K = [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]' }`
       - `unsharp_mask`: `{ title: 'UNSHARP MASKING', formula: `I_out = clip(I_in + ${p.alpha_strength.toFixed(2)} · (I_in - G * I_in), 0, 255)` }`
     - `edge_sobel`: `{ title: `SOBEL FIRST DERIVATIVE (${p.ksize}×${p.ksize})`, formula: p.direction === 'combined' ? 'G = √(Gx² + Gy²)' : p.direction === 'x' ? 'Gx = ∂I/∂x (Horizontal)' : 'Gy = ∂I/∂y (Vertical)' }`
     - `edge_prewitt`: `{ title: 'PREWITT GRADIENT MAGNITUDE', formula: 'Gx = [-1 0 1; -1 0 1; -1 0 1],  G = √(Gx² + Gy²)' }`
     - `edge_laplacian`: `{ title: p.pre_gaussian ? 'LAPLACIAN OF GAUSSIAN (LoG)' : '2ND ISOTROPIC DERIVATIVE', formula: '∇²I = ∂²I/∂x² + ∂²I/∂y²' }`
     - `edge_canny`: `{ title: 'CANNY HYSTERESIS DETECTOR', formula: `T_low = ${p.low_threshold},  T_high = ${p.high_threshold}  (T_low ≤ T_high)` }`
     - `sketch`: `{ title: 'COLOR DODGE PENCIL BLEND', formula: `I_out = min(255, (I_gray × 256) / max(1, 255 - G_${p.kernel_size}(255 - I_gray)))` }`
     - `mirror`: `{ title: 'COORDINATE AFFINE FLIP', formula: p.direction === 'horizontal' ? "x' = W - 1 - x,  y' = y" : p.direction === 'vertical' ? "x' = x,  y' = H - 1 - y" : p.direction === 'both' ? "x' = W - 1 - x,  y' = H - 1 - y" : "x' = x,  y' = y (Identity)" }`
3. In `frontend/src/services/api.ts`:
   - Export `toggleHistoryStep(sessionId: string, stepIndex: number): Promise<HistoryResponse>` (`PATCH /api/images/${sessionId}/history/${stepIndex}/toggle`) and `deleteHistoryStep(sessionId: string, stepIndex: number): Promise<HistoryResponse>` (`DELETE /api/images/${sessionId}/history/${stepIndex}`).
4. In `frontend/src/hooks/useImageWorkspace.ts`:
   - Maintain `historySteps: HistoryStepItem[]` alongside `historyList` and `historyIndex`.
   - When `handleApply` commits, append `{ id: `${Date.now()}`, operation: activeOp, params: { ...(draftParams as Record<string, unknown>) }, label: `${activeOp}`, enabled: true }` to `historySteps` (sliced to `historyIndex`).
   - Add `handleToggleHistoryStep(stepIndex: number)` and `handleDeleteHistoryStep(stepIndex: number)` calling the new API helpers and updating `currentPreviewB64`, `livePreviewB64`, `currentHistogram`, `historyIndex`, `historyList`, and `historySteps`.

- [ ] **Step 5: Run Vitest and TypeScript compiler to verify tests pass**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: PASS (Vitest passes and `tsc -b && vite build` succeeds with 0 errors)

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/test/setup.ts frontend/src/types/operations.ts frontend/src/constants/operations.ts frontend/src/constants/__tests__/operations.test.ts frontend/src/services/api.ts frontend/src/hooks/useImageWorkspace.ts
git commit -m "feat(frontend): add operation equations, micro-icon catalogue, and layer history actions"
```

---

### Task 3: Top Header Bar Overhaul (`TopBar.tsx`) — Flat Technical Instrument Bar

**Files:**
- Modify: `frontend/src/components/layout/TopBar.tsx`
- Create: `frontend/src/components/layout/__tests__/TopBar.test.tsx`

**Interfaces:**
- Consumes: `TopBarProps` (existing props in `frontend/src/components/layout/TopBar.tsx:16-34` — zero breaking prop changes to `App.tsx`)
- Produces:
  - Flat full-width header (`h-11 bg-panel border-b border-panelBorder px-3 flex items-center justify-between`) with vertical `1px` dividers (`h-5 w-[1px] bg-panelBorder`) between functional groups and zero drop shadows.
  - Brand identity: 3×3 pixel matrix SVG icon + `KROMA // Lab` + monospace version badge `v1.0` + `/` + monospace breadcrumb (`belum_ada_file` when empty, or `<filename> [<W>×<H> • <RGB|RGBA|GRAY>]` when loaded, or camera mode badge).
  - Conditional source actions: `Open Image` and `Use Camera` hidden in empty state (`!metadata && !isCameraOpen`); compact `Ganti File` and `Kamera` buttons rendered in the header only when `!!metadata || isCameraOpen`.
  - Compact Zoom Instrument: `-` button, monospace zoom preset selector (`FIT`, `50%`, `100%`, `200%`), `+` button, and `Fit` toggle button.
  - Primary export trigger labeled `Export` (replacing `Save File`).

- [ ] **Step 1: Write the failing test in `frontend/src/components/layout/__tests__/TopBar.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '@/components/layout/TopBar';

const baseProps = {
  metadata: null,
  isCameraOpen: false,
  isCameraStarting: false,
  isLiveFilter: false,
  viewMode: 'single' as const,
  zoom: 'fit' as const,
  canUndo: false,
  canRedo: false,
  canReset: false,
  onSelectFile: vi.fn(),
  onToggleCamera: vi.fn(),
  onSetViewMode: vi.fn(),
  onSetZoom: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onReset: vi.fn(),
  onOpenExport: vi.fn(),
};

describe('TopBar technical instrument header', () => {
  it('renders KROMA // Lab brand, v1.0 tag, belum_ada_file breadcrumb, and hides open/camera buttons in empty state', () => {
    render(<TopBar {...baseProps} />);
    expect(screen.getByText('KROMA // Lab')).toBeInTheDocument();
    expect(screen.getByText('v1.0')).toBeInTheDocument();
    expect(screen.getByText('belum_ada_file')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ganti file|buka|open image/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /use camera|kamera/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  it('shows active file telemetry, compact Ganti File & Kamera buttons, and steps zoom when an image is loaded', () => {
    const onSetZoom = vi.fn();
    render(
      <TopBar
        {...baseProps}
        onSetZoom={onSetZoom}
        metadata={{
          filename: 'spesimen.png',
          width: 512,
          height: 512,
          channels: 3,
          format: 'image/png',
        }}
      />
    );
    expect(screen.getByText('spesimen.png')).toBeInTheDocument();
    expect(screen.getByText('[512×512 • RGB]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ganti/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kamera/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(onSetZoom).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));
    expect(onSetZoom).toHaveBeenCalledWith(0.5);
  });
});
```

- [ ] **Step 2: Run Vitest to verify the test fails**

Run: `npm --prefix frontend test -- src/components/layout/__tests__/TopBar.test.tsx`
Expected: FAIL with `Unable to find an element with the text: KROMA // Lab`

- [ ] **Step 3: Implement the technical workbench `TopBar` in `frontend/src/components/layout/TopBar.tsx`**

Implement `TopBar`:
- Left section:
  - 3×3 pixel matrix SVG icon (`w-4 h-4 text-accent`) inside a crisp `w-6 h-6 rounded-sm bg-subtleBg border border-accent flex items-center justify-center`.
  - Brand title `KROMA // Lab` (`font-sans font-bold text-xs tracking-tight text-textPrimary`) + version tag `v1.0` (`font-mono text-[10px] px-1 py-0.5 rounded-sm bg-subtleBg border border-panelBorder text-mutedText`).
  - Slash separator `/` (`font-mono text-xs text-panelBorder px-1`).
  - Breadcrumb telemetry in `font-mono text-xs`:
    - When `isCameraOpen`: pulsing indicator + `LIVE_FILTER // STATELESS` or `CAMERA_SNAPSHOT`.
    - When `metadata`: `<span className="text-textPrimary font-semibold truncate max-w-[160px]">{metadata.filename}</span>` + `<span className="text-mutedText">[{metadata.width}×{metadata.height} • {channelLabel}]</span>`.
    - When empty: `<span className="text-mutedText/70">belum_ada_file</span>`.
  - When `!!metadata || isCameraOpen`, render a vertical `1px` divider (`h-5 w-[1px] bg-panelBorder`) followed by compact `Ganti` (`FolderOpen` icon) and `Kamera` / `Tutup Kamera` (`Camera` icon) buttons with `border border-panelBorder rounded-sm px-2 py-1 text-xs`.
- Center section:
  - Segmented View Mode control (`Single`, `Side-by-Side`, `Split`) in a flat `border border-panelBorder rounded-sm bg-subtleBg/50 flex items-center divide-x divide-panelBorder` container. Active button uses `bg-subtleBg text-textPrimary font-semibold border-b-2 border-b-accent`.
  - Vertical `1px` divider (`h-5 w-[1px] bg-panelBorder`).
  - Compact Zoom Control (`font-mono text-xs flex items-center border border-panelBorder rounded-sm bg-white divide-x divide-panelBorder`):
    - `Zoom Out` button (`aria-label="Zoom Out"`, `-` or `Minus` icon `12px`): steps `2 -> 1 -> 0.5`, or from `'fit'` to `0.5`.
    - `<select aria-label="Zoom Preset">` displaying `FIT`, `50%`, `100%`, `200%` in `font-mono text-xs px-2 py-1 bg-transparent text-textPrimary cursor-pointer focus:outline-none`.
    - `Zoom In` button (`aria-label="Zoom In"`, `+` or `Plus` icon `12px`): steps `0.5 -> 1 -> 2`, or from `'fit'` to `1`.
    - `Fit` toggle button (`px-2 py-1 text-[11px] font-mono`, highlighted when `zoom === 'fit'`).
- Right section:
  - `Undo`, `Redo`, `Reset` icon buttons (`w-7 h-7 flex items-center justify-center rounded-sm border border-transparent hover:border-panelBorder hover:bg-subtleBg`), vertical `1px` divider (`h-5 w-[1px] bg-panelBorder`), and primary `Export` button (`bg-accent hover:bg-accentHover text-white border border-accent rounded-sm px-3 py-1 text-xs font-semibold`).

- [ ] **Step 4: Run Vitest to verify `TopBar` tests pass**

Run: `npm --prefix frontend test -- src/components/layout/__tests__/TopBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/TopBar.tsx frontend/src/components/layout/__tests__/TopBar.test.tsx
git commit -m "feat(ui): redesign TopBar into flat technical instrument bar with breadcrumb and compact zoom"
```

---

### Task 4: Left Sidebar Overhaul (`LeftSidebar.tsx`) — Quick Search, Collapsible Accordions, Micro-Icons & 1px Active Geometry

**Files:**
- Modify: `frontend/src/components/layout/LeftSidebar.tsx`
- Create: `frontend/src/components/layout/__tests__/LeftSidebar.test.tsx`

**Interfaces:**
- Consumes: `LeftSidebarProps` (`activeOp: OperationType`, `onSelectOp: (op: OperationType) => void`), `OPERATIONS`, `OPERATION_CATEGORIES` from `@/constants/operations`
- Produces:
  - Top-docked search input (`placeholder="Cari operasi..."`) with clear button
  - Collapsible category accordions (`TONE & COLOR`, `BLUR FILTERS`, `DETAIL & EDGE`, `GEOMETRY`) with item counts and chevron state
  - `14px` stroke icon per operation and `rounded` (`4px`) + `1px solid border-accent` active item geometry

- [ ] **Step 1: Write the failing test in `frontend/src/components/layout/__tests__/LeftSidebar.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftSidebar } from '@/components/layout/LeftSidebar';

describe('LeftSidebar technical operation panel', () => {
  it('filters operations via the quick search input and shows empty state when unmatched', () => {
    const onSelectOp = vi.fn();
    render(<LeftSidebar activeOp="grayscale" onSelectOp={onSelectOp} />);

    const searchInput = screen.getByPlaceholderText('Cari operasi...');
    fireEvent.change(searchInput, { target: { value: 'sobel' } });

    expect(screen.getByText('Sobel Operator')).toBeInTheDocument();
    expect(screen.queryByText('Grayscale')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });
    expect(screen.getByText(/tidak ada operasi yang cocok/i)).toBeInTheDocument();
  });

  it('toggles category accordion open and closed, and auto-expands on search match', () => {
    render(<LeftSidebar activeOp="grayscale" onSelectOp={vi.fn()} />);

    const geometryHeader = screen.getByRole('button', { name: /geometry/i });
    expect(screen.getByText('Mirroring')).toBeInTheDocument();

    // Collapse GEOMETRY
    fireEvent.click(geometryHeader);
    expect(screen.queryByText('Mirroring')).not.toBeInTheDocument();

    // Searching for "mirror" reveals it even when category was collapsed
    const searchInput = screen.getByPlaceholderText('Cari operasi...');
    fireEvent.change(searchInput, { target: { value: 'mirror' } });
    expect(screen.getByText('Mirroring')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run Vitest to verify the test fails**

Run: `npm --prefix frontend test -- src/components/layout/__tests__/LeftSidebar.test.tsx`
Expected: FAIL with `Unable to find an element with the placeholder text of: Cari operasi...`

- [ ] **Step 3: Implement search, collapsible accordions, micro-icons, and 1px active borders in `frontend/src/components/layout/LeftSidebar.tsx`**

In `frontend/src/components/layout/LeftSidebar.tsx`:
- Add local state `searchQuery: string` (`''`) and `collapsedCategories: Record<string, boolean>` (`{}`).
- Render a top search bar container (`p-2.5 border-b border-panelBorder bg-panel sticky top-0 z-10`) containing a relative input wrapper with a `Search` icon (`w-3.5 h-3.5 text-mutedText`), `<input type="text" placeholder="Cari operasi..." className="w-full bg-white border border-panelBorder rounded px-7 py-1.5 text-xs text-textPrimary placeholder:text-mutedText/70 focus:outline-none focus:border-accent" />`, and a clear (`X`) button when `searchQuery.length > 0`.
- Map `iconName` from `OperationMeta` to the corresponding `lucide-react` icon component (`w-3.5 h-3.5 shrink-0`).
- Filter `OPERATIONS` by `searchQuery.trim().toLowerCase()` matching `op.label`, `op.id`, or `op.description`.
- For each category with matching operations:
  - Render an accordion header button (`w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-mutedText hover:text-textPrimary uppercase tracking-wider border-b border-panelBorder/60 cursor-pointer`) with `ChevronDown` / `ChevronRight` (`w-3 h-3`) and monospace count badge (`font-mono text-[10px]`).
  - Show category items when `!collapsedCategories[category] || searchQuery.trim().length > 0`.
  - Render each operation button with `rounded` (`4px`) geometry and explicit `1px` border:
    - Active: `bg-subtleBg text-textPrimary font-semibold border border-accent`
    - Inactive: `bg-transparent text-mutedText hover:text-textPrimary hover:bg-subtleBg/50 border border-transparent hover:border-panelBorder`
- If total matching operations across all categories is `0`, display `Tidak ada operasi yang cocok` in `font-mono text-xs text-mutedText p-4 text-center`.

- [ ] **Step 4: Run Vitest to verify `LeftSidebar` tests pass**

Run: `npm --prefix frontend test -- src/components/layout/__tests__/LeftSidebar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/LeftSidebar.tsx frontend/src/components/layout/__tests__/LeftSidebar.test.tsx
git commit -m "feat(ui): add quick search, collapsible category accordions, and micro-icons to LeftSidebar"
```

---

### Task 5: Center Canvas, Structured Dropzone, Lab Specimen Strip & Floating Telemetry HUD (`CenterStage.tsx`)

**Files:**
- Modify: `frontend/src/components/layout/CenterStage.tsx`
- Create: `frontend/src/components/layout/__tests__/CenterStage.test.tsx`

**Interfaces:**
- Consumes: `CenterStageProps` (existing props in `frontend/src/components/layout/CenterStage.tsx:36-53`)
- Produces:
  - Structured technical dropzone container (`border border-dashed border-panelBorder bg-panel/95 rounded p-6 max-w-xl w-full`) with technical header strip (`WORKSPACE // INPUT_SOURCE`)
  - 3 lab-specimen benchmark strips with sharp square thumbnails, monospace filenames (`geometric_test.png`, `low_contrast.png`, `salt_pepper.png`), and technical tags (`Edge`, `HistEq`, `Median`)
  - Floating bottom-left monospace HUD bar (`X: — Y: —`, resolution, zoom readout, and latency `⚡ ms`) inside the canvas area, plus bottom status bar without soft shadows

- [ ] **Step 1: Write the failing test in `frontend/src/components/layout/__tests__/CenterStage.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CenterStage } from '@/components/layout/CenterStage';

vi.mock('@/services/api', () => ({
  fetchSampleList: vi.fn().mockResolvedValue([
    '/api/samples/sample_geometric.png',
    '/api/samples/sample_low_contrast.png',
    '/api/samples/sample_salt_pepper.png',
  ]),
}));

const baseCamera = {
  isCameraOpen: false,
  isStarting: false,
  isCapturing: false,
  isLiveFilter: false,
  isMirrored: true,
  liveResolution: 480 as const,
  devices: [],
  selectedDeviceId: '',
  streamResolution: null,
  liveProcessingMs: 0,
  liveFps: 0,
  onOpenCamera: vi.fn(),
  onCloseCamera: vi.fn(),
  onToggleLiveFilter: vi.fn(),
  onToggleMirror: vi.fn(),
  onSetLiveResolution: vi.fn(),
  onSwitchDevice: vi.fn(),
  onCaptureSnapshot: vi.fn(),
};

describe('CenterStage technical dropzone, lab specimens, and floating HUD', () => {
  it('renders dashed technical dropzone container and lab specimen strip with monospace filenames and tags', async () => {
    const onLoadSample = vi.fn();
    render(
      <CenterStage
        metadata={null}
        originalPreviewB64={null}
        livePreviewB64={null}
        viewMode="single"
        zoom="fit"
        splitPosition={50}
        cursorPos={{ x: null, y: null }}
        processingTimeMs={0}
        isProcessing={false}
        camera={baseCamera}
        videoRef={React.createRef()}
        liveCanvasRef={React.createRef()}
        onSelectFile={vi.fn()}
        onLoadSample={onLoadSample}
        onSplitChange={vi.fn()}
        onCursorMove={vi.fn()}
      />
    );

    expect(await screen.findByText('geometric_test.png')).toBeInTheDocument();
    expect(screen.getByText('low_contrast.png')).toBeInTheDocument();
    expect(screen.getByText('salt_pepper.png')).toBeInTheDocument();
    expect(screen.getByText('Edge')).toBeInTheDocument();
    expect(screen.getByText('HistEq')).toBeInTheDocument();
    expect(screen.getByText('Median')).toBeInTheDocument();

    fireEvent.click(screen.getByText('geometric_test.png'));
    expect(onLoadSample).toHaveBeenCalledWith('/api/samples/sample_geometric.png');
  });

  it('displays floating monospace HUD with pixel coordinates X and Y when an image is active', () => {
    render(
      <CenterStage
        metadata={{
          filename: 'lena.png',
          width: 256,
          height: 256,
          channels: 3,
          format: 'image/png',
        }}
        originalPreviewB64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        livePreviewB64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        viewMode="single"
        zoom={1}
        splitPosition={50}
        cursorPos={{ x: 120, y: 84 }}
        processingTimeMs={4.2}
        isProcessing={false}
        camera={baseCamera}
        videoRef={React.createRef()}
        liveCanvasRef={React.createRef()}
        onSelectFile={vi.fn()}
        onLoadSample={vi.fn()}
        onSplitChange={vi.fn()}
        onCursorMove={vi.fn()}
      />
    );

    expect(screen.getByText('120px')).toBeInTheDocument();
    expect(screen.getByText('84px')).toBeInTheDocument();
    expect(screen.getByText('4.2 ms')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run Vitest to verify the test fails**

Run: `npm --prefix frontend test -- src/components/layout/__tests__/CenterStage.test.tsx`
Expected: FAIL with `Unable to find an element with the text: geometric_test.png`

- [ ] **Step 3: Implement the technical dropzone container, specimen benchmark cards, and floating monospace HUD in `frontend/src/components/layout/CenterStage.tsx`**

In `frontend/src/components/layout/CenterStage.tsx`:
- Remove all `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg` classes across `CenterStage.tsx`, replacing them with `border border-panelBorder` or `border border-accent`.
- In empty state (`!metadata`):
  - Wrap the dropzone and sample strip inside `<div className="w-full max-w-xl bg-panel/95 border border-dashed border-panelBorder rounded p-6 space-y-5">` with a technical micro-header strip (`flex items-center justify-between border-b border-panelBorder pb-2 text-[10px] font-mono text-mutedText uppercase tracking-wider`) reading `<span>WORKSPACE // INPUT_SOURCE</span>` and `<span>MAX_PAYLOAD: 10MB</span>`.
  - Replace the circular icon badge (`rounded-full`) with a sharp technical square badge (`w-10 h-10 rounded-sm bg-subtleBg border border-panelBorder flex items-center justify-center text-accent mx-auto`).
  - Map the 3 benchmark samples to specimen descriptors:
    - `geometric` -> `filename: 'geometric_test.png'`, `tag: 'Edge'`
    - `low_contrast` -> `filename: 'low_contrast.png'`, `tag: 'HistEq'`
    - `salt_pepper` -> `filename: 'salt_pepper.png'`, `tag: 'Median'`
  - Render each specimen as a technical strip item (`group flex items-center gap-2.5 p-2 rounded-sm bg-white hover:bg-subtleBg/60 border border-panelBorder hover:border-accent transition text-left cursor-pointer`) with:
    - Sharp square thumbnail (`w-10 h-10 rounded-sm overflow-hidden border border-panelBorder bg-subtleBg shrink-0`)
    - Monospace filename (`block text-[11px] font-mono font-semibold text-textPrimary group-hover:text-accent truncate`)
    - Technical tag badge (`inline-block mt-0.5 px-1.5 py-0.2 rounded-sm bg-subtleBg border border-panelBorder text-[9px] font-mono font-semibold text-accent uppercase`)
- In the active canvas viewport (`!camera.isCameraOpen`), anchor a floating monospace HUD bar at the bottom-left (`absolute bottom-3 left-3 z-20 bg-panel/95 border border-panelBorder rounded-sm px-2.5 py-1 flex items-center gap-3 text-[11px] font-mono text-mutedText`) showing `X` and `Y` coordinates, image dimensions (`W × H`), current zoom percentage (`FIT` or `100%`), and processing time (`⚡ 4.2 ms`).

- [ ] **Step 4: Run Vitest to verify `CenterStage` tests pass**

Run: `npm --prefix frontend test -- src/components/layout/__tests__/CenterStage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/CenterStage.tsx frontend/src/components/layout/__tests__/CenterStage.test.tsx
git commit -m "feat(ui): redesign CenterStage empty dropzone, lab specimen strip, and floating telemetry HUD"
```

---

### Task 6: Right Inspector, Technical Equation Box & Expanded Layer-Stack Pipeline History (`RightInspector.tsx`, Controls & `App.tsx`)

**Files:**
- Modify: `frontend/src/components/layout/RightInspector.tsx`
- Modify: `frontend/src/components/controls/ToneColorControls.tsx`
- Modify: `frontend/src/components/controls/BlurControls.tsx`
- Modify: `frontend/src/components/controls/DetailControls.tsx`
- Modify: `frontend/src/components/controls/GeometryControls.tsx`
- Modify: `frontend/src/components/modals/ExportModal.tsx`
- Modify: `frontend/src/components/common/ToastError.tsx`
- Modify: `frontend/src/components/common/ErrorBoundary.tsx`
- Modify: `frontend/src/App.tsx:200-216`
- Create: `frontend/src/components/layout/__tests__/RightInspector.test.tsx`

**Interfaces:**
- Consumes:
  - `getOperationEquation(activeOp, draftParams)` from `@/constants/operations`
  - `historySteps: HistoryStepItem[]`, `onToggleHistoryStep?: (stepIndex: number) => void`, `onDeleteHistoryStep?: (stepIndex: number) => void` passed from `App.tsx` into `RightInspector`
- Produces:
  - Compact histogram chart (`h-24`) + 4-column `MIN`, `MAX`, `MEAN`, `STD` monospace grid with `1px` borders and zero drop shadows
  - Dedicated `EQUATION / KERNEL` technical specification box (`bg-black/[0.03] border border-panelBorder rounded-sm p-2 font-mono text-[11px]`) in `RightInspector`
  - Fixed-height bottom `PIPELINE HISTORY` layer stack (`h-[34%] min-h-[200px] shrink-0 border-t border-panelBorder flex flex-col`) with per-step visibility toggle (`Eye` / `EyeOff`) and delete (`Trash2`) buttons
  - Clean `1px` borders (no `shadow-xs` / `shadow-xl`) across all parameter control panels and modal/toast surfaces

- [ ] **Step 1: Write the failing test in `frontend/src/components/layout/__tests__/RightInspector.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightInspector } from '@/components/layout/RightInspector';

const sampleHistogram = {
  mode: 'rgb' as const,
  channels: [
    { channel: 'red' as const, values: new Array(256).fill(10) },
    { channel: 'green' as const, values: new Array(256).fill(10) },
    { channel: 'blue' as const, values: new Array(256).fill(10) },
  ],
  stats: { min: 12, max: 240, mean: 118.4, std_dev: 42.7 },
};

describe('RightInspector technical specification box and layer-stack pipeline history', () => {
  it('renders 4-column monospace histogram stats and the EQUATION / KERNEL specification box', () => {
    const { rerender } = render(
      <RightInspector
        activeOp="grayscale"
        draftParams={{ method: 'luminance' }}
        currentHistogram={sampleHistogram}
        originalHistogram={sampleHistogram}
        historyList={['Original Image']}
        historyIndex={0}
        historySteps={[]}
        otsuCalculatedT={null}
        isProcessing={false}
        hasImage={true}
        onUpdateParams={vi.fn()}
        onApply={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('EQUATION / KERNEL')).toBeInTheDocument();
    expect(screen.getByText(/Y = 0\.299R \+ 0\.587G \+ 0\.114B/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('118.4')).toBeInTheDocument();
    expect(screen.getByText('42.7')).toBeInTheDocument();

    // Switching parameter updates equation box immediately
    rerender(
      <RightInspector
        activeOp="grayscale"
        draftParams={{ method: 'average' }}
        currentHistogram={sampleHistogram}
        originalHistogram={sampleHistogram}
        historyList={['Original Image']}
        historyIndex={0}
        historySteps={[]}
        otsuCalculatedT={null}
        isProcessing={false}
        hasImage={true}
        onUpdateParams={vi.fn()}
        onApply={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Y = \(R \+ G \+ B\) \/ 3/)).toBeInTheDocument();
  });

  it('renders Pipeline History as a layer stack with eye visibility toggle and delete actions', () => {
    const onToggleHistoryStep = vi.fn();
    const onDeleteHistoryStep = vi.fn();

    render(
      <RightInspector
        activeOp="brightness"
        draftParams={{ beta: 20 }}
        currentHistogram={sampleHistogram}
        originalHistogram={sampleHistogram}
        historyList={['Original Image', '1. grayscale {"method":"luminance"}']}
        historyIndex={1}
        historySteps={[
          {
            id: 'step-1',
            operation: 'grayscale',
            params: { method: 'luminance' },
            label: 'grayscale',
            enabled: true,
          },
        ]}
        otsuCalculatedT={null}
        isProcessing={false}
        hasImage={true}
        onUpdateParams={vi.fn()}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        onToggleHistoryStep={onToggleHistoryStep}
        onDeleteHistoryStep={onDeleteHistoryStep}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle layer 1/i });
    const deleteBtn = screen.getByRole('button', { name: /delete layer 1/i });

    fireEvent.click(toggleBtn);
    expect(onToggleHistoryStep).toHaveBeenCalledWith(0);

    fireEvent.click(deleteBtn);
    expect(onDeleteHistoryStep).toHaveBeenCalledWith(0);
  });
});
```

- [ ] **Step 2: Run Vitest to verify the test fails**

Run: `npm --prefix frontend test -- src/components/layout/__tests__/RightInspector.test.tsx`
Expected: FAIL with `Unable to find an element with the text: EQUATION / KERNEL`

- [ ] **Step 3: Implement `RightInspector` overhaul, remove duplicate inline prose formulas in control components, strip soft shadows, and connect props in `App.tsx`**

1. In `frontend/src/components/layout/RightInspector.tsx`:
   - Make the outer `<aside>` a full-height flex column (`w-80 bg-panel border-l border-panelBorder flex flex-col select-none shrink-0 overflow-hidden`).
   - **Section 1 (Histogram, `shrink-0 p-3 border-b border-panelBorder space-y-2`):**
     - Reduce chart height to `h-24` (`96px`), remove `shadow-xs` / `shadow-md`, use `border border-panelBorder`.
     - Render `MIN`, `MAX`, `MEAN`, `STD` in a compact `grid grid-cols-4 gap-1 text-center font-mono` with `border border-panelBorder bg-white p-1 rounded-sm`.
   - **Section 2 (Parameters & Technical Equation Box, `flex-1 overflow-y-auto p-3 space-y-3`):**
     - Operation header (`category` tag + `opMeta?.label` + concise description).
     - Dedicated **Technical Equation / Kernel Specification Box**:
       ```tsx
       <div className="bg-black/[0.03] border border-panelBorder rounded-sm p-2 space-y-1">
         <div className="flex items-center justify-between">
           <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-mutedText">
             EQUATION / KERNEL
           </span>
           <span className="text-[9px] font-mono text-accent uppercase">
             {equationSpec.title}
           </span>
         </div>
         <div className="font-mono text-[11px] text-textPrimary break-words leading-snug">
           {equationSpec.formula}
         </div>
       </div>
       ```
     - Render the 4 category control components and the `Cancel` / `Apply (Commit)` action bar.
   - **Section 3 (Expanded Layer-Stack Pipeline History, `h-[34%] min-h-[200px] shrink-0 border-t border-panelBorder p-3 flex flex-col`):**
     - Header showing `PIPELINE HISTORY` + active layer count badge in `font-mono text-[10px]`.
     - Scrollable layer list (`flex-1 overflow-y-auto space-y-1 pr-0.5`):
       - Base layer `00` (`Original Image`) with locked indicator (`BASE`).
       - Committed steps (`historySteps` when populated, or fallback from `historyList.slice(1)`): each row renders step number (`01`, `02`, ... in `font-mono text-[10px]`), operation label (struck-through/dimmed when `enabled === false`), visibility toggle button (`aria-label={`Toggle layer ${stepIdx + 1}`}` with `Eye` or `EyeOff` `13.5px` icon), and delete step button (`aria-label={`Delete layer ${stepIdx + 1}`}` with `Trash2` `13.5px` icon).
2. In `ToneColorControls.tsx`, `BlurControls.tsx`, `DetailControls.tsx`, `GeometryControls.tsx`, `ExportModal.tsx`, `ToastError.tsx`, and `ErrorBoundary.tsx`:
   - Remove redundant inline equation paragraphs that are now displayed in the `EQUATION / KERNEL` specification box (keeping interactive controls, Otsu `T` readout, and zero-sum warning).
   - Remove `shadow-xs`, `shadow-lg`, `shadow-xl` classes and use `1px solid` borders (`border-panelBorder` or `border-accent`).
3. In `frontend/src/App.tsx`:
   - Pass `historySteps={historySteps}`, `onToggleHistoryStep={handleToggleHistoryStep}`, and `onDeleteHistoryStep={handleDeleteHistoryStep}` from `useImageWorkspace` to `RightInspector`.

- [ ] **Step 4: Run full frontend and backend test suites plus production build**

Run: `npm --prefix frontend test && npm --prefix frontend run build && pytest backend/tests -v`
Expected: PASS (all Vitest suites pass, TypeScript + Vite build succeeds, and all Pytest tests pass)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/RightInspector.tsx frontend/src/components/layout/__tests__/RightInspector.test.tsx frontend/src/components/controls/ToneColorControls.tsx frontend/src/components/controls/BlurControls.tsx frontend/src/components/controls/DetailControls.tsx frontend/src/components/controls/GeometryControls.tsx frontend/src/components/modals/ExportModal.tsx frontend/src/components/common/ToastError.tsx frontend/src/components/common/ErrorBoundary.tsx frontend/src/App.tsx
git commit -m "feat(ui): add technical equation box, expanded layer-stack pipeline history, and 1px border discipline"
```
