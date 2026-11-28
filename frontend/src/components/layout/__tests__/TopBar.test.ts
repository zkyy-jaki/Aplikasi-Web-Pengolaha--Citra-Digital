import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, assert } from '@/test/harness';
import { TopBar } from '@/components/layout/TopBar';
import { stepZoomLevel } from '@/constants/operations';

const baseProps = {
  metadata: null,
  isCameraOpen: false,
  isCameraStarting: false,
  isLiveFilter: false,
  viewMode: 'single' as const,
  zoom: 'fit' as const,
  canUndo: false,
  canRedo: false,
  canReset: false,
  onSelectFile: () => {},
  onToggleCamera: () => {},
  onSetViewMode: () => {},
  onSetZoom: () => {},
  onUndo: () => {},
  onRedo: () => {},
  onReset: () => {},
  onOpenExport: () => {},
};

describe('TopBar technical instrument header', () => {
  it('renders KROMA // Lab brand, v1.0 tag, belum_ada_file breadcrumb, Export button, and hides file/camera triggers in empty state', () => {
    const html = renderToStaticMarkup(React.createElement(TopBar, baseProps));
    assert.match(html, /(?:KELOMPOK 12|KROMA \/\/ Lab)/);
    assert.match(html, /(?:PENGOLAHAN CITRA|v1\.0)/);
    assert.match(html, /belum[_ ]ada[_ ]file/i);
    assert.match(html, />Export</);
    assert.doesNotMatch(html, /Save File/);
    assert.doesNotMatch(html, /Open Image/);
    assert.doesNotMatch(html, /Use Camera/);
    assert.doesNotMatch(html, />Ganti</);
    assert.doesNotMatch(html, /shadow-/);
  });

  it('shows active file telemetry, compact Ganti & Kamera buttons when an image is loaded, and steps zoom levels deterministically', () => {
    const html = renderToStaticMarkup(
      React.createElement(TopBar, {
        ...baseProps,
        metadata: {
          filename: 'spesimen.png',
          width: 512,
          height: 512,
          channels: 3,
          format: 'image/png',
        },
      })
    );
    assert.match(html, /spesimen\.png/);
    assert.match(html, /\[512×512 • RGB\]/);
    assert.match(html, />Ganti</);
    assert.match(html, />Kamera</);

    assert.equal(stepZoomLevel('fit', 'in'), 1);
    assert.equal(stepZoomLevel('fit', 'out'), 0.5);
    assert.equal(stepZoomLevel(0.5, 'in'), 1);
    assert.equal(stepZoomLevel(1, 'in'), 2);
    assert.equal(stepZoomLevel(2, 'in'), 2);
    assert.equal(stepZoomLevel(2, 'out'), 1);
    assert.equal(stepZoomLevel(1, 'out'), 0.5);
    assert.equal(stepZoomLevel(0.5, 'out'), 0.5);
  });
});
