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
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Metode Penajaman
          </label>
          <div className="grid grid-cols-3 gap-1 bg-subtleBg p-1 rounded border border-panelBorder">
            {(['standard', 'strong', 'unsharp_mask'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onChange({ method })}
                className={`py-1.5 px-1.5 text-xs font-medium rounded transition capitalize ${
                  p.method === method
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-[#2A2D34]'
                }`}
              >
                {method === 'unsharp_mask' ? 'Unsharp' : method}
              </button>
            ))}
          </div>
        </div>

        {p.method === 'unsharp_mask' ? (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-mutedText">Kekuatan (Alpha α)</label>
              <span className="font-mono text-xs text-white">{p.alpha_strength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={3.0}
              step={0.1}
              value={p.alpha_strength}
              onChange={(e) => onChange({ alpha_strength: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-[11px] text-mutedText mt-1.5">
              Unsharp Mask: I_out = clip(I_in + α · (I_in - I_blur), 0, 255)
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-mutedText bg-subtleBg/50 border border-panelBorder p-2.5 rounded">
            {p.method === 'standard' && 'Kernel standar 3×3 dengan nilai tengah 5 dan tetangga silang -1.'}
            {p.method === 'strong' && 'Kernel kuat 3×3 dengan nilai tengah 9 dan seluruh 8 tetangga -1.'}
          </p>
        )}
      </div>
    );
  }

  if (activeOp === 'edge_sobel') {
    const p = params as SobelParams;
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Arah Gradien
          </label>
          <div className="grid grid-cols-3 gap-1 bg-subtleBg p-1 rounded border border-panelBorder">
            {(['combined', 'x', 'y'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => onChange({ direction: dir })}
                className={`py-1.5 px-2 text-xs font-medium rounded transition capitalize ${
                  p.direction === dir
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-[#2A2D34]'
                }`}
              >
                {dir === 'combined' ? 'Magnitudo' : `${dir.toUpperCase()}-Only`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText">Ukuran Kernel Sobel</label>
            <span className="font-mono text-xs text-white">{p.ksize}×{p.ksize}</span>
          </div>
          <div className="flex gap-2">
            {[3, 5].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onChange({ ksize: k })}
                className={`flex-1 py-1 text-xs rounded border ${
                  p.ksize === k
                    ? 'border-accent bg-accent/20 text-white font-medium'
                    : 'border-panelBorder bg-subtleBg text-mutedText hover:text-white'
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
      <div className="space-y-3">
        <div className="bg-subtleBg/60 border border-panelBorder p-3 rounded text-xs space-y-2">
          <p className="font-semibold text-white">Operator Diferensial Prewitt</p>
          <p className="text-[11px] text-mutedText leading-relaxed">
            Menghitung magnitudo diskontinuitas menggunakan kernel seragam bobot horizontal dan vertikal bernilai ±1.
          </p>
        </div>
      </div>
    );
  }

  if (activeOp === 'edge_laplacian') {
    const p = params as LaplacianParams;
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-2.5 text-xs text-white bg-subtleBg p-2.5 rounded border border-panelBorder cursor-pointer">
          <input
            type="checkbox"
            checked={p.pre_gaussian}
            onChange={(e) => onChange({ pre_gaussian: e.target.checked })}
            className="rounded bg-[#181A1F] border-panelBorder text-accent focus:ring-0"
          />
          <div>
            <span className="font-medium block">Pre-Gaussian Smoothing (LoG)</span>
            <span className="text-[10px] text-mutedText block">
              Meredam derau sebelum turunan kedua Laplacian
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
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText">Low Threshold</label>
            <span className="font-mono text-xs text-white">{p.low_threshold}</span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={p.low_threshold}
            onChange={(e) => handleLowChange(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-mutedText">High Threshold</label>
            <span className="font-mono text-xs text-white">{p.high_threshold}</span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={p.high_threshold}
            onChange={(e) => handleHighChange(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>

        <div className="bg-subtleBg/50 border border-panelBorder p-2.5 rounded text-[11px] text-mutedText">
          Validasi Aktif: <span className="font-mono text-white">Low ({p.low_threshold}) ≤ High ({p.high_threshold})</span> untuk hysteresis thresholding.
        </div>
      </div>
    );
  }

  if (activeOp === 'sketch') {
    const p = params as SketchParams;
    return (
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
              Ketebalan Arsir (Kernel Size)
            </label>
            <span className="font-mono text-xs text-white bg-subtleBg px-2 py-0.5 rounded border border-panelBorder">
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
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-mutedText font-mono mt-1">
            <span>Halus (3)</span>
            <span>Default (21)</span>
            <span>Tebal (51)</span>
          </div>
        </div>
        <p className="text-[11px] text-mutedText leading-relaxed bg-subtleBg/50 border border-panelBorder p-2.5 rounded">
          Metode Color Dodge Blend dengan guard pembagi minimal 1 mencegah pembagian dengan nol pada piksel terang.
        </p>
      </div>
    );
  }

  return null;
};
