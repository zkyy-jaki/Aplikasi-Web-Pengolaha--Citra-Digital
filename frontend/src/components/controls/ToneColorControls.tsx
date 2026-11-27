import React from 'react';
import {
  OperationType,
  AnyOperationParams,
  GrayscaleParams,
  BrightnessParams,
  ThresholdParams,
  EqualizeParams,
} from '@/types/operations';

interface ToneColorControlsProps {
  activeOp: OperationType;
  params: AnyOperationParams;
  onChange: (params: Partial<AnyOperationParams>) => void;
  otsuCalculatedT: number | null;
}

export const ToneColorControls: React.FC<ToneColorControlsProps> = ({
  activeOp,
  params,
  onChange,
  otsuCalculatedT,
}) => {
  if (activeOp === 'grayscale') {
    const p = params as GrayscaleParams;
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Grayscale Method
          </label>
          <div className="grid grid-cols-3 gap-1 bg-subtleBg p-1 rounded-sm border border-panelBorder">
            {(['luminance', 'average', 'lightness'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onChange({ method })}
                className={`py-1.5 px-2 text-xs font-semibold rounded-sm border transition capitalize cursor-pointer ${
                  p.method === method
                    ? 'bg-accent text-white border-accent'
                    : 'border-transparent text-mutedText hover:text-textPrimary hover:bg-white'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeOp === 'brightness') {
    const p = params as BrightnessParams;
    const beta = p.beta ?? 0;
    return (
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
              Brightness (Beta)
            </label>
            <input
              type="number"
              min={-255}
              max={255}
              value={beta}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onChange({ beta: isNaN(val) ? 0 : Math.max(-255, Math.min(255, val)) });
              }}
              className="w-16 bg-white border border-panelBorder rounded-sm px-1.5 py-0.5 text-right font-mono text-xs text-textPrimary focus:outline-none focus:border-accent"
            />
          </div>
          <input
            type="range"
            min={-255}
            max={255}
            value={beta}
            onChange={(e) => onChange({ beta: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-mutedText font-mono mt-1">
            <span>-255</span>
            <span>0</span>
            <span>+255</span>
          </div>
        </div>
      </div>
    );
  }

  if (activeOp === 'negative') {
    return (
      <div className="bg-subtleBg/70 border border-panelBorder p-2.5 rounded-sm text-[11px] text-mutedText leading-relaxed">
        Inverts pixel intensities across all color channels while preserving PNG Alpha transparency without inversion.
      </div>
    );
  }

  if (activeOp === 'threshold') {
    const p = params as ThresholdParams;
    const isOtsu = p.method === 'otsu';
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Thresholding Method
          </label>
          <select
            value={p.method}
            onChange={(e) => onChange({ method: e.target.value as ThresholdParams['method'] })}
            className="w-full bg-white border border-panelBorder text-xs rounded-sm px-2.5 py-1.5 text-textPrimary focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="binary">Binary (I &gt; T → 255, else 0)</option>
            <option value="binary_inv">Binary Invert (I &gt; T → 0, else 255)</option>
            <option value="truncate">Truncate (I &gt; T → T, else I)</option>
            <option value="to_zero">To Zero (I &gt; T → I, else 0)</option>
            <option value="otsu">Otsu&apos;s Automatic Threshold</option>
          </select>
        </div>

        {!isOtsu ? (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
                Threshold (T)
              </label>
              <input
                type="number"
                min={0}
                max={255}
                value={p.thresh}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChange({ thresh: isNaN(val) ? 127 : Math.max(0, Math.min(255, val)) });
                }}
                className="w-16 bg-white border border-panelBorder rounded-sm px-1.5 py-0.5 text-right font-mono text-xs text-textPrimary focus:outline-none focus:border-accent"
              />
            </div>
            <input
              type="range"
              min={0}
              max={255}
              value={p.thresh}
              onChange={(e) => onChange({ thresh: parseInt(e.target.value, 10) })}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-mutedText font-mono mt-1">
              <span>0</span>
              <span>127</span>
              <span>255</span>
            </div>
          </div>
        ) : (
          <div className="bg-subtleBg/70 border border-panelBorder p-2.5 rounded-sm space-y-1">
            <div className="text-xs font-semibold text-textPrimary flex items-center justify-between">
              <span>Otsu Optimal Threshold:</span>
              <span className="font-mono text-accent text-xs font-bold">
                {otsuCalculatedT !== null ? `T = ${otsuCalculatedT}` : 'Calculating...'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeOp === 'equalize') {
    const p = params as EqualizeParams;
    const isClahe = p.mode === 'clahe';
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Equalization Mode
          </label>
          <div className="grid grid-cols-2 gap-1 bg-subtleBg p-1 rounded-sm border border-panelBorder">
            <button
              type="button"
              onClick={() => onChange({ mode: 'global' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-sm border transition cursor-pointer ${
                !isClahe
                  ? 'bg-accent text-white border-accent'
                  : 'border-transparent text-mutedText hover:text-textPrimary hover:bg-white'
              }`}
            >
              Global (YCrCb)
            </button>
            <button
              type="button"
              onClick={() => onChange({ mode: 'clahe' })}
              className={`py-1.5 px-2 text-xs font-semibold rounded-sm border transition cursor-pointer ${
                isClahe
                  ? 'bg-accent text-white border-accent'
                  : 'border-transparent text-mutedText hover:text-textPrimary hover:bg-white'
              }`}
            >
              CLAHE (Adaptive)
            </button>
          </div>
        </div>

        {isClahe && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-mutedText">Clip Limit</label>
                <span className="font-mono text-xs text-textPrimary font-bold">
                  {(p.clip_limit ?? 2.0).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={1.0}
                max={10.0}
                step={0.5}
                value={p.clip_limit ?? 2.0}
                onChange={(e) => onChange({ clip_limit: parseFloat(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-mutedText">Tile Grid Size</label>
                <span className="font-mono text-xs text-textPrimary font-bold">
                  {p.tile_grid_size ?? 8}×{p.tile_grid_size ?? 8}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={16}
                step={2}
                value={p.tile_grid_size ?? 8}
                onChange={(e) => onChange({ tile_grid_size: parseInt(e.target.value, 10) })}
                className="w-full cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
