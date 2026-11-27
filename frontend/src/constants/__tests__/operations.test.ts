import { describe, it, assert } from '@/test/harness';
import { OPERATIONS, DEFAULT_PARAMS, getOperationEquation } from '@/constants/operations';

describe('OPERATIONS technical catalogue', () => {
  it('assigns an iconName and defaultEquation to every operation', () => {
    assert.equal(OPERATIONS.length, 17);
    for (const op of OPERATIONS) {
      assert.ok(op.iconName, `Missing iconName on ${op.id}`);
      assert.ok(op.defaultEquation && op.defaultEquation.length > 3, `Missing defaultEquation on ${op.id}`);
    }
  });

  it('computes dynamic mathematical equations when parameters change', () => {
    assert.match(
      getOperationEquation('grayscale', { method: 'luminance' }).formula,
      /Y = 0\.299R \+ 0\.587G \+ 0\.114B/
    );
    assert.match(
      getOperationEquation('grayscale', { method: 'average' }).formula,
      /Y = \(R \+ G \+ B\) \/ 3/
    );
    assert.match(
      getOperationEquation('grayscale', { method: 'lightness' }).formula,
      /Y = \(max\(R,G,B\) \+ min\(R,G,B\)\) \/ 2/
    );
    assert.match(
      getOperationEquation('threshold', { method: 'otsu', thresh: 127 }).formula,
      /σ²_w\(t\) = ω₀\(t\)σ²₀\(t\) \+ ω₁\(t\)σ²₁\(t\)/
    );
    assert.match(
      getOperationEquation('blur_gaussian', DEFAULT_PARAMS.blur_gaussian).formula,
      /G\(x,y\) = \(1 \/ 2πσ²\) · exp\(-\(x² \+ y²\) \/ 2σ²\)/
    );
  });
});
