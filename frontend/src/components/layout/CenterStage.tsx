import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ViewMode, ZoomLevel } from '@/types/operations';
import { WorkspaceMetadata } from '@/hooks/useImageWorkspace';
import { fetchSampleList } from '@/services/api';

interface CenterStageProps {
  metadata: WorkspaceMetadata | null;
  originalPreviewB64: string | null;
  livePreviewB64: string | null;
  viewMode: ViewMode;
  zoom: ZoomLevel;
  splitPosition: number;
  cursorPos: { x: number | null; y: number | null };
  processingTimeMs: number;
  isProcessing: boolean;
  onSelectFile: (file: File) => void;
  onLoadSample: (url: string) => void;
  onSplitChange: (pos: number) => void;
  onCursorMove: (coords: { x: number | null; y: number | null }) => void;
}

export const CenterStage: React.FC<CenterStageProps> = ({
  metadata,
  originalPreviewB64,
  livePreviewB64,
  viewMode,
  zoom,
  splitPosition,
  cursorPos,
  processingTimeMs,
  isProcessing,
  onSelectFile,
  onLoadSample,
  onSplitChange,
  onCursorMove,
}) => {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [samples, setSamples] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  // Load samples list on mount
  useEffect(() => {
    fetchSampleList()
      .then((s) => setSamples(s))
      .catch(() => {
        // Fallback sample paths
        setSamples([
          '/api/samples/sample_salt_pepper.png',
          '/api/samples/sample_low_contrast.png',
          '/api/samples/sample_geometric.png',
        ]);
      });
  }, []);

  // Split-slider drag handlers
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);
  };

  const handleSplitMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingSplit || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onSplitChange(pct);
    },
    [isResizingSplit, onSplitChange]
  );

  const handleSplitMouseUp = useCallback(() => {
    setIsResizingSplit(false);
  }, []);

  useEffect(() => {
    if (isResizingSplit) {
      window.addEventListener('mousemove', handleSplitMouseMove);
      window.addEventListener('mouseup', handleSplitMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleSplitMouseMove);
      window.removeEventListener('mouseup', handleSplitMouseUp);
    };
  }, [isResizingSplit, handleSplitMouseMove, handleSplitMouseUp]);

  // Track cursor coordinates on image
  const handleImageMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!metadata) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * metadata.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * metadata.height);
    onCursorMove({ x: Math.max(0, Math.min(metadata.width, x)), y: Math.max(0, Math.min(metadata.height, y)) });
  };

  const handleImageMouseLeave = () => {
    onCursorMove({ x: null, y: null });
  };

  // Drag and drop file handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onSelectFile(e.dataTransfer.files[0]);
    }
  };

  // Zoom scale styling
  const getZoomStyle = () => {
    if (zoom === 'fit') {
      return { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const };
    }
    return {
      transform: `scale(${zoom})`,
      transformOrigin: 'center center',
      transition: 'transform 0.15s ease-out',
    };
  };

  const originalSrc = originalPreviewB64 ? `data:image/png;base64,${originalPreviewB64}` : '';
  const processedSrc = livePreviewB64 ? `data:image/png;base64,${livePreviewB64}` : originalSrc;

  return (
    <main
      className="flex-1 bg-canvas flex flex-col relative overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 bg-accent/20 border-2 border-accent border-dashed z-40 flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <div className="bg-panel border border-accent p-6 rounded-lg shadow-xl text-center space-y-2">
            <UploadCloud className="w-10 h-10 text-accent mx-auto animate-bounce" />
            <p className="text-sm font-semibold text-white">Lepaskan Berkas Citra di Sini</p>
            <p className="text-xs text-mutedText">Format didukung: PNG, JPEG, BMP, WebP</p>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {!metadata ? (
          /* Empty State: Upload Zone + Sample Buttons */
          <div className="max-w-md w-full bg-panel border border-panelBorder rounded-xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-subtleBg border border-panelBorder flex items-center justify-center mx-auto text-accent">
              <ImageIcon className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-white tracking-wide">
                Eksperimen Pengolahan Citra Digital
              </h2>
              <p className="text-xs text-mutedText leading-relaxed">
                Tarik dan lepaskan gambar ke sini, atau klik tombol di bawah untuk memuat citra lokal.
              </p>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accentHover text-white text-xs font-semibold rounded cursor-pointer transition shadow-md">
                <UploadCloud className="w-4 h-4" />
                <span>Pilih Gambar dari Komputer</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/bmp,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onSelectFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-mutedText mt-2">Maksimal 10 MB • PNG, JPEG, BMP, WebP</p>
            </div>

            {/* Built-in Samples Quick Pick */}
            <div className="pt-4 border-t border-panelBorder space-y-2.5">
              <div className="flex items-center justify-center gap-1.5 text-xs text-mutedText font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Atau Coba Gambar Sampel Bawaan</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-left">
                {samples.map((sampleUrl) => {
                  const label = sampleUrl.includes('salt_pepper')
                    ? 'Salt & Pepper'
                    : sampleUrl.includes('low_contrast')
                    ? 'Low Contrast'
                    : 'Geometric';
                  const desc = sampleUrl.includes('salt_pepper')
                    ? 'Uji Median Blur'
                    : sampleUrl.includes('low_contrast')
                    ? 'Uji Equalization'
                    : 'Uji Edge & Sobel';

                  return (
                    <button
                      key={sampleUrl}
                      type="button"
                      onClick={() => onLoadSample(sampleUrl)}
                      className="p-2.5 rounded bg-subtleBg hover:bg-[#2A2D34] border border-panelBorder transition text-left group"
                    >
                      <span className="block text-xs font-semibold text-white group-hover:text-accent truncate">
                        {label}
                      </span>
                      <span className="block text-[10px] text-mutedText mt-0.5 truncate">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Active Image Canvas */
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            {/* View Mode: Single */}
            {viewMode === 'single' && (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <div className="checkerboard-bg rounded border border-panelBorder shadow-2xl overflow-hidden flex items-center justify-center">
                  <img
                    src={processedSrc}
                    alt="Processed"
                    onMouseMove={handleImageMouseMove}
                    onMouseLeave={handleImageMouseLeave}
                    style={getZoomStyle()}
                    className="block"
                  />
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white border border-white/10 uppercase">
                  Processed
                </div>
              </div>
            )}

            {/* View Mode: Side-by-Side */}
            {viewMode === 'side-by-side' && (
              <div className="grid grid-cols-2 gap-4 w-full h-full p-2 items-center">
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="checkerboard-bg rounded border border-panelBorder shadow-2xl overflow-hidden flex items-center justify-center max-w-full max-h-full">
                    <img
                      src={originalSrc}
                      alt="Original"
                      onMouseMove={handleImageMouseMove}
                      onMouseLeave={handleImageMouseLeave}
                      style={getZoomStyle()}
                      className="block"
                    />
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white border border-white/10 uppercase">
                    Original
                  </div>
                </div>

                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="checkerboard-bg rounded border border-panelBorder shadow-2xl overflow-hidden flex items-center justify-center max-w-full max-h-full">
                    <img
                      src={processedSrc}
                      alt="Processed"
                      onMouseMove={handleImageMouseMove}
                      onMouseLeave={handleImageMouseLeave}
                      style={getZoomStyle()}
                      className="block"
                    />
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-accent/80 backdrop-blur-sm text-[10px] font-mono text-white border border-accent/30 uppercase">
                    Processed
                  </div>
                </div>
              </div>
            )}

            {/* View Mode: Split Slider */}
            {viewMode === 'split' && (
              <div
                ref={containerRef}
                className="relative max-w-full max-h-full flex items-center justify-center select-none"
              >
                <div className="checkerboard-bg rounded border border-panelBorder shadow-2xl overflow-hidden relative">
                  {/* Bottom: Processed Image */}
                  <img
                    src={processedSrc}
                    alt="Processed"
                    onMouseMove={handleImageMouseMove}
                    onMouseLeave={handleImageMouseLeave}
                    style={getZoomStyle()}
                    className="block"
                  />

                  {/* Top Layer: Original Image (Clipped) */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{
                      clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
                    }}
                  >
                    <img
                      src={originalSrc}
                      alt="Original"
                      style={getZoomStyle()}
                      className="block max-w-full max-h-full"
                    />
                  </div>

                  {/* Vertical 1px White Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-white cursor-ew-resize z-20"
                    style={{ left: `${splitPosition}%` }}
                    onMouseDown={handleSplitMouseDown}
                  >
                    {/* Small Circular Center Handle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg border border-black/20 flex items-center justify-center">
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-2 bg-black/40 rounded-full" />
                        <div className="w-0.5 h-2 bg-black/40 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corner Labels */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white border border-white/10 uppercase">
                  Original
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-accent/80 backdrop-blur-sm text-[10px] font-mono text-white border border-accent/30 uppercase">
                  Processed
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Minimal Bottom Status Bar */}
      <footer className="h-7 bg-panelHeader border-t border-panelBorder px-4 flex items-center justify-between text-[11px] font-mono text-mutedText shrink-0">
        <div className="flex items-center gap-4">
          <span>
            X:{' '}
            <span className="text-white">
              {cursorPos.x !== null ? `${cursorPos.x}px` : '—'}
            </span>{' '}
            Y:{' '}
            <span className="text-white">
              {cursorPos.y !== null ? `${cursorPos.y}px` : '—'}
            </span>
          </span>
          {metadata && (
            <>
              <span className="text-panelBorder">•</span>
              <span>
                Resolusi:{' '}
                <span className="text-white">
                  {metadata.width} × {metadata.height}
                </span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isProcessing ? (
            <span className="flex items-center gap-1.5 text-accent animate-pulse">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>Memproses...</span>
            </span>
          ) : processingTimeMs > 0 ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <span>⚡</span>
              <span>{processingTimeMs.toFixed(1)} ms</span>
            </span>
          ) : null}
        </div>
      </footer>
    </main>
  );
};
