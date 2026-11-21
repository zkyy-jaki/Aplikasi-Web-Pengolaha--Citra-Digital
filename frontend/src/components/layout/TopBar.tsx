import React, { useRef } from 'react';
import {
  FolderOpen,
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
  viewMode: ViewMode;
  zoom: ZoomLevel;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  onSelectFile: (file: File) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onSetZoom: (zoom: ZoomLevel) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onOpenExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  metadata,
  viewMode,
  zoom,
  canUndo,
  canRedo,
  canReset,
  onSelectFile,
  onSetViewMode,
  onSetZoom,
  onUndo,
  onRedo,
  onReset,
  onOpenExport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectFile(e.target.files[0]);
    }
  };

  return (
    <header className="h-14 bg-panel border-b border-panelBorder px-4 flex items-center justify-between select-none z-30 shrink-0">
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
        <div className="flex items-center gap-2 pr-2 border-r border-panelBorder">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center font-bold text-white text-xs tracking-tighter">
            PC
          </div>
          <span className="font-bold text-sm tracking-wide text-white">
            PCD Studio
          </span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-subtleBg hover:bg-[#2A2D34] text-white border border-panelBorder transition"
        >
          <FolderOpen className="w-3.5 h-3.5 text-accent" />
          <span>Open File</span>
        </button>
      </div>

      {/* Middle: Active Metadata + View Mode + Zoom */}
      <div className="flex items-center gap-4">
        {metadata && (
          <div className="text-xs font-mono text-mutedText flex items-center gap-2 px-2.5 py-1 rounded bg-subtleBg/70 border border-panelBorder">
            <span className="text-white font-medium truncate max-w-[140px]" title={metadata.filename}>
              {metadata.filename}
            </span>
            <span className="text-panelBorder">•</span>
            <span>
              {metadata.width}×{metadata.height} px
            </span>
            <span className="text-panelBorder">•</span>
            <span className="uppercase">{metadata.channels === 4 ? 'RGBA' : metadata.channels === 3 ? 'RGB' : 'GRAY'}</span>
          </div>
        )}

        {/* View Mode Segmented Controls */}
        <div className="flex items-center bg-subtleBg p-0.5 rounded border border-panelBorder">
          <button
            type="button"
            onClick={() => onSetViewMode('single')}
            title="Tampilan Tunggal"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              viewMode === 'single'
                ? 'bg-[#2A2D34] text-white shadow-sm'
                : 'text-mutedText hover:text-white'
            }`}
          >
            <Maximize2 className="w-3 h-3" />
            <span>Single</span>
          </button>
          <button
            type="button"
            onClick={() => onSetViewMode('side-by-side')}
            title="Berdampingan (Original vs Processed)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              viewMode === 'side-by-side'
                ? 'bg-[#2A2D34] text-white shadow-sm'
                : 'text-mutedText hover:text-white'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            onClick={() => onSetViewMode('split')}
            title="Split Slider Pembanding"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              viewMode === 'split'
                ? 'bg-[#2A2D34] text-white shadow-sm'
                : 'text-mutedText hover:text-white'
            }`}
          >
            <SplitSquareVertical className="w-3 h-3" />
            <span>Split</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-subtleBg p-0.5 rounded border border-panelBorder text-xs font-mono">
          {(['fit', 0.5, 1, 2] as const).map((z) => (
            <button
              key={String(z)}
              type="button"
              onClick={() => onSetZoom(z)}
              className={`px-2 py-0.5 rounded transition ${
                zoom === z
                  ? 'bg-[#2A2D34] text-white font-medium'
                  : 'text-mutedText hover:text-white'
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
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded text-mutedText hover:text-white hover:bg-subtleBg transition disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded text-mutedText hover:text-white hover:bg-subtleBg transition disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            title="Reset ke Citra Awal"
            className="p-1.5 rounded text-mutedText hover:text-white hover:bg-subtleBg transition disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenExport}
          disabled={!metadata}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-white text-black hover:bg-gray-200 transition disabled:opacity-40 disabled:hover:bg-white"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save File</span>
        </button>
      </div>
    </header>
  );
};
