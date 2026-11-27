import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, assert } from '@/test/harness';
import { CenterStage } from '@/components/layout/CenterStage';

const baseCamera = {
  isCameraOpen: false,
  isStarting: false,
  isCapturing: false,
  isLiveFilter: false,
  isMirrored: true,
  liveResolution: 480 as const,
  devices: [],
  selectedDeviceId: '',
  streamResolution: null,
  liveProcessingMs: 0,
  liveFps: 0,
  onOpenCamera: () => {},
  onCloseCamera: () => {},
  onToggleLiveFilter: () => {},
  onToggleMirror: () => {},
  onSetLiveResolution: () => {},
  onSwitchDevice: () => {},
  onCaptureSnapshot: () => {},
};

describe('CenterStage technical dropzone, lab specimens, and floating HUD', () => {
  it('renders dashed technical dropzone container and lab specimen strip with monospace filenames and tags', () => {
    const html = renderToStaticMarkup(
      React.createElement(CenterStage, {
        metadata: null,
        originalPreviewB64: null,
        livePreviewB64: null,
        viewMode: 'single',
        zoom: 'fit',
        splitPosition: 50,
        cursorPos: { x: null, y: null },
        processingTimeMs: 0,
        isProcessing: false,
        camera: baseCamera,
        videoRef: React.createRef(),
        liveCanvasRef: React.createRef(),
        onSelectFile: () => {},
        onLoadSample: () => {},
        onSplitChange: () => {},
        onCursorMove: () => {},
      })
    );

    assert.match(html, /border-dashed/);
    assert.match(html, /WORKSPACE \/\/ INPUT_SOURCE/);
    assert.match(html, /geometric_test\.png/);
    assert.match(html, /low_contrast\.png/);
    assert.match(html, /salt_pepper\.png/);
    assert.match(html, />Edge</);
    assert.match(html, />HistEq</);
    assert.match(html, />Median</);
    assert.doesNotMatch(html, /shadow-/);
  });

  it('displays floating monospace HUD with pixel coordinates X and Y when an image is active', () => {
    const html = renderToStaticMarkup(
      React.createElement(CenterStage, {
        metadata: {
          filename: 'lena.png',
          width: 256,
          height: 256,
          channels: 3,
          format: 'image/png',
        },
        originalPreviewB64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        livePreviewB64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        viewMode: 'single',
        zoom: 1,
        splitPosition: 50,
        cursorPos: { x: 120, y: 84 },
        processingTimeMs: 4.2,
        isProcessing: false,
        camera: baseCamera,
        videoRef: React.createRef(),
        liveCanvasRef: React.createRef(),
        onSelectFile: () => {},
        onLoadSample: () => {},
        onSplitChange: () => {},
        onCursorMove: () => {},
      })
    );

    assert.match(html, /120px/);
    assert.match(html, /84px/);
    assert.match(html, /4\.2 ms/);
    assert.doesNotMatch(html, /shadow-/);
  });
});
