import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Camera,
  FlipHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { ViewMode, ZoomLevel } from '@/types/operations';
import { WorkspaceMetadata } from '@/hooks/useImageWorkspace';
import { LiveResolution } from '@/hooks/useWebcam';
import { fetchSampleList } from '@/services/api';

const DEFAULT_SAMPLES = [
  '/api/samples/sample_geometric.png',
  '/api/samples/sample_low_contrast.png',
  '/api/samples/sample_salt_pepper.png',
];

export interface CameraViewportProps {
  isCameraOpen: boolean;
  isStarting: boolean;
  isCapturing: boolean;
  isLiveFilter: boolean;
  isMirrored: boolean;
  liveResolution: LiveResolution;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  streamResolution: { w: number; h: number } | null;
  liveProcessingMs: number;
  liveFps: number;
  onOpenCamera: () => void;
  onCloseCamera: () => void;
  onToggleLiveFilter: () => void;
  onToggleMirror: () => void;
  onSetLiveResolution: (res: LiveResolution) => void;
  onSwitchDevice: (deviceId: string) => void;
  onCaptureSnapshot: () => void;
}

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
  camera: CameraViewportProps;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  liveCanvasRef: React.RefObject<HTMLCanvasElement | null>;
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
  camera,
  videoRef,
  liveCanvasRef,
  onSelectFile,
  onLoadSample,
  onSplitChange,
  onCursorMove,
}) => {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [samples, setSamples] = useState<string[]>(DEFAULT_SAMPLES);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  // Load samples list on mount
  useEffect(() => {
    fetchSampleList()
      .then((s) => {
        if (s && s.length > 0) setSamples(s);
      })
      .catch(() => {
        setSamples(DEFAULT_SAMPLES);
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
    onCursorMove({
      x: Math.max(0, Math.min(metadata.width, x)),
      y: Math.max(0, Math.min(metadata.height, y)),
    });
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
  const zoomLabel = zoom === 'fit' ? 'FIT' : `${Math.round(zoom * 100)}%`;
  const cameraAspectRatio = camera.streamResolution
    ? `${camera.streamResolution.w} / ${camera.streamResolution.h}`
    : '16 / 9';

  return (
    <main
      className="flex-1 bg-canvas dot-grid-bg flex flex-col relative overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 bg-accent/15 border-2 border-accent border-dashed z-40 flex items-center justify-center backdrop-blur-xs pointer-events-none">
          <div className="bg-panel border border-accent p-6 rounded-sm text-center space-y-2">
            <UploadCloud className="w-10 h-10 text-accent mx-auto animate-bounce" />
            <p className="text-sm font-semibold text-textPrimary">Drop image file here</p>
            <p className="text-xs font-mono text-mutedText">Supported: PNG, JPEG, BMP, WebP</p>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {camera.isCameraOpen ? (
          /* Camera Viewport Mode (Phase 1 Snapshot & Phase 2 Stateless Live Filter) */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Compact Camera Control Bar */}
            <div className="bg-panel border-b border-panelBorder px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-subtleBg border border-accent text-[11px] font-mono font-semibold text-accent">
                  <span className="w-1.5 h-1.5 rounded-sm bg-accent animate-pulse" />
                  {camera.isLiveFilter ? 'LIVE FILTER' : 'SNAPSHOT READY'}
                </span>

                {camera.devices.length > 1 && (
                  <select
                    value={camera.selectedDeviceId}
                    onChange={(e) => camera.onSwitchDevice(e.target.value)}
                    className="bg-white border border-panelBorder rounded-sm px-2 py-1 text-xs text-textPrimary max-w-[170px] cursor-pointer focus:outline-none focus:border-accent"
                  >
                    {camera.devices.map((d, idx) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={camera.onToggleMirror}
                  title="Mirror Camera Preview"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium border transition cursor-pointer ${
                    camera.isMirrored
                      ? 'bg-subtleBg text-textPrimary border-accent font-semibold'
                      : 'bg-white text-mutedText border-panelBorder hover:text-textPrimary'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-accent" />
                  <span>Mirror</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Phase 2: Stateless Live Filter Toggle */}
                <button
                  type="button"
                  onClick={camera.onToggleLiveFilter}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium border transition cursor-pointer ${
                    camera.isLiveFilter
                      ? 'bg-subtleBg text-accent border-accent font-semibold'
                      : 'bg-white text-textPrimary border-panelBorder hover:bg-subtleBg'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Live Filter: {camera.isLiveFilter ? 'ON' : 'OFF'}</span>
                </button>

                {/* Resolution Cap Selector (visible when Live Filter is ON, locked to 320px internal width) */}
                {camera.isLiveFilter && (
                  <select
                    value={camera.liveResolution}
                    onChange={(e) =>
                      camera.onSetLiveResolution(Number(e.target.value) as LiveResolution)
                    }
                    title="Internal processing width locked at 320px max for smooth real-time convolution"
                    className="bg-white border border-panelBorder rounded-sm px-2 py-1 text-xs font-mono text-textPrimary cursor-pointer focus:outline-none focus:border-accent"
                  >
                    <option value={320}>320px (Locked Optimal)</option>
                  </select>
                )}

                {/* Phase 1: Capture Snapshot to Workspace */}
                <button
                  type="button"
                  disabled={camera.isCapturing}
                  onClick={camera.onCaptureSnapshot}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-semibold bg-accent hover:bg-accentHover text-white border border-accent transition disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{camera.isCapturing ? 'Capturing...' : 'Capture Snapshot'}</span>
                </button>

                <button
                  type="button"
                  onClick={camera.onCloseCamera}
                  title="Close Camera (Esc)"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium bg-subtleBg hover:bg-[#F5D8E2] text-textPrimary border border-panelBorder transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Camera Feed & Live Processed Canvas (never unmount <video> while camera is open) */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <div
                className={
                  camera.isLiveFilter && viewMode === 'side-by-side'
                    ? 'grid grid-cols-2 gap-4 w-full h-full items-center justify-items-center'
                    : 'w-full h-full flex items-center justify-center'
                }
              >
                {/* Raw Webcam <video> */}
                <div
                  className={
                    camera.isLiveFilter && viewMode !== 'side-by-side'
                      ? 'hidden'
                      : 'relative w-full h-full flex items-center justify-center overflow-hidden'
                  }
                >
                  <div
                    data-testid="raw-camera-frame"
                    style={{ aspectRatio: cameraAspectRatio }}
                    className="relative w-full max-w-full max-h-[calc(100vh-12rem)] aspect-video rounded-sm border border-panelBorder overflow-hidden bg-black/5 flex items-center justify-center"
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`block w-full h-full object-contain ${
                        camera.isMirrored ? 'scale-x-[-1]' : ''
                      }`}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-sm bg-white/95 text-[10px] font-mono text-textPrimary border border-panelBorder font-semibold uppercase">
                      {camera.isLiveFilter ? 'Original Camera' : 'Live Preview'}
                    </div>
                  </div>
                </div>

                {/* Live Filtered <canvas> */}
                <div
                  className={
                    !camera.isLiveFilter
                      ? 'hidden'
                      : 'relative w-full h-full flex items-center justify-center overflow-hidden'
                  }
                >
                  <div
                    data-testid="live-filtered-frame"
                    style={{ aspectRatio: cameraAspectRatio }}
                    className="relative w-full max-w-full max-h-[calc(100vh-12rem)] aspect-video rounded-sm border border-panelBorder overflow-hidden bg-black/5 flex items-center justify-center"
                  >
                    <canvas
                      ref={liveCanvasRef}
                      className="block w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-sm bg-accent text-[10px] font-mono text-white border border-accent font-semibold uppercase">
                      Live Filtered
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
            {!metadata ? (
              /* Structured Technical Dropzone Container */
              <div className="w-full max-w-xl bg-panel/95 border border-dashed border-panelBorder rounded p-6 space-y-5">
                {/* Technical Instrument Header Strip */}
                <div className="flex items-center justify-between border-b border-panelBorder pb-2 text-[10px] font-mono text-mutedText uppercase tracking-wider">
                  <span>WORKSPACE // INPUT_SOURCE</span>
                  <span>MAX SIZE FILE: 10MB</span>
                </div>

                <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
                  <div className="w-11 h-11 rounded-sm bg-subtleBg border border-panelBorder flex items-center justify-center text-accent">
                    <ImageIcon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-textPrimary tracking-tight">
                      Digital Image Processing Workbench
                    </h2>
                    <p className="text-xs text-mutedText max-w-sm">
                      Drag and drop an image file into this dropzone, browse from local storage, or initialize live camera capture.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-2.5">
                      <label className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent hover:bg-accentHover text-white text-xs font-semibold rounded-sm border border-accent cursor-pointer transition">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Open Image</span>
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

                      <button
                        type="button"
                        disabled={camera.isStarting}
                        onClick={camera.onOpenCamera}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-subtleBg text-textPrimary text-xs font-semibold rounded-sm border border-panelBorder hover:border-accent cursor-pointer transition disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5 text-accent" />
                        <span>{camera.isStarting ? 'Starting...' : 'Use Camera'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-mutedText mt-2 font-mono">
                      FORMATS: PNG • JPEG • BMP • WEBP 
                    </p>
                  </div>
                </div>

                {/* Lab Specimen Benchmark Strip */}
                <div className="pt-3 border-t border-panelBorder w-full space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-mutedText uppercase tracking-wider">
                    <span>GAMBAR SAMPEL</span>
                    <span>3 PRESETS</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {samples.map((sampleUrl) => {
                      const isGeo = sampleUrl.includes('geometric');
                      const isLow = sampleUrl.includes('low_contrast');
                      const specimenFile = isGeo
                        ? 'geometric_test.png'
                        : isLow
                        ? 'low_contrast.png'
                        : 'salt_pepper.png';
                      const tag = isGeo ? 'Edge' : isLow ? 'HistEq' : 'Median';

                      return (
                        <button
                          key={sampleUrl}
                          type="button"
                          onClick={() => onLoadSample(sampleUrl)}
                          className="group flex items-center gap-2 p-1.5 rounded-sm bg-white hover:bg-subtleBg/60 border border-panelBorder hover:border-accent transition text-left cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-sm overflow-hidden border border-panelBorder bg-subtleBg shrink-0 flex items-center justify-center">
                            <img
                              src={sampleUrl}
                              alt={specimenFile}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block text-[11px] font-mono font-semibold text-textPrimary group-hover:text-accent truncate">
                              {specimenFile}
                            </span>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-sm bg-subtleBg border border-panelBorder text-[9px] font-mono font-semibold text-accent uppercase">
                              {tag}
                            </span>
                          </div>
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
                    <div className="checkerboard-bg rounded-sm border border-panelBorder overflow-hidden flex items-center justify-center">
                      <img
                        src={processedSrc}
                        alt="Processed"
                        onMouseMove={handleImageMouseMove}
                        onMouseLeave={handleImageMouseLeave}
                        style={getZoomStyle()}
                        className="block"
                      />
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-sm bg-accent text-[10px] font-mono text-white border border-accent font-semibold uppercase">
                      Processed
                    </div>
                  </div>
                )}

                {/* View Mode: Side-by-Side */}
                {viewMode === 'side-by-side' && (
                  <div className="grid grid-cols-2 gap-4 w-full h-full p-2 items-center">
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <div className="checkerboard-bg rounded-sm border border-panelBorder overflow-hidden flex items-center justify-center max-w-full max-h-full">
                        <img
                          src={originalSrc}
                          alt="Original"
                          onMouseMove={handleImageMouseMove}
                          onMouseLeave={handleImageMouseLeave}
                          style={getZoomStyle()}
                          className="block"
                        />
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-sm bg-white/95 text-[10px] font-mono text-textPrimary border border-panelBorder font-semibold uppercase">
                        Original
                      </div>
                    </div>

                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <div className="checkerboard-bg rounded-sm border border-panelBorder overflow-hidden flex items-center justify-center max-w-full max-h-full">
                        <img
                          src={processedSrc}
                          alt="Processed"
                          onMouseMove={handleImageMouseMove}
                          onMouseLeave={handleImageMouseLeave}
                          style={getZoomStyle()}
                          className="block"
                        />
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-sm bg-accent text-[10px] font-mono text-white border border-accent font-semibold uppercase">
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
                    <div className="checkerboard-bg rounded-sm border border-panelBorder overflow-hidden relative">
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

                      {/* Vertical 1px Divider Line */}
                      <div
                        className="absolute top-0 bottom-0 w-[1px] bg-accent cursor-ew-resize z-20"
                        style={{ left: `${splitPosition}%` }}
                        onMouseDown={handleSplitMouseDown}
                      >
                        {/* Technical Square Center Handle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-sm bg-white border border-accent flex items-center justify-center">
                          <div className="flex gap-0.5">
                            <div className="w-0.5 h-2.5 bg-accent" />
                            <div className="w-0.5 h-2.5 bg-accent" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Corner Labels */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-sm bg-white/95 text-[10px] font-mono text-textPrimary border border-panelBorder font-semibold uppercase">
                      Original
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-sm bg-accent text-[10px] font-mono text-white border border-accent font-semibold uppercase">
                      Processed
                    </div>
                  </div>
                )}

                {/* Floating Monospace Telemetry HUD (Bottom-Left of Canvas) */}
                <div className="absolute bottom-2 left-2 z-20 bg-panel/95 border border-panelBorder rounded-sm px-2.5 py-1 flex items-center gap-3 text-[11px] font-mono text-mutedText">
                  <span>
                    X:{' '}
                    <span className="text-textPrimary font-semibold">
                      {cursorPos.x !== null ? `${cursorPos.x}px` : '—'}
                    </span>{' '}
                    Y:{' '}
                    <span className="text-textPrimary font-semibold">
                      {cursorPos.y !== null ? `${cursorPos.y}px` : '—'}
                    </span>
                  </span>
                  <span className="text-panelBorder">|</span>
                  <span>
                    DIM:{' '}
                    <span className="text-textPrimary font-semibold">
                      {metadata.width}×{metadata.height}
                    </span>
                  </span>
                  <span className="text-panelBorder">|</span>
                  <span>
                    ZOOM: <span className="text-textPrimary font-semibold">{zoomLabel}</span>
                  </span>
                  {(isProcessing || processingTimeMs > 0) && (
                    <>
                      <span className="text-panelBorder">|</span>
                      {isProcessing ? (
                        <span className="flex items-center gap-1.5 text-accent animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-sm bg-accent" />
                          <span>PROC...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-accent font-semibold">
                          <span>⚡</span>
                          <span>{processingTimeMs.toFixed(1)} ms</span>
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Technical Status Strip (Camera & Empty State Telemetry) */}
      <footer className="h-6 bg-panel border-t border-panelBorder px-3 flex items-center justify-between text-[10px] font-mono text-mutedText shrink-0">
        {camera.isCameraOpen ? (
          <>
            <div className="flex items-center gap-3">
              <span>
                STREAM:{' '}
                <span className="text-textPrimary font-semibold">
                  {camera.streamResolution
                    ? `${camera.streamResolution.w}×${camera.streamResolution.h}`
                    : 'INIT...'}
                </span>
              </span>
              {camera.isLiveFilter && (
                <>
                  <span className="text-panelBorder">|</span>
                  <span>
                    CAP:{' '}
                    <span className="text-textPrimary font-semibold">
                      {camera.liveResolution === 1920 ? '1080p' : `${camera.liveResolution}px`}
                    </span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {camera.isLiveFilter ? (
                <span className="flex items-center gap-2 text-accent font-semibold">
                  <span>{camera.liveFps} FPS</span>
                  <span className="text-panelBorder">|</span>
                  <span>⚡ {camera.liveProcessingMs.toFixed(1)} ms/frame</span>
                </span>
              ) : (
                <span className="text-mutedText">MODE: SNAPSHOT_READY</span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span>
                CURSOR:{' '}
                <span className="text-textPrimary font-semibold">
                  {cursorPos.x !== null && cursorPos.y !== null
                    ? `${cursorPos.x}, ${cursorPos.y}`
                    : '—'}
                </span>
              </span>
              <span className="text-panelBorder">|</span>
              <span>
                VIEWPORT: <span className="text-textPrimary font-semibold uppercase">{viewMode}</span>
              </span>
            </div>
            <div>
              <span>ENGINE: NUMPY_CV2 // PRECISION: UINT8_16BIT_CLAMP</span>
            </div>
          </>
        )}
      </footer>
    </main>
  );
};
