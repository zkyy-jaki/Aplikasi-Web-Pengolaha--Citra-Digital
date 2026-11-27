import React, { useRef } from 'react';
import {
  FolderOpen,
  Camera,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Maximize2,
  Columns,
  SplitSquareVertical,
  Minus,
  Plus,
} from 'lucide-react';
import { ViewMode, ZoomLevel } from '@/types/operations';
import { stepZoomLevel } from '@/constants/operations';
import { WorkspaceMetadata } from '@/hooks/useImageWorkspace';

interface TopBarProps {
  metadata: WorkspaceMetadata | null;
  isCameraOpen: boolean;
  isCameraStarting: boolean;
  isLiveFilter: boolean;
  viewMode: ViewMode;
  zoom: ZoomLevel;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  onSelectFile: (file: File) => void;
  onToggleCamera: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onSetZoom: (zoom: ZoomLevel) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onOpenExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  metadata,
  isCameraOpen,
  isCameraStarting,
  isLiveFilter,
  viewMode,
  zoom,
  canUndo,
  canRedo,
  canReset,
  onSelectFile,
  onToggleCamera,
  onSetViewMode,
  onSetZoom,
  onUndo,
  onRedo,
  onReset,
  onOpenExport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasImage = !!metadata && !isCameraOpen;
  const hasActiveSource = !!metadata || isCameraOpen;
  const canSwitchView = hasImage || (isCameraOpen && isLiveFilter);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectFile(e.target.files[0]);
    }
  };

  const handleZoomSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'fit') {
      onSetZoom('fit');
    } else {
      onSetZoom(Number(val) as ZoomLevel);
    }
  };

  const channelLabel = metadata
    ? metadata.channels === 4
      ? 'RGBA'
      : metadata.channels === 3
      ? 'RGB'
      : 'GRAY'
    : '';

  return (
    <header className="h-11 bg-panel border-b border-panelBorder px-3 flex items-center justify-between select-none z-30 shrink-0">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/bmp,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Left Cluster: Brand Identity + Active File Breadcrumb + Conditional Source Triggers */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Geometric 3x3 Pixel Matrix Logo + Product Title + Version Tag */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-subtleBg border border-accent flex items-center justify-center shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-accent"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="3" height="3" fill="currentColor" />
              <rect x="5.5" y="1" width="3" height="3" fill="currentColor" opacity="0.55" />
              <rect x="10" y="1" width="3" height="3" fill="currentColor" />
              <rect x="1" y="5.5" width="3" height="3" fill="currentColor" opacity="0.55" />
              <rect x="5.5" y="5.5" width="3" height="3" fill="currentColor" />
              <rect x="10" y="5.5" width="3" height="3" fill="currentColor" opacity="0.55" />
              <rect x="1" y="10" width="3" height="3" fill="currentColor" />
              <rect x="5.5" y="10" width="3" height="3" fill="currentColor" opacity="0.55" />
              <rect x="10" y="10" width="3" height="3" fill="currentColor" />
            </svg>
          </div>
          <span className="font-sans font-bold text-xs tracking-tight text-textPrimary whitespace-nowrap">
            KELOMPOK 12 
          </span>
          <span className="font-mono text-[10px] text-mutedText bg-subtleBg px-1.5 py-0.5 rounded-sm border border-panelBorder leading-none">
            PENGOLAHAN CITRA 
          </span>
        </div>

        {/* Slash Breadcrumb Separator */}
        <span className="font-mono text-xs text-panelBorder select-none">/</span>

        {/* Active File / Camera Status Telemetry */}
        {isCameraOpen ? (
          <div className="text-xs font-mono text-accent flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-subtleBg border border-accent font-semibold">
            <span className="w-1.5 h-1.5 rounded-sm bg-accent animate-pulse" />
            <span>{isLiveFilter ? 'LIVE_FILTER // STATELESS' : 'CAMERA_SNAPSHOT'}</span>
          </div>
        ) : metadata ? (
          <div className="text-xs font-mono flex items-center gap-1.5 min-w-0">
            <span
              className="text-textPrimary font-semibold truncate max-w-[160px]"
              title={metadata.filename}
            >
              {metadata.filename}
            </span>
            <span className="text-mutedText whitespace-nowrap">
              [{metadata.width}×{metadata.height} • {channelLabel}]
            </span>
          </div>
        ) : (
          <span className="text-xs font-mono text-mutedText/70">BELUM ADA FILE</span>
        )}

        {/* Conditional Compact Source Triggers (Hidden in Empty State) */}
        {hasActiveSource && (
          <>
            <div className="h-5 w-[1px] bg-panelBorder mx-0.5" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Ganti File Citra"
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium bg-white hover:bg-subtleBg text-textPrimary border border-panelBorder transition cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-accent" />
              <span>Ganti</span>
            </button>
            <button
              type="button"
              disabled={isCameraStarting}
              onClick={onToggleCamera}
              title={isCameraOpen ? 'Tutup Kamera' : 'Gunakan Kamera'}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium border transition cursor-pointer disabled:opacity-50 ${
                isCameraOpen
                  ? 'bg-accent text-white border-accent hover:bg-accentHover'
                  : 'bg-white hover:bg-subtleBg text-textPrimary border-panelBorder'
              }`}
            >
              <Camera className={`w-3.5 h-3.5 ${isCameraOpen ? 'text-white' : 'text-accent'}`} />
              <span>
                {isCameraStarting ? 'Starting...' : isCameraOpen ? 'Tutup Kamera' : 'Kamera'}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Center Cluster: Viewport Mode Segmented Control | Compact Zoom Instrument */}
      <div className="flex items-center gap-2.5">
        {/* View Mode Segmented Controls */}
        <div
          className={`flex items-center bg-white rounded-sm border border-panelBorder divide-x divide-panelBorder overflow-hidden ${
            !canSwitchView ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <button
            type="button"
            disabled={!canSwitchView}
            onClick={() => onSetViewMode('single')}
            title="Single View"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition cursor-pointer ${
              viewMode === 'single'
                ? 'bg-subtleBg text-textPrimary font-semibold'
                : 'text-mutedText hover:text-textPrimary hover:bg-subtleBg/40'
            }`}
          >
            <Maximize2 className="w-3 h-3 text-accent" />
            <span>Single</span>
          </button>
          <button
            type="button"
            disabled={!canSwitchView}
            onClick={() => onSetViewMode('side-by-side')}
            title="Side-by-Side (Original vs Processed)"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition cursor-pointer ${
              viewMode === 'side-by-side'
                ? 'bg-subtleBg text-textPrimary font-semibold'
                : 'text-mutedText hover:text-textPrimary hover:bg-subtleBg/40'
            }`}
          >
            <Columns className="w-3 h-3 text-accent" />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            disabled={!hasImage}
            onClick={() => onSetViewMode('split')}
            title="Split Slider Comparison"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition cursor-pointer disabled:opacity-35 disabled:pointer-events-none ${
              viewMode === 'split'
                ? 'bg-subtleBg text-textPrimary font-semibold'
                : 'text-mutedText hover:text-textPrimary hover:bg-subtleBg/40'
            }`}
          >
            <SplitSquareVertical className="w-3 h-3 text-accent" />
            <span>Split</span>
          </button>
        </div>

        {/* 1px Vertical Divider */}
        <div className="h-5 w-[1px] bg-panelBorder" />

        {/* Compact Zoom Instrument: - | 100% ▾ | + | Fit */}
        <div
          className={`flex items-center bg-white rounded-sm border border-panelBorder divide-x divide-panelBorder text-xs font-mono overflow-hidden ${
            !hasImage ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <button
            type="button"
            aria-label="Zoom Out"
            title="Zoom Out"
            disabled={!hasImage || zoom === 0.5}
            onClick={() => onSetZoom(stepZoomLevel(zoom, 'out'))}
            className="px-1.5 py-1 text-mutedText hover:text-textPrimary hover:bg-subtleBg/50 transition disabled:opacity-30 cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>

          <select
            aria-label="Zoom Preset"
            disabled={!hasImage}
            value={String(zoom)}
            onChange={handleZoomSelectChange}
            className="bg-transparent px-2 py-0.5 text-xs font-mono font-semibold text-textPrimary focus:outline-none cursor-pointer"
          >
            <option value="fit">FIT</option>
            <option value="0.5">50%</option>
            <option value="1">100%</option>
            <option value="2">200%</option>
          </select>

          <button
            type="button"
            aria-label="Zoom In"
            title="Zoom In"
            disabled={!hasImage || zoom === 2}
            onClick={() => onSetZoom(stepZoomLevel(zoom, 'in'))}
            className="px-1.5 py-1 text-mutedText hover:text-textPrimary hover:bg-subtleBg/50 transition disabled:opacity-30 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>

          <button
            type="button"
            disabled={!hasImage}
            onClick={() => onSetZoom('fit')}
            title="Fit to Viewport"
            className={`px-2 py-0.5 text-[11px] font-mono transition cursor-pointer ${
              zoom === 'fit'
                ? 'bg-subtleBg text-accent font-bold'
                : 'text-mutedText hover:text-textPrimary hover:bg-subtleBg/40'
            }`}
          >
            Fit
          </button>
        </div>
      </div>

      {/* Right Cluster: History Actions | Export */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!hasImage || !canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-sm border border-transparent text-mutedText hover:text-textPrimary hover:bg-subtleBg hover:border-panelBorder transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!hasImage || !canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-sm border border-transparent text-mutedText hover:text-textPrimary hover:bg-subtleBg hover:border-panelBorder transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasImage || !canReset}
            title="Reset to Original"
            className="p-1.5 rounded-sm border border-transparent text-mutedText hover:text-textPrimary hover:bg-subtleBg hover:border-panelBorder transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1px Vertical Divider */}
        <div className="h-5 w-[1px] bg-panelBorder" />

        <button
          type="button"
          onClick={onOpenExport}
          disabled={!hasImage}
          className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-semibold bg-accent text-white border border-accent hover:bg-accentHover transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
