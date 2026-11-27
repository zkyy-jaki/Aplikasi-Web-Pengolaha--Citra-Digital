# KROMA // Lab — Technical Desktop Workbench UI Redesign Spec

## 1. Design Direction & Global Constraints
- **Visual Identity:** High-precision technical desktop workbench inspired by Figma, Linear, and Darktable.
- **Color Palette (Strictly Preserved):**
  - `canvas`: `#F3ECEF`
  - `panel`: `#FFF8FA`
  - `panelHeader`: `#FFF8FA`
  - `panelBorder`: `#EBD5DD`
  - `subtleBg`: `#FCEAF0`
  - `textPrimary`: `#2B1F24`
  - `mutedText`: `#7A636C`
  - `accent`: `#C85A7C`
  - `accentHover`: `#B3486A`
  - `accentLight`: `#FCEAF0`
- **Structural Borders & Zero Soft Shadows:** Replace all structural drop shadows (`shadow-sm`, `shadow-md`, `shadow-xs`, `shadow-lg`, `shadow-xl`) with crisp `1px solid` borders (`border-panelBorder` or `border-accent`).
- **Sharp Geometry:** Use `rounded` (`4px`) or `rounded-sm` (`2px`) maximum; eliminate pill containers and large rounded corners (`rounded-xl`, `rounded-full` on containers).
- **Typography Discipline:**
  - `font-sans` (`Inter`): UI labels, section headers, operation titles, button labels.
  - `font-mono` (`JetBrains Mono`): All technical telemetry — image dimensions, pixel coordinates (`X`, `Y`), zoom percentage, histogram statistics (`MIN`, `MAX`, `MEAN`, `STD`), timing (`ms`, `FPS`), filenames, version tag (`v1.0`), and mathematical equations / kernels.

## 2. Top Header Bar (`TopBar.tsx`)
- **Surface & Dividers:** Full-width flat surface (`h-11 bg-panel border-b border-panelBorder px-3 flex items-center justify-between`) with vertical `1px` dividers (`h-5 w-[1px] bg-panelBorder` or `border-r border-panelBorder`) separating functional clusters instead of floating pill boxes.
- **Left Cluster (Brand Identity & Active File Breadcrumb):**
  - Geometric 3×3 pixel matrix / aperture SVG logo (`16×16`) in `accent` (`#C85A7C`) + product title `KROMA // Lab` (`font-bold text-xs tracking-tight`) + version badge `v1.0` (`font-mono text-[10px] text-mutedText bg-subtleBg px-1.5 py-0.5 rounded-sm border border-panelBorder`).
  - Breadcrumb separator `/` followed by active file telemetry in `font-mono text-xs`:
    - Empty state: `belum_ada_file` (`text-mutedText/70`)
    - Camera state: `LIVE_CAMERA // STATELESS` or `CAMERA_SNAPSHOT` with pulsing 6px dot
    - Loaded state: `<filename> [W×H • RGB/RGBA/GRAY]`
  - **Conditional Source Triggers:** Hide `Open Image` and `Use Camera` buttons from the top header when in the empty state (`!metadata && !isCameraOpen`) so they do not duplicate the center dropzone actions. Once an image is loaded or camera is active, render compact `Ganti File` (or `Buka`) and `Kamera` trigger buttons after a vertical `1px` divider.
- **Center Cluster (Viewport Controls):**
  - Segmented view mode control (`Single`, `Side-by-Side`, `Split`) flush with the header geometry using `1px` borders (`border-panelBorder`, active state `bg-subtleBg border-accent text-textPrimary font-semibold`).
  - Vertical `1px` divider.
  - Compact Zoom Instrument (`- | 100% ▾ | +` and `Fit` toggle) in `font-mono text-xs`:
    - `-` button steps down (`2 -> 1 -> 0.5`), `+` button steps up (`0.5 -> 1 -> 2`, or from `'fit'` to `1`), center selector/readout shows current zoom (`FIT`, `50%`, `100%`, `200%`) with direct preset selection, plus a `Fit` quick toggle button.
- **Right Cluster (History & Export):**
  - Icon buttons for `Undo`, `Redo`, and `Reset` with tooltips and `1px` borders on hover/active, separated by a vertical `1px` divider from a single primary action button `Export` (`bg-accent hover:bg-accentHover text-white border border-accent rounded-sm px-3 py-1 text-xs font-semibold`).

## 3. Left Sidebar — Operation Panel (`LeftSidebar.tsx` & `constants/operations.ts`)
- **Quick Search Input:** Top-docked sharp input (`Cari operasi...`) with a `Search` micro-icon (`14px`) and clear (`X`) button when non-empty, filtering operations across categories in real time (case-insensitive match on `label`, `id`, or `description`).
- **Collapsible Category Accordions & Micro-Icons:**
  - Each category (`TONE & COLOR`, `BLUR FILTERS`, `DETAIL & EDGE`, `GEOMETRY`) is a collapsible accordion section (all expanded by default; auto-expanded when search query matches items inside) with a `ChevronDown` / `ChevronRight` indicator and item count badge in `font-mono text-[10px]`.
  - Every operation item displays a dedicated `14px–16px` stroke icon (`lucide-react`) beside its label.
- **Crisp Active State:** Active operation uses `rounded` (`4px`) geometry with an explicit `1px solid` border (`border border-accent bg-subtleBg text-textPrimary font-semibold`) rather than a faded background or soft shadow.

## 4. Center Canvas & Empty State (`CenterStage.tsx`)
- **Structured Technical Dropzone Container:**
  - In the empty state (`!metadata && !camera.isCameraOpen`), wrap the upload area and benchmark sample selector inside a structured technical container (`border border-dashed border-panelBorder bg-panel/90 p-6 rounded max-w-xl w-full`) with corner crosshair/technical markers or a crisp header strip (`WORKSPACE // INPUT_SOURCE`) so it does not float loosely over the dot grid.
- **Lab Specimen Benchmark Strip:**
  - Replace the 3 rounded marketing-style sample cards with a technical specimen strip (`grid grid-cols-3 gap-2`): sharp square/rectangular thumbnail (`rounded-sm border border-panelBorder`), monospace filename (`geometric_test.png`, `low_contrast.png`, `salt_pepper.png`), and compact technical tag badge (`Edge`, `HistEq`, `Median`) in `font-mono text-[10px]`.
- **Floating Bottom-Left / Bottom-Center Canvas HUD:**
  - Display live pixel coordinate telemetry (`X: — Y: —`, resolution `W × H`, zoom level, and processing latency `⚡ 0.0 ms`) in a compact monospace HUD bar (`font-mono text-[11px] bg-panel/95 border border-panelBorder px-2.5 py-1 rounded-sm`) anchored at the bottom-left of the canvas viewport.

## 5. Right Inspector & Layer-Stack Pipeline History (`RightInspector.tsx`, controls, & backend session history)
- **Vertical Space Balancing & 4-Column Monospace Stats:**
  - Reduce histogram chart height slightly (`h-24` instead of `h-28`) with zero drop shadow.
  - Arrange `MIN`, `MAX`, `MEAN`, `STD` in a compact 4-column grid (`grid-cols-4 gap-1 font-mono`) where all statistical values use `tabular-nums` monospace typography and `1px` borders (`border-panelBorder`, no `shadow-xs`).
- **Technical Equation / Kernel Specification Box:**
  - Provide an explicit `EQUATION / KERNEL` technical specification box (`bg-black/[0.03] border border-panelBorder rounded-sm p-2 font-mono text-[11px] text-textPrimary`) with a micro-header label `EQUATION / KERNEL` (`text-[9px] font-mono uppercase tracking-wider text-mutedText`) above the formula for every operation (e.g., `Y = 0.299R + 0.587G + 0.114B` for Grayscale Luminance, kernel weights or mathematical formulation for each active operation and parameter mode).
- **Expanded Layer-Stack Pipeline History (30–35% Right Sidebar Height):**
  - Allocate a fixed bottom region (`h-[34%] min-h-[210px] border-t border-panelBorder flex flex-col`) in `RightInspector` dedicated to `PIPELINE HISTORY`.
  - Render applied operations as a technical layer stack (`00 Original Image`, `01 Grayscale`, etc.) with:
    - Step index in `font-mono text-[10px]`
    - Operation name & compact parameter summary in `font-mono text-xs`
    - Per-step visibility toggle button (`Eye` / `EyeOff` icon, `14px`) for committed steps (`idx >= 1`) to temporarily mute/unmute that layer in the pipeline
    - Per-step delete button (`Trash2` icon, `14px`) for committed steps (`idx >= 1`) to remove that step and recompute the pipeline cleanly.
