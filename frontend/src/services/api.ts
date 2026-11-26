import {
  UploadResponse,
  ProcessResponse,
  HistoryResponse,
  ApiErrorResponse,
} from '@/types/operations';

export class AppApiError extends Error {
  errorCode: string;
  detail?: string | null;

  constructor(message: string, errorCode: string, detail?: string | null) {
    super(message);
    this.name = 'AppApiError';
    this.errorCode = errorCode;
    this.detail = detail;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiErrorResponse = {
      error_code: `HTTP_${response.status}`,
      message: response.statusText || 'Terjadi kesalahan pada server',
    };
    try {
      const json = await response.json();
      if (json && typeof json === 'object') {
        errorData = {
          error_code: json.error_code || errorData.error_code,
          message: json.message || errorData.message,
          detail: json.detail,
        };
      }
    } catch {
      // Body is not JSON
    }
    throw new AppApiError(errorData.message, errorData.error_code, errorData.detail);
  }
  return response.json() as Promise<T>;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData,
  });

  return handleResponse<UploadResponse>(response);
}

export async function processImage(
  sessionId: string,
  operation: string,
  params: Record<string, unknown>,
  commit: boolean = false,
  signal?: AbortSignal
): Promise<ProcessResponse> {
  const response = await fetch(`/api/images/${sessionId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation,
      params,
      commit,
      preview_mode: true,
    }),
    signal,
  });

  return handleResponse<ProcessResponse>(response);
}

export async function applyHistoryAction(
  sessionId: string,
  action: 'undo' | 'redo' | 'reset'
): Promise<HistoryResponse> {
  const response = await fetch(`/api/images/${sessionId}/history/${action}`, {
    method: 'POST',
  });

  return handleResponse<HistoryResponse>(response);
}

export function getExportUrl(
  sessionId: string,
  format: 'png' | 'jpeg' | 'bmp',
  quality: number = 90
): string {
  return `/api/images/${sessionId}/export?format=${format}&quality=${quality}`;
}

export async function downloadExportImage(
  sessionId: string,
  format: 'png' | 'jpeg' | 'bmp',
  quality: number = 90,
  filename?: string
): Promise<void> {
  const url = getExportUrl(sessionId, format, quality);
  const response = await fetch(url);
  if (!response.ok) {
    throw new AppApiError('Gagal mengunduh file citra hasil olahan', 'DOWNLOAD_ERROR');
  }
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  const ext = format === 'jpeg' ? 'jpg' : format;
  a.download = filename || `processed_${Date.now()}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

export async function fetchSampleList(): Promise<string[]> {
  const response = await fetch('/api/samples');
  const data = await handleResponse<{ samples: string[] }>(response);
  return data.samples;
}

export async function loadSampleImage(sampleUrl: string): Promise<UploadResponse> {
  const response = await fetch(sampleUrl);
  if (!response.ok) {
    throw new AppApiError('Gagal memuat gambar sampel', 'SAMPLE_LOAD_ERROR');
  }
  const blob = await response.blob();
  const filename = sampleUrl.split('/').pop() || 'sample.png';
  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  return uploadImage(file);
}

export interface LiveFrameResult {
  blob: Blob;
  processingTimeMs: number;
  otsuThreshold: number | null;
}

export async function processLiveFrame(
  frameBlob: Blob,
  operation: string,
  params: Record<string, unknown>,
  signal?: AbortSignal
): Promise<LiveFrameResult> {
  const formData = new FormData();
  formData.append('file', frameBlob, 'frame.jpg');
  formData.append('operation', operation);
  formData.append('params', JSON.stringify(params));

  const response = await fetch('/api/images/process-frame', {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse = {
      error_code: `HTTP_${response.status}`,
      message: response.statusText || 'Gagal memproses frame kamera',
    };
    try {
      const json = await response.json();
      if (json && typeof json === 'object') {
        errorData = {
          error_code: json.error_code || errorData.error_code,
          message: json.message || errorData.message,
          detail: json.detail,
        };
      }
    } catch {
      // Non-JSON error body
    }
    throw new AppApiError(errorData.message, errorData.error_code, errorData.detail);
  }

  const timeHeader = response.headers.get('X-Processing-Time-Ms');
  const otsuHeader = response.headers.get('X-Otsu-Threshold');
  const processingTimeMs = timeHeader ? parseFloat(timeHeader) : 0;
  const otsuThreshold = otsuHeader !== null ? parseFloat(otsuHeader) : null;
  const blob = await response.blob();

  return {
    blob,
    processingTimeMs: Number.isFinite(processingTimeMs) ? processingTimeMs : 0,
    otsuThreshold: otsuThreshold !== null && Number.isFinite(otsuThreshold) ? otsuThreshold : null,
  };
}
