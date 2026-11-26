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
} from 'lucide-react';
import { ViewMode, ZoomLevel } from '@/types/operations';
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
  const canSwitchView = hasImage || (isCameraOpen && isLiveFilter);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectFile(e.target.files[0]);
    }
  };

  return (
    <header className="h-13 bg-panel border-b border-panelBorder px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/bmp,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Left: Brand + Open File */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-panelBorder">
          <div className="w-6 h-6 rounded-sm bg-accent flex items-center justify-center font-bold text-white text-xs tracking-tight shadow-xs">
            12
          </div>
          <span className="font-bold text-sm tracking-tight text-textPrimary">
            Image Processing 
          </span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium bg-subtleBg hover:bg-[#F5D8E2] text-textPrimary border border-panelBorder transition shadow-xs cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-accent" />
          <span>Open Image</span>
        </button>

        <button
          type="button"
          disabled={isCameraStarting}
          onClick={onToggleCamera}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border transition shadow-xs cursor-pointer disabled:opacity-50 ${
            isCameraOpen
              ? 'bg-accent text-white border-accent hover:bg-accentHover'
              : 'bg-subtleBg hover:bg-[#F5D8E2] text-textPrimary border-panelBorder'
          }`}
        >
          <Camera className={`w-3.5 h-3.5 ${isCameraOpen ? 'text-white' : 'text-accent'}`} />
          <span>{isCameraStarting ? 'Starting...' : isCameraOpen ? 'Close Camera' : 'Use Camera'}</span>
        </button>
      </div>

      {/* Middle: Active Metadata + View Mode + Zoom */}
      <div className="flex items-center gap-3">
        {isCameraOpen ? (
          <div className="text-xs font-mono text-accent flex items-center gap-2 px-2.5 py-1 rounded-sm bg-subtleBg border border-accent/40 font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>{isLiveFilter ? 'LIVE FILTER (STATELESS)' : 'CAMERA SNAPSHOT MODE'}</span>
          </div>
        ) : metadata ? (
          <div className="text-xs font-mono text-mutedText flex items-center gap-2 px-2.5 py-1 rounded-sm bg-subtleBg border border-panelBorder">
            <span className="text-textPrimary font-medium truncate max-w-[150px]" title={metadata.filename}>
              {metadata.filename}
            </span>
            <span className="text-panelBorder">•</span>
            <span>
              {metadata.width}×{metadata.height} px
            </span>
            <span className="text-panelBorder">•</span>
            <span className="uppercase">{metadata.channels === 4 ? 'RGBA' : metadata.channels === 3 ? 'RGB' : 'GRAY'}</span>
          </div>
        ) : (
          <div className="text-xs font-mono text-mutedText/70 px-2.5 py-1 rounded-sm bg-subtleBg/50 border border-panelBorder/60">
            No active file
          </div>
        )}

        {/* View Mode Segmented Controls */}
        <div className={`flex items-center bg-subtleBg p-0.5 rounded-sm border border-panelBorder ${!canSwitchView ? 'opacity-40 pointer-events-none' : ''}`}>
          <button
            type="button"
            disabled={!canSwitchView}
            onClick={() => onSetViewMode('single')}
            title="Single View"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium transition cursor-pointer ${
              viewMode === 'single'
                ? 'bg-white text-textPrimary font-semibold shadow-xs border border-panelBorder'
                : 'text-mutedText hover:text-textPrimary'
            }`}
          >
            <Maximize2 className="w-3 h-3" />
            <span>Single</span>
          </button>
          <button
            type="button"
            disabled={!canSwitchView}
            onClick={() => onSetViewMode('side-by-side')}
            title="Side-by-Side (Original vs Processed)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium transition cursor-pointer ${
              viewMode === 'side-by-side'
                ? 'bg-white text-textPrimary font-semibold shadow-xs border border-panelBorder'
                : 'text-mutedText hover:text-textPrimary'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            disabled={!hasImage}
            onClick={() => onSetViewMode('split')}
            title="Split Slider Comparison"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium transition cursor-pointer disabled:opacity-35 disabled:pointer-events-none ${
              viewMode === 'split'
                ? 'bg-white text-textPrimary font-semibold shadow-xs border border-panelBorder'
                : 'text-mutedText hover:text-textPrimary'
            }`}
          >
            <SplitSquareVertical className="w-3 h-3" />
            <span>Split</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className={`flex items-center bg-subtleBg p-0.5 rounded-sm border border-panelBorder text-xs font-mono ${!hasImage ? 'opacity-40 pointer-events-none' : ''}`}>
          {(['fit', 0.5, 1, 2] as const).map((z) => (
            <button
              key={String(z)}
              type="button"
              disabled={!hasImage}
              onClick={() => onSetZoom(z)}
              className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${
                zoom === z
                  ? 'bg-white text-textPrimary font-semibold shadow-xs border border-panelBorder'
                  : 'text-mutedText hover:text-textPrimary'
              }`}
            >
              {z === 'fit' ? 'Fit' : `${Math.round(z * 100)}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Right: History Actions + Export */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 pr-2 border-r border-panelBorder">
          <button
            type="button"
            onClick={onUndo}
            disabled={!hasImage || !canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-sm text-mutedText hover:text-textPrimary hover:bg-subtleBg transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!hasImage || !canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-sm text-mutedText hover:text-textPrimary hover:bg-subtleBg transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasImage || !canReset}
            title="Reset to Original"
            className="p-1.5 rounded-sm text-mutedText hover:text-textPrimary hover:bg-subtleBg transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenExport}
          disabled={!hasImage}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm text-xs font-semibold bg-accent text-white hover:bg-accentHover transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save File</span>
        </button>
      </div>
    </header>
  );
};
