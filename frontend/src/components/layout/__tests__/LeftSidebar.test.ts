import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, assert } from '@/test/harness';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { filterOperationsByQuery } from '@/constants/operations';

describe('LeftSidebar technical operation panel', () => {
  it('renders quick search input, collapsible category accordions, micro-icons, and 1px active border geometry', () => {
    const html = renderToStaticMarkup(
      React.createElement(LeftSidebar, {
        activeOp: 'grayscale',
        onSelectOp: () => {},
      })
    );

    assert.match(html, /placeholder="Cari operasi\.\.\."/);
    assert.match(html, /TONE &amp; COLOR/);
    assert.match(html, /BLUR FILTERS/);
    assert.match(html, /DETAIL &amp; EDGE/);
    assert.match(html, /GEOMETRY/);
    assert.match(html, /border-accent/);
    assert.doesNotMatch(html, /rounded-xl/);
    assert.doesNotMatch(html, /shadow-/);
  });

  it('filters operations by search query across label, id, and description', () => {
    const sobelMatches = filterOperationsByQuery('sobel');
    assert.equal(sobelMatches.length, 1);
    assert.equal(sobelMatches[0].id, 'edge_sobel');

    const emptyMatches = filterOperationsByQuery('xyznonexistent');
    assert.equal(emptyMatches.length, 0);
  });
});
