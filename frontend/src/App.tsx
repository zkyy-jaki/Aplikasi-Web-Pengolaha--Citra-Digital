import { useState, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { CenterStage } from '@/components/layout/CenterStage';
import { RightInspector } from '@/components/layout/RightInspector';
import { ExportModal } from '@/components/modals/ExportModal';
import { ToastError } from '@/components/common/ToastError';
import { useImageWorkspace } from '@/hooks/useImageWorkspace';
import { useWebcam } from '@/hooks/useWebcam';

export function App() {
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const {
    sessionId,
    metadata,
    originalPreviewB64,
    livePreviewB64,
    currentHistogram,
    originalHistogram,
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
    isProcessing,
    errorMessage,
    dismissError,
    reportError,
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
  } = useImageWorkspace(isCameraActive);

  const webcam = useWebcam({
    activeOp,
    draftParams,
    onSnapshotCaptured: handleUploadFile,
    onError: reportError,
    onOtsuDetected: setOtsuCalculatedT,
    onOpenChange: setIsCameraActive,
  });

  const handleSelectFileWithCameraClose = useCallback(
    (file: File) => {
      if (webcam.isCameraOpen) {
        webcam.closeCamera();
      }
      void handleUploadFile(file);
    },
    [webcam, handleUploadFile]
  );

  const handleToggleCamera = useCallback(() => {
    if (webcam.isCameraOpen) {
      webcam.closeCamera();
    } else {
      if (viewMode === 'split') {
        setViewMode('single');
      }
      void webcam.openCamera();
    }
  }, [webcam, viewMode, setViewMode]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (!webcam.isCameraOpen && metadata && historyIndex > 0) handleHistoryAction('undo');
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        if (!webcam.isCameraOpen && metadata && historyIndex < historyList.length - 1) {
          handleHistoryAction('redo');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isExportOpen) {
          setIsExportOpen(false);
        } else if (webcam.isCameraOpen) {
          webcam.closeCamera();
        } else if (metadata) {
          handleCancel();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!webcam.isCameraOpen && metadata) {
          handleApply();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleHistoryAction,
    handleCancel,
    handleApply,
    isExportOpen,
    webcam,
    metadata,
    historyIndex,
    historyList.length,
  ]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-canvas text-textPrimary select-none">
      {/* Top Bar */}
      <TopBar
        metadata={metadata}
        isCameraOpen={webcam.isCameraOpen}
        isCameraStarting={webcam.isStarting}
        isLiveFilter={webcam.isLiveFilter}
        viewMode={viewMode}
        zoom={zoom}
        canUndo={!webcam.isCameraOpen && !!metadata && historyIndex > 0}
        canRedo={!webcam.isCameraOpen && !!metadata && historyIndex < historyList.length - 1}
        canReset={!webcam.isCameraOpen && !!metadata && historyList.length > 1}
        onSelectFile={handleSelectFileWithCameraClose}
        onToggleCamera={handleToggleCamera}
        onSetViewMode={setViewMode}
        onSetZoom={setZoom}
        onUndo={() => handleHistoryAction('undo')}
        onRedo={() => handleHistoryAction('redo')}
        onReset={() => handleHistoryAction('reset')}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main 3-Panel Workstation Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Operation Selector */}
        <LeftSidebar
          activeOp={activeOp}
          onSelectOp={handleSelectOperation}
        />

        {/* Center Stage: Canvas Viewport & Status Bar */}
        <CenterStage
          metadata={metadata}
          originalPreviewB64={originalPreviewB64}
          livePreviewB64={livePreviewB64}
          viewMode={viewMode}
          zoom={zoom}
          splitPosition={splitPosition}
          cursorPos={cursorPos}
          processingTimeMs={processingTimeMs}
          isProcessing={isProcessing}
          camera={{
            isCameraOpen: webcam.isCameraOpen,
            isStarting: webcam.isStarting,
            isCapturing: webcam.isCapturing,
            isLiveFilter: webcam.isLiveFilter,
            isMirrored: webcam.isMirrored,
            liveResolution: webcam.liveResolution,
            devices: webcam.devices,
            selectedDeviceId: webcam.selectedDeviceId,
            streamResolution: webcam.streamResolution,
            liveProcessingMs: webcam.liveProcessingMs,
            liveFps: webcam.liveFps,
            onOpenCamera: () => void webcam.openCamera(),
            onCloseCamera: webcam.closeCamera,
            onToggleLiveFilter: webcam.toggleLiveFilter,
            onToggleMirror: webcam.toggleMirror,
            onSetLiveResolution: webcam.setLiveResolution,
            onSwitchDevice: webcam.switchDevice,
            onCaptureSnapshot: () => void webcam.captureSnapshot(),
          }}
          videoRef={webcam.videoRef}
          liveCanvasRef={webcam.liveCanvasRef}
          onSelectFile={handleSelectFileWithCameraClose}
          onLoadSample={handleLoadSample}
          onSplitChange={setSplitPosition}
          onCursorMove={setCursorPos}
        />

        {/* Right Inspector: Histogram, Parameters & History */}
        <RightInspector
          activeOp={activeOp}
          draftParams={draftParams}
          currentHistogram={currentHistogram}
          originalHistogram={originalHistogram}
          historyList={historyList}
          historySteps={historySteps}
          historyIndex={historyIndex}
          otsuCalculatedT={otsuCalculatedT}
          isProcessing={isProcessing}
          hasImage={!!metadata}
          isCameraOpen={webcam.isCameraOpen}
          isLiveFilter={webcam.isLiveFilter}
          onUpdateParams={handleUpdateParams}
          onApply={handleApply}
          onCancel={handleCancel}
          onToggleHistoryStep={handleToggleHistoryStep}
          onDeleteHistoryStep={handleDeleteHistoryStep}
        />
      </div>

      {/* Export Modal Dialog */}
      {sessionId && metadata && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          sessionId={sessionId}
          defaultFilename={metadata.filename}
          onDownloadHistogram={() => {
            const btn = document.querySelector<HTMLButtonElement>(
              'button[title="Download Histogram Chart (PNG)"]'
            );
            if (btn) btn.click();
          }}
        />
      )}

      {/* Error Toast Notification */}
      {errorMessage && (
        <ToastError
          title={errorMessage.title}
          detail={errorMessage.detail}
          onDismiss={dismissError}
        />
      )}
    </div>
  );
}
export default App;
