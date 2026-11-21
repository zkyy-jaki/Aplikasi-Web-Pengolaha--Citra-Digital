import { useEffect, useRef, useState } from 'react';
import { processImage, AppApiError } from '@/services/api';
import {
  OperationType,
  AnyOperationParams,
  HistogramResult,
} from '@/types/operations';

interface UseDebouncedPreviewProps {
  sessionId: string | null;
  activeOp: OperationType;
  params: AnyOperationParams;
  onSuccess: (data: {
    previewBase64: string;
    histogram: HistogramResult;
    processingTimeMs: number;
    otsuThreshold?: number | null;
  }) => void;
  onError: (error: AppApiError) => void;
  debounceMs?: number;
}

export function useDebouncedPreview({
  sessionId,
  activeOp,
  params,
  onSuccess,
  onError,
  debounceMs = 200,
}: UseDebouncedPreviewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Clear previous timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    // Cancel in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    timerRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsProcessing(true);

      try {
        const res = await processImage(
          sessionId,
          activeOp,
          params as unknown as Record<string, unknown>,
          false, // commit = false for preview
          controller.signal
        );

        if (!controller.signal.aborted) {
          onSuccess({
            previewBase64: res.preview_base64,
            histogram: res.histogram,
            processingTimeMs: res.processing_time_ms,
            otsuThreshold: res.otsu_threshold,
          });
          setIsProcessing(false);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return; // Ignore aborted requests
        }
        setIsProcessing(false);
        if (err instanceof AppApiError) {
          onError(err);
        } else if (err instanceof Error && err.name !== 'AbortError') {
          onError(new AppApiError(err.message, 'CLIENT_ERROR'));
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [sessionId, activeOp, params, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isProcessing };
}
