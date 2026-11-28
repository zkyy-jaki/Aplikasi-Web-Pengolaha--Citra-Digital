import { useCallback, useEffect, useRef, useState } from 'react';
import { AppApiError, processLiveFrame } from '@/services/api';
import { AnyOperationParams, HistogramResult, OperationType } from '@/types/operations';
import {
  LIVE_FILTER_MAX_WIDTH,
  LIVE_HISTOGRAM_THROTTLE_MS,
  computeHistogramFromImageData,
  computeLiveFilterDimensions,
} from '@/utils/liveHistogram';

export type LiveResolution = 320 | 480 | 640 | 1920;

interface UseWebcamOptions {
  activeOp: OperationType;
  draftParams: AnyOperationParams;
  onSnapshotCaptured: (file: File) => Promise<void>;
  onError: (err: { title: string; detail?: string | null }) => void;
  onOtsuDetected?: (t: number | null) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

const MIN_FRAME_INTERVAL_MS = 66; // ~15 FPS cap to keep CPU & network smooth

function mapCameraError(err: unknown): { title: string; detail: string } {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          title: 'Camera permission denied',
          detail: 'Please allow camera access in your browser site settings and try again.',
        };
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          title: 'No camera detected',
          detail: 'Connect a webcam to your device and retry.',
        };
      case 'NotReadableError':
      case 'TrackStartError':
        return {
          title: 'Camera is currently in use',
          detail: 'Close other applications using the webcam (e.g. Zoom/Meet) and try again.',
        };
      default:
        return {
          title: 'Unable to access camera',
          detail: err.message || err.name,
        };
    }
  }
  if (err instanceof Error) {
    return { title: 'Unable to access camera', detail: err.message };
  }
  return { title: 'Unable to access camera', detail: 'Unknown camera error' };
}

export function useWebcam({
  activeOp,
  draftParams,
  onSnapshotCaptured,
  onError,
  onOtsuDetected,
  onOpenChange,
}: UseWebcamOptions) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLiveFilter, setIsLiveFilter] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [liveResolution, setLiveResolution] = useState<LiveResolution>(LIVE_FILTER_MAX_WIDTH);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [streamResolution, setStreamResolution] = useState<{ w: number; h: number } | null>(null);
  const [liveProcessingMs, setLiveProcessingMs] = useState<number>(0);
  const [liveFps, setLiveFps] = useState<number>(0);
  const [liveOriginalHistogram, setLiveOriginalHistogram] = useState<HistogramResult | null>(null);
  const [liveCurrentHistogram, setLiveCurrentHistogram] = useState<HistogramResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Refs for live processing loop to avoid restarting loop on every slider tick
  const activeOpRef = useRef(activeOp);
  const draftParamsRef = useRef(draftParams);
  const isMirroredRef = useRef(isMirrored);
  const liveResRef = useRef(liveResolution);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeOpRef.current = activeOp;
  }, [activeOp]);

  useEffect(() => {
    draftParamsRef.current = draftParams;
  }, [draftParams]);

  useEffect(() => {
    isMirroredRef.current = isMirrored;
  }, [isMirrored]);

  useEffect(() => {
    liveResRef.current = liveResolution;
  }, [liveResolution]);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    inFlightRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopStream();
    setIsCameraOpen(false);
    onOpenChange?.(false);
    setIsLiveFilter(false);
    setStreamResolution(null);
    setLiveFps(0);
    setLiveProcessingMs(0);
    setLiveOriginalHistogram(null);
    setLiveCurrentHistogram(null);
  }, [onOpenChange, stopStream]);

  const startStream = useCallback(
    async (deviceId?: string) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError({
          title: 'Camera API unavailable',
          detail: 'Browser requires HTTPS or localhost to access webcam devices.',
        });
        return;
      }

      setIsStarting(true);
      stopStream();

      try {
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
        };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        streamRef.current = stream;
        setIsCameraOpen(true);
        onOpenChange?.(true);

        // Enumerate available video devices after permission is granted
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
          setDevices(videoInputs);
          const currentTrack = stream.getVideoTracks()[0];
          const activeId = currentTrack?.getSettings().deviceId;
          if (activeId) setSelectedDeviceId(activeId);
        } catch {
          // Device enumeration optional
        }
      } catch (err) {
        setIsCameraOpen(false);
        onOpenChange?.(false);
        onError(mapCameraError(err));
      } finally {
        setIsStarting(false);
      }
    },
    [onError, onOpenChange, stopStream]
  );

  // Attach MediaStream once the <video> element is mounted in DOM
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!isCameraOpen || !video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const handleLoadedMetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setStreamResolution({ w: video.videoWidth, h: video.videoHeight });
      }
      video.play().catch(() => {
        // Autoplay fallback handled by muted + playsInline
      });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isCameraOpen]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Switch camera device
  const switchDevice = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (isCameraOpen) {
        void startStream(deviceId);
      }
    },
    [isCameraOpen, startStream]
  );

  // Phase 1: Capture full-resolution snapshot and upload to workspace session
  const captureSnapshot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0 || isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = captureCanvasRef.current ?? document.createElement('canvas');
      captureCanvasRef.current = canvas;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.save();
      if (isMirroredRef.current) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) throw new Error('Failed to encode snapshot PNG');

      const now = new Date();
      const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const file = new File([blob], `camera_snapshot_${stamp}.png`, { type: 'image/png' });

      // Close camera immediately so webcam LED turns off right as workspace loads
      closeCamera();
      await onSnapshotCaptured(file);
    } catch (err) {
      onError({
        title: 'Snapshot capture failed',
        detail: err instanceof Error ? err.message : 'Unable to capture image',
      });
    } finally {
      setIsCapturing(false);
    }
  }, [closeCamera, isCapturing, onError, onSnapshotCaptured]);

  // Cancel active live request whenever operation or params change so fresh params apply immediately
  useEffect(() => {
    if (isLiveFilter && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      inFlightRef.current = false;
    }
  }, [activeOp, draftParams, isLiveFilter]);

  // Phase 2: Stateless Live Real-Time Processing loop with Busy Guard + Throttling
  useEffect(() => {
    if (!isCameraOpen || !isLiveFilter) {
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let lastSentAt = 0;
    let lastHistogramAt = 0;
    let fpsCounter = 0;
    let fpsWindowStart = performance.now();

    const tick = async (now: number) => {
      if (cancelled) return;
      rafId = window.requestAnimationFrame((t) => {
        void tick(t);
      });

      const video = videoRef.current;
      const displayCanvas = liveCanvasRef.current;
      if (!video || !displayCanvas || video.readyState < 2 || video.videoWidth === 0) {
        return;
      }

      // Busy Guard & Throttle: never stack requests
      if (inFlightRef.current || now - lastSentAt < MIN_FRAME_INTERVAL_MS) {
        return;
      }

      // Lock internal processing resolution to max width 320px (height proportional to camera aspect ratio)
      const maxWidth = Math.min(LIVE_FILTER_MAX_WIDTH, liveResRef.current);
      const { width: targetW, height: targetH } = computeLiveFilterDimensions(
        video.videoWidth,
        video.videoHeight,
        maxWidth
      );

      const offscreen = captureCanvasRef.current ?? document.createElement('canvas');
      captureCanvasRef.current = offscreen;
      if (offscreen.width !== targetW || offscreen.height !== targetH) {
        offscreen.width = targetW;
        offscreen.height = targetH;
      }

      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      offCtx.save();
      if (isMirroredRef.current) {
        offCtx.translate(targetW, 0);
        offCtx.scale(-1, 1);
      }
      offCtx.drawImage(video, 0, 0, targetW, targetH);
      offCtx.restore();

      inFlightRef.current = true;
      lastSentAt = now;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const frameBlob = await new Promise<Blob | null>((resolve) =>
          offscreen.toBlob(resolve, 'image/jpeg', 0.8)
        );
        if (!frameBlob || cancelled || controller.signal.aborted) {
          return;
        }

        const res = await processLiveFrame(
          frameBlob,
          activeOpRef.current,
          draftParamsRef.current as unknown as Record<string, unknown>,
          controller.signal
        );

        if (cancelled || controller.signal.aborted) return;

        const bitmap = await createImageBitmap(res.blob);
        try {
          if (cancelled || controller.signal.aborted) return;
          if (displayCanvas.width !== targetW || displayCanvas.height !== targetH) {
            displayCanvas.width = targetW;
            displayCanvas.height = targetH;
          }
          const dCtx = displayCanvas.getContext('2d');
          if (dCtx) {
            dCtx.drawImage(bitmap, 0, 0, targetW, targetH);

            // Real-time throttled histogram calculated directly from downscaled 320px ImageData
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
        } finally {
          bitmap.close();
        }

        setLiveProcessingMs(res.processingTimeMs);
        if (onOtsuDetected && res.otsuThreshold !== null) {
          onOtsuDetected(res.otsuThreshold);
        }

        fpsCounter += 1;
        const elapsedFps = performance.now() - fpsWindowStart;
        if (elapsedFps >= 1000) {
          setLiveFps(Math.round((fpsCounter * 1000) / elapsedFps));
          fpsCounter = 0;
          fpsWindowStart = performance.now();
        }
      } catch (err) {
        if (controller.signal.aborted || cancelled) return;
        if (err instanceof AppApiError) {
          // Pause live filter on invalid parameter errors so user isn't spammed with toasts
          setIsLiveFilter(false);
          onError({ title: err.message, detail: err.detail });
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        inFlightRef.current = false;
      }
    };

    rafId = window.requestAnimationFrame((t) => {
      void tick(t);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [isCameraOpen, isLiveFilter, onError, onOtsuDetected]);

  return {
    isCameraOpen,
    isStarting,
    isCapturing,
    isLiveFilter,
    isMirrored,
    liveResolution,
    devices,
    selectedDeviceId,
    streamResolution,
    liveProcessingMs: isCameraOpen && isLiveFilter ? liveProcessingMs : 0,
    liveFps: isCameraOpen && isLiveFilter ? liveFps : 0,
    liveOriginalHistogram: isCameraOpen && isLiveFilter ? liveOriginalHistogram : null,
    liveCurrentHistogram: isCameraOpen && isLiveFilter ? liveCurrentHistogram : null,
    videoRef,
    liveCanvasRef,
    openCamera: () => startStream(selectedDeviceId || undefined),
    closeCamera,
    toggleLiveFilter: () =>
      setIsLiveFilter((prev) => {
        if (prev) {
          setLiveFps(0);
          setLiveProcessingMs(0);
          setLiveOriginalHistogram(null);
          setLiveCurrentHistogram(null);
        }
        return !prev;
      }),
    setIsLiveFilter,
    toggleMirror: () => setIsMirrored((prev) => !prev),
    setLiveResolution,
    switchDevice,
    captureSnapshot,
  };
}
