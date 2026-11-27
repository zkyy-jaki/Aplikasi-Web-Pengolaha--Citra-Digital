import React from 'react';
import {
  OperationType,
  AnyOperationParams,
  SharpenParams,
  SobelParams,
  LaplacianParams,
  CannyParams,
  SketchParams,
} from '@/types/operations';

interface DetailControlsProps {
  activeOp: OperationType;
  params: AnyOperationParams;
  onChange: (params: Partial<AnyOperationParams>) => void;
}

export const DetailControls: React.FC<DetailControlsProps> = ({
  activeOp,
  params,
  onChange,
}) => {
  if (activeOp === 'sharpen') {
    const p = params as SharpenParams;
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Sharpening Method
          </label>
          <div className="grid grid-cols-3 gap-1 bg-subtleBg p-1 rounded-sm border border-panelBorder">
            {(['standard', 'strong', 'unsharp_mask'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onChange({ method })}
                className={`py-1.5 px-1.5 text-xs font-semibold rounded-sm border transition capitalize cursor-pointer ${
                  p.method === method
                    ? 'bg-accent text-white border-accent'
                    : 'border-transparent text-mutedText hover:text-textPrimary hover:bg-white'
                }`}
              >
                {method === 'unsharp_mask' ? 'Unsharp' : method}
              </button>
            ))}
          </div>
        </div>

        {p.method === 'unsharp_mask' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-mutedText font-semibold">Strength (Alpha α)</label>
              <span className="font-mono text-xs text-textPrimary font-semibold">
                {p.alpha_strength.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={3.0}
              step={0.1}
              value={p.alpha_strength}
              onChange={(e) => onChange({ alpha_strength: parseFloat(e.target.value) })}
              className="w-full cursor-pointer"
            />
          </div>
        )}
      </div>
    );
  }

  if (activeOp === 'edge_sobel') {
    const p = params as SobelParams;
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Gradient Direction
          </label>
          <div className="grid grid-cols-3 gap-1 bg-subtleBg p-1 rounded-sm border border-panelBorder">
            {(['combined', 'x', 'y'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => onChange({ direction: dir })}
                className={`py-1.5 px-2 text-xs font-semibold rounded-sm border transition capitalize cursor-pointer ${
                  p.direction === dir
                    ? 'bg-accent text-white border-accent'
                    : 'border-transparent text-mutedText hover:text-textPrimary hover:bg-white'
                }`}
              >
                {dir === 'combined' ? 'Magnitude' : `${dir.toUpperCase()}-Only`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText font-semibold">Sobel Kernel Size</label>
            <span className="font-mono text-xs text-textPrimary font-semibold">
              {p.ksize}×{p.ksize}
            </span>
          </div>
          <div className="flex gap-2">
            {[3, 5].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onChange({ ksize: k })}
                className={`flex-1 py-1 text-xs font-mono rounded-sm border transition cursor-pointer ${
                  p.ksize === k
                    ? 'border-accent bg-subtleBg text-accent font-semibold'
                    : 'border-panelBorder bg-white text-mutedText hover:text-textPrimary'
                }`}
              >
                {k}×{k}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeOp === 'edge_prewitt') {
    return (
      <div className="bg-subtleBg/70 border border-panelBorder p-2.5 rounded-sm text-[11px] text-mutedText leading-relaxed">
        Calculates edge discontinuity magnitude using uniform horizontal and vertical kernels of ±1 weights.
      </div>
    );
  }

  if (activeOp === 'edge_laplacian') {
    const p = params as LaplacianParams;
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-2.5 text-xs text-textPrimary bg-white p-2.5 rounded-sm border border-panelBorder cursor-pointer">
          <input
            type="checkbox"
            checked={p.pre_gaussian}
            onChange={(e) => onChange({ pre_gaussian: e.target.checked })}
            className="rounded-sm text-accent focus:ring-0 cursor-pointer"
          />
          <div>
            <span className="font-semibold block">Pre-Gaussian Smoothing (LoG)</span>
            <span className="text-[10px] text-mutedText block">
              Reduces noise sensitivity before applying 2nd derivative
            </span>
          </div>
        </label>
      </div>
    );
  }

  if (activeOp === 'edge_canny') {
    const p = params as CannyParams;

    const handleLowChange = (val: number) => {
      const low = Math.min(val, p.high_threshold);
      onChange({ low_threshold: low });
    };

    const handleHighChange = (val: number) => {
      const high = Math.max(val, p.low_threshold);
      onChange({ high_threshold: high });
    };

    return (
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText font-semibold">Low Threshold</label>
            <span className="font-mono text-xs text-textPrimary font-semibold">
              {p.low_threshold}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={p.low_threshold}
            onChange={(e) => handleLowChange(parseInt(e.target.value, 10))}
            className="w-full cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText font-semibold">High Threshold</label>
            <span className="font-mono text-xs text-textPrimary font-semibold">
              {p.high_threshold}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={p.high_threshold}
            onChange={(e) => handleHighChange(parseInt(e.target.value, 10))}
            className="w-full cursor-pointer"
          />
        </div>
      </div>
    );
  }

  if (activeOp === 'sketch') {
    const p = params as SketchParams;
    return (
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
              Stroke Width (Kernel Size)
            </label>
            <span className="font-mono text-xs text-textPrimary font-semibold bg-white px-2 py-0.5 rounded-sm border border-panelBorder">
              {p.kernel_size}×{p.kernel_size}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={51}
            step={2}
            value={p.kernel_size}
            onChange={(e) => onChange({ kernel_size: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-mutedText font-mono mt-1">
            <span>Fine (3)</span>
            <span>Default (21)</span>
            <span>Broad (51)</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
