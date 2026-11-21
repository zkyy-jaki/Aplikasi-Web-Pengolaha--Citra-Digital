import React from 'react';
import {
  OperationType,
  AnyOperationParams,
  GaussianBlurParams,
  AveragingBlurParams,
  MedianBlurParams,
  BilateralBlurParams,
  Filter2DParams,
} from '@/types/operations';
import { MATRIX_PRESETS } from '@/constants/operations';

interface BlurControlsProps {
  activeOp: OperationType;
  params: AnyOperationParams;
  onChange: (params: Partial<AnyOperationParams>) => void;
}

export const BlurControls: React.FC<BlurControlsProps> = ({
  activeOp,
  params,
  onChange,
}) => {
  if (activeOp === 'blur_gaussian') {
    const p = params as GaussianBlurParams;
    return (
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
              Kernel Size (Odd)
            </label>
            <span className="font-mono text-xs text-textPrimary font-semibold bg-white px-2 py-0.5 rounded-sm border border-panelBorder shadow-xs">
              {p.kernel_size}×{p.kernel_size}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={31}
            step={2}
            value={p.kernel_size}
            onChange={(e) => onChange({ kernel_size: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
              Sigma (σ)
            </label>
            <span className="font-mono text-xs text-textPrimary font-semibold bg-white px-2 py-0.5 rounded-sm border border-panelBorder shadow-xs">
              {p.sigma === 0 ? '0 (Auto)' : p.sigma.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10.0}
            step={0.2}
            value={p.sigma}
            onChange={(e) => onChange({ sigma: parseFloat(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>
      </div>
    );
  }

  if (activeOp === 'blur_averaging') {
    const p = params as AveragingBlurParams;
    return (
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
              Box Kernel Size
            </label>
            <span className="font-mono text-xs text-textPrimary font-semibold bg-white px-2 py-0.5 rounded-sm border border-panelBorder shadow-xs">
              {p.kernel_size}×{p.kernel_size}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={31}
            step={2}
            value={p.kernel_size}
            onChange={(e) => onChange({ kernel_size: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
          />
        </div>
        <p className="text-[11px] text-mutedText leading-relaxed bg-subtleBg/70 border border-panelBorder p-2.5 rounded-sm">
          Uniform convolution box filter where every kernel element has an equal weight of 1/(k×k).
        </p>
      </div>
    );
  }

  if (activeOp === 'blur_median') {
    const p = params as MedianBlurParams;
    return (
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
              Aperture Size
            </label>
            <span className="font-mono text-xs text-textPrimary font-semibold bg-white px-2 py-0.5 rounded-sm border border-panelBorder shadow-xs">
              {p.kernel_size}×{p.kernel_size}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={31}
            step={2}
            value={p.kernel_size}
            onChange={(e) => onChange({ kernel_size: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
          />
        </div>
        <div className="bg-subtleBg/70 border border-panelBorder p-2.5 rounded-sm text-[11px] text-mutedText leading-relaxed">
          <span className="text-accent font-semibold">Salt-and-Pepper Benchmark:</span> Non-linear rank filter replacing central pixel with median value, eliminating impulse noise without blurring edges.
        </div>
      </div>
    );
  }

  if (activeOp === 'blur_bilateral') {
    const p = params as BilateralBlurParams;
    return (
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText font-semibold">Pixel Diameter (d)</label>
            <span className="font-mono text-xs text-textPrimary font-semibold">{p.diameter}</span>
          </div>
          <input
            type="range"
            min={1}
            max={15}
            value={p.diameter}
            onChange={(e) => onChange({ diameter: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText font-semibold">Sigma Color (σc)</label>
            <span className="font-mono text-xs text-textPrimary font-semibold">{p.sigma_color}</span>
          </div>
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={p.sigma_color}
            onChange={(e) => onChange({ sigma_color: parseFloat(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText font-semibold">Sigma Space (σs)</label>
            <span className="font-mono text-xs text-textPrimary font-semibold">{p.sigma_space}</span>
          </div>
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={p.sigma_space}
            onChange={(e) => onChange({ sigma_space: parseFloat(e.target.value) })}
            className="w-full cursor-pointer"
          />
        </div>

        <p className="text-[11px] text-mutedText leading-relaxed bg-subtleBg/70 border border-panelBorder p-2 rounded-sm">
          Edge-Preserving: Weights both Euclidean geometric closeness and radiometric color difference.
        </p>
      </div>
    );
  }

  if (activeOp === 'blur_filter2d') {
    const p = params as Filter2DParams;
    const size = p.kernel.length;
    const sum = p.kernel.flat().reduce((a, b) => a + b, 0);
    const hasZeroSumError = p.auto_normalize && sum === 0;

    const handleSizeToggle = (newSize: 3 | 5) => {
      if (newSize === 3) {
        onChange({
          kernel: [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1],
          ],
        });
      } else {
        onChange({
          kernel: [
            [1, 1, 1, 1, 1],
            [1, 2, 2, 2, 1],
            [1, 2, 4, 2, 1],
            [1, 2, 2, 2, 1],
            [1, 1, 1, 1, 1],
          ],
        });
      }
    };

    const handleCellChange = (r: number, c: number, val: string) => {
      const num = parseFloat(val);
      const newKernel = p.kernel.map((row, ri) =>
        row.map((colVal, ci) => (ri === r && ci === c ? (isNaN(num) ? 0 : num) : colVal))
      );
      onChange({ kernel: newKernel });
    };

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
            Matrix Size
          </label>
          <div className="flex gap-1 bg-subtleBg p-0.5 rounded-sm border border-panelBorder">
            <button
              type="button"
              onClick={() => handleSizeToggle(3)}
              className={`px-2 py-0.5 text-xs rounded-sm transition cursor-pointer ${
                size === 3 ? 'bg-accent text-white font-semibold shadow-xs' : 'text-mutedText hover:text-textPrimary'
              }`}
            >
              3×3
            </button>
            <button
              type="button"
              onClick={() => handleSizeToggle(5)}
              className={`px-2 py-0.5 text-xs rounded-sm transition cursor-pointer ${
                size === 5 ? 'bg-accent text-white font-semibold shadow-xs' : 'text-mutedText hover:text-textPrimary'
              }`}
            >
              5×5
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-mutedText font-semibold block mb-1">Preset Kernel</label>
          <select
            onChange={(e) => {
              const preset = MATRIX_PRESETS.find((pr) => pr.name === e.target.value);
              if (preset) {
                onChange({ kernel: preset.params.kernel, auto_normalize: preset.params.auto_normalize });
              }
            }}
            className="w-full bg-white border border-panelBorder text-xs rounded-sm px-2 py-1.5 text-textPrimary cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="">Select a preset...</option>
            {MATRIX_PRESETS.map((pr) => (
              <option key={pr.name} value={pr.name}>
                {pr.name}
              </option>
            ))}
          </select>
        </div>

        {/* Matrix Grid */}
        <div>
          <label className="text-xs text-mutedText font-semibold block mb-1">Kernel Weights</label>
          <div
            className="grid gap-1 bg-subtleBg p-2 rounded-sm border border-panelBorder"
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            }}
          >
            {p.kernel.map((row, r) =>
              row.map((val, c) => (
                <input
                  key={`${r}-${c}`}
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => handleCellChange(r, c, e.target.value)}
                  className="w-full bg-white border border-panelBorder text-center font-mono text-xs py-1 rounded-sm text-textPrimary focus:outline-none focus:border-accent"
                />
              ))
            )}
          </div>
        </div>

        {/* Normalization & Sum */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-1.5 text-xs text-textPrimary cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={p.auto_normalize}
              onChange={(e) => onChange({ auto_normalize: e.target.checked })}
              className="rounded-sm text-accent focus:ring-0 cursor-pointer"
            />
            Auto-Normalize
          </label>
          <span className="text-[11px] font-mono text-mutedText">
            Total Weight: <span className="text-textPrimary font-semibold">{sum}</span>
          </span>
        </div>

        {hasZeroSumError && (
          <div className="p-2 rounded-sm bg-rose-50 border border-rose-300 text-[11px] text-rose-800">
            Warning: Matrix sum is 0 with Auto-Normalize enabled. Disable auto-normalize or adjust weights.
          </div>
        )}
      </div>
    );
  }

  return null;
};
