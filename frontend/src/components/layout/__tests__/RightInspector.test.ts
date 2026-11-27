import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, assert } from '@/test/harness';
import { RightInspector } from '@/components/layout/RightInspector';

const sampleHistogram = {
  mode: 'rgb' as const,
  channels: [
    { channel: 'red' as const, values: new Array(256).fill(10) },
    { channel: 'green' as const, values: new Array(256).fill(10) },
    { channel: 'blue' as const, values: new Array(256).fill(10) },
  ],
  stats: { min: 12, max: 240, mean: 118.4, std_dev: 42.7 },
};

describe('RightInspector technical specification box and layer-stack pipeline history', () => {
  it('renders 4-column monospace histogram stats and the EQUATION / KERNEL specification box', () => {
    const htmlLum = renderToStaticMarkup(
      React.createElement(RightInspector, {
        activeOp: 'grayscale',
        draftParams: { method: 'luminance' },
        currentHistogram: sampleHistogram,
        originalHistogram: sampleHistogram,
        historyList: ['Original Image'],
        historyIndex: 0,
        historySteps: [],
        otsuCalculatedT: null,
        isProcessing: false,
        hasImage: true,
        onUpdateParams: () => {},
        onApply: () => {},
        onCancel: () => {},
      })
    );

    assert.match(htmlLum, /EQUATION \/ KERNEL/);
    assert.match(htmlLum, /Y = 0\.299R \+ 0\.587G \+ 0\.114B/);
    assert.match(htmlLum, />12</);
    assert.match(htmlLum, />240</);
    assert.match(htmlLum, />118\.4</);
    assert.match(htmlLum, />42\.7</);
    assert.doesNotMatch(htmlLum, /shadow-/);

    const htmlAvg = renderToStaticMarkup(
      React.createElement(RightInspector, {
        activeOp: 'grayscale',
        draftParams: { method: 'average' },
        currentHistogram: sampleHistogram,
        originalHistogram: sampleHistogram,
        historyList: ['Original Image'],
        historyIndex: 0,
        historySteps: [],
        otsuCalculatedT: null,
        isProcessing: false,
        hasImage: true,
        onUpdateParams: () => {},
        onApply: () => {},
        onCancel: () => {},
      })
    );
    assert.match(htmlAvg, /Y = \(R \+ G \+ B\) \/ 3/);
  });

  it('renders Pipeline History as an expanded layer stack with eye visibility toggle and delete actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(RightInspector, {
        activeOp: 'brightness',
        draftParams: { beta: 20 },
        currentHistogram: sampleHistogram,
        originalHistogram: sampleHistogram,
        historyList: ['Original Image', '1. grayscale {"method":"luminance"}'],
        historyIndex: 1,
        historySteps: [
          {
            id: 'step-1',
            operation: 'grayscale',
            params: { method: 'luminance' },
            label: 'grayscale',
            enabled: true,
          },
        ],
        otsuCalculatedT: null,
        isProcessing: false,
        hasImage: true,
        onUpdateParams: () => {},
        onApply: () => {},
        onCancel: () => {},
        onToggleHistoryStep: () => {},
        onDeleteHistoryStep: () => {},
      })
    );

    assert.match(html, /aria-label="Toggle layer 1"/);
    assert.match(html, /aria-label="Delete layer 1"/);
    assert.match(html, /grayscale \(luminance\)/);
    assert.match(html, /h-\[34%\]/);
    assert.doesNotMatch(html, /shadow-/);
  });
});
