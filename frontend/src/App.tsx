import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { CenterStage } from '@/components/layout/CenterStage';
import { RightInspector } from '@/components/layout/RightInspector';
import { ExportModal } from '@/components/modals/ExportModal';
import { ToastError } from '@/components/common/ToastError';
import { useImageWorkspace } from '@/hooks/useImageWorkspace';

export function App() {
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const {
    sessionId,
    metadata,
    originalPreviewB64,
    livePreviewB64,
    currentHistogram,
    originalHistogram,
    historyList,
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
  } = useImageWorkspace();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is inside an input/select/textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleHistoryAction('undo');
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleHistoryAction('redo');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isExportOpen) {
          setIsExportOpen(false);
        } else {
          handleCancel();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHistoryAction, handleCancel, handleApply, isExportOpen]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-canvas text-gray-200 select-none">
      {/* Top Bar */}
      <TopBar
        metadata={metadata}
        viewMode={viewMode}
        zoom={zoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < historyList.length - 1}
        canReset={historyList.length > 1}
        onSelectFile={handleUploadFile}
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
          onSelectFile={handleUploadFile}
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
          historyIndex={historyIndex}
          otsuCalculatedT={otsuCalculatedT}
          isProcessing={isProcessing}
          onUpdateParams={handleUpdateParams}
          onApply={handleApply}
          onCancel={handleCancel}
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
              'button[title="Unduh Grafik Histogram (PNG)"]'
            );
            btn?.click();
          }}
        />
      )}

      {/* Error Toast Banner */}
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
