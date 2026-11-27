import { useState, useCallback, useTransition } from 'react';
import {
  uploadImage,
  loadSampleImage,
  processImage,
  applyHistoryAction,
  toggleHistoryStep,
  deleteHistoryStep,
  AppApiError,
} from '@/services/api';
import {
  OperationType,
  AnyOperationParams,
  HistogramResult,
  HistoryStepItem,
  ViewMode,
  ZoomLevel,
} from '@/types/operations';
import { DEFAULT_PARAMS } from '@/constants/operations';
import { useDebouncedPreview } from './useDebouncedPreview';

export interface WorkspaceMetadata {
  filename: string;
  width: number;
  height: number;
  channels: number;
  format: string;
}

export function useImageWorkspace(pauseDebouncedPreview: boolean = false) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<WorkspaceMetadata | null>(null);

  // Image buffers (base64 PNG)
  const [originalPreviewB64, setOriginalPreviewB64] = useState<string | null>(null);
  const [currentPreviewB64, setCurrentPreviewB64] = useState<string | null>(null);
  const [livePreviewB64, setLivePreviewB64] = useState<string | null>(null);

  // Histograms
  const [originalHistogram, setOriginalHistogram] = useState<HistogramResult | null>(null);
  const [currentHistogram, setCurrentHistogram] = useState<HistogramResult | null>(null);

  // History Stack
  const [historyList, setHistoryList] = useState<string[]>([]);
  const [historySteps, setHistorySteps] = useState<HistoryStepItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Operation & Parameters
  const [activeOp, setActiveOp] = useState<OperationType>('grayscale');
  const [draftParams, setDraftParams] = useState<AnyOperationParams>(DEFAULT_PARAMS.grayscale);
  const [otsuCalculatedT, setOtsuCalculatedT] = useState<number | null>(null);

  // Viewport & Inspector State
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [zoom, setZoom] = useState<ZoomLevel>('fit');
  const [splitPosition, setSplitPosition] = useState<number>(50); // percentage 0..100
  const [cursorPos, setCursorPos] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  // Status & Performance
  const [processingTimeMs, setProcessingTimeMs] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<{ title: string; detail?: string | null } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // Clear error
  const dismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Handle preview calculation
  const handlePreviewSuccess = useCallback(
    (data: {
      previewBase64: string;
      histogram: HistogramResult;
      processingTimeMs: number;
      otsuThreshold?: number | null;
    }) => {
      setLivePreviewB64(data.previewBase64);
      setCurrentHistogram(data.histogram);
      setProcessingTimeMs(data.processingTimeMs);
      if (data.otsuThreshold !== undefined) {
        setOtsuCalculatedT(data.otsuThreshold);
      }
      setErrorMessage(null);
    },
    []
  );

  const handlePreviewError = useCallback((err: AppApiError) => {
    setErrorMessage({
      title: err.message,
      detail: err.detail || `Error Code: ${err.errorCode}`,
    });
  }, []);

  const { isProcessing: isPreviewDebouncing } = useDebouncedPreview({
    sessionId: pauseDebouncedPreview ? null : sessionId,
    activeOp,
    params: draftParams,
    onSuccess: handlePreviewSuccess,
    onError: handlePreviewError,
    debounceMs: 180,
  });

  // Upload local file
  const handleUploadFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    try {
      const res = await uploadImage(file);
      setSessionId(res.session_id);
      setMetadata({
        filename: res.filename,
        width: res.width,
        height: res.height,
        channels: res.channels,
        format: res.format,
      });
      setOriginalPreviewB64(res.preview_base64);
      setCurrentPreviewB64(res.preview_base64);
      setLivePreviewB64(res.preview_base64);
      setOriginalHistogram(res.histogram);
      setCurrentHistogram(res.histogram);
      setHistoryList(['Original Image']);
      setHistorySteps([]);
      setHistoryIndex(0);
      setProcessingTimeMs(0);
      setOtsuCalculatedT(null);
    } catch (err: unknown) {
      if (err instanceof AppApiError) {
        setErrorMessage({ title: err.message, detail: err.detail });
      } else if (err instanceof Error) {
        setErrorMessage({ title: 'Gagal mengunggah citra', detail: err.message });
      }
    }
  }, []);

  // Load sample image
  const handleLoadSample = useCallback(async (sampleUrl: string) => {
    setErrorMessage(null);
    try {
      const res = await loadSampleImage(sampleUrl);
      setSessionId(res.session_id);
      setMetadata({
        filename: res.filename,
        width: res.width,
        height: res.height,
        channels: res.channels,
        format: res.format,
      });
      setOriginalPreviewB64(res.preview_base64);
      setCurrentPreviewB64(res.preview_base64);
      setLivePreviewB64(res.preview_base64);
      setOriginalHistogram(res.histogram);
      setCurrentHistogram(res.histogram);
      setHistoryList(['Original Image']);
      setHistorySteps([]);
      setHistoryIndex(0);
      setProcessingTimeMs(0);
      setOtsuCalculatedT(null);
    } catch (err: unknown) {
      if (err instanceof AppApiError) {
        setErrorMessage({ title: err.message, detail: err.detail });
      } else if (err instanceof Error) {
        setErrorMessage({ title: 'Gagal memuat gambar sampel', detail: err.message });
      }
    }
  }, []);

  // Switch active operation
  const handleSelectOperation = useCallback((op: OperationType) => {
    setActiveOp(op);
    setDraftParams(DEFAULT_PARAMS[op]);
    setOtsuCalculatedT(null);
  }, []);

  // Update operation params
  const handleUpdateParams = useCallback((newParams: Record<string, unknown>) => {
    setDraftParams((prev) => ({
      ...prev,
      ...newParams,
    } as AnyOperationParams));
  }, []);

  // Apply (Commit to history)
  const handleApply = useCallback(async () => {
    if (!sessionId) return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await processImage(
          sessionId,
          activeOp,
          draftParams as unknown as Record<string, unknown>,
          true // commit = true
        );
        setCurrentPreviewB64(res.preview_base64);
        setLivePreviewB64(res.preview_base64);
        setCurrentHistogram(res.histogram);
        setProcessingTimeMs(res.processing_time_ms);

        // Update history from backend response when available, otherwise cap at 10 locally
        if (res.history && res.history_steps && typeof res.history_index === 'number') {
          setHistoryList(['Original Image', ...res.history]);
          setHistorySteps(res.history_steps);
          setHistoryIndex(res.history_index + 1);
        } else {
          setHistoryList((prev) => {
            const truncated = prev.slice(0, historyIndex + 1);
            const committed = truncated.slice(1);
            const capped = committed.length >= 10 ? committed.slice(1) : committed;
            return ['Original Image', ...capped, `${activeOp} applied`];
          });
          setHistorySteps((prev) => {
            const truncated = prev.slice(0, historyIndex);
            const capped = truncated.length >= 10 ? truncated.slice(1) : truncated;
            return [
              ...capped,
              {
                id: `${Date.now()}-${capped.length}`,
                operation: activeOp,
                params: { ...(draftParams as unknown as Record<string, unknown>) },
                label: activeOp,
                enabled: true,
              },
            ];
          });
          setHistoryIndex((prev) => Math.min(10, prev + 1));
        }
      } catch (err: unknown) {
        if (err instanceof AppApiError) {
          setErrorMessage({ title: err.message, detail: err.detail });
        }
      }
    });
  }, [sessionId, activeOp, draftParams, historyIndex]);

  // Cancel draft operation (revert live preview to committed)
  const handleCancel = useCallback(() => {
    setLivePreviewB64(currentPreviewB64);
    setDraftParams(DEFAULT_PARAMS[activeOp]);
    setOtsuCalculatedT(null);
  }, [currentPreviewB64, activeOp]);

  // History action (undo, redo, reset)
  const handleHistoryAction = useCallback(
    async (action: 'undo' | 'redo' | 'reset') => {
      if (!sessionId) return;
      setErrorMessage(null);
      try {
        const res = await applyHistoryAction(sessionId, action);
        setCurrentPreviewB64(res.preview_base64);
        setLivePreviewB64(res.preview_base64);
        setCurrentHistogram(res.histogram);
        setHistoryIndex(res.history_index + 1);
        setHistoryList(['Original Image', ...res.history]);
        if (res.history_steps) {
          setHistorySteps(res.history_steps);
        } else if (action === 'reset') {
          setHistorySteps([]);
        }
        setOtsuCalculatedT(null);
      } catch (err: unknown) {
        if (err instanceof AppApiError) {
          setErrorMessage({ title: err.message, detail: err.detail });
        }
      }
    },
    [sessionId]
  );

  // Toggle visibility of a committed history step
  const handleToggleHistoryStep = useCallback(
    async (stepIndex: number) => {
      if (!sessionId) return;
      setErrorMessage(null);
      try {
        const res = await toggleHistoryStep(sessionId, stepIndex);
        setCurrentPreviewB64(res.preview_base64);
        setLivePreviewB64(res.preview_base64);
        setCurrentHistogram(res.histogram);
        setHistoryIndex(res.history_index + 1);
        setHistoryList(['Original Image', ...res.history]);
        if (res.history_steps) {
          setHistorySteps(res.history_steps);
        }
      } catch (err: unknown) {
        if (err instanceof AppApiError) {
          setErrorMessage({ title: err.message, detail: err.detail });
        }
      }
    },
    [sessionId]
  );

  // Delete a committed history step
  const handleDeleteHistoryStep = useCallback(
    async (stepIndex: number) => {
      if (!sessionId) return;
      setErrorMessage(null);
      try {
        const res = await deleteHistoryStep(sessionId, stepIndex);
        setCurrentPreviewB64(res.preview_base64);
        setLivePreviewB64(res.preview_base64);
        setCurrentHistogram(res.histogram);
        setHistoryIndex(res.history_index + 1);
        setHistoryList(['Original Image', ...res.history]);
        if (res.history_steps) {
          setHistorySteps(res.history_steps);
        }
      } catch (err: unknown) {
        if (err instanceof AppApiError) {
          setErrorMessage({ title: err.message, detail: err.detail });
        }
      }
    },
    [sessionId]
  );

  return {
    sessionId,
    metadata,
    originalPreviewB64,
    currentPreviewB64,
    livePreviewB64,
    originalHistogram,
    currentHistogram,
    historyList,
    historySteps,
    historyIndex,
    activeOp,
    draftParams,
    otsuCalculatedT,
    viewMode,
    zoom,
    splitPosition,
    cursorPos,
    processingTimeMs,
    isProcessing: isPreviewDebouncing || isPending,
    errorMessage,
    dismissError,
    reportError: setErrorMessage,
    setOtsuCalculatedT,
    setCursorPos,
    setSplitPosition,
    setViewMode,
    setZoom,
    handleUploadFile,
    handleLoadSample,
    handleSelectOperation,
    handleUpdateParams,
    handleApply,
    handleCancel,
    handleHistoryAction,
    handleToggleHistoryStep,
    handleDeleteHistoryStep,
  };
}
