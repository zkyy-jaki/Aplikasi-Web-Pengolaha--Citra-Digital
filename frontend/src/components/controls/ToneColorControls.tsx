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
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Metode Grayscale
          </label>
          <div className="grid grid-cols-3 gap-1 bg-subtleBg p-1 rounded border border-panelBorder">
            {(['luminance', 'average', 'lightness'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onChange({ method })}
                className={`py-1.5 px-2 text-xs font-medium rounded transition capitalize ${
                  p.method === method
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-[#2A2D34]'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-mutedText leading-relaxed">
          {p.method === 'luminance' && 'Luminance (ITU-R BT.601): Y = 0.299R + 0.587G + 0.114B sesuai respon retina mata.'}
          {p.method === 'average' && 'Average: Y = (R + G + B) / 3 nilai rata-rata ketiga kanal warna.'}
          {p.method === 'lightness' && 'Lightness: Y = (max(R,G,B) + min(R,G,B)) / 2 desaturasi rentang extremum.'}
        </p>
      </div>
    );
  }

  if (activeOp === 'brightness') {
    const p = params as BrightnessParams;
    const beta = p.beta ?? 0;
    return (
      <div className="space-y-4">
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
              className="w-16 bg-subtleBg border border-panelBorder rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-none focus:border-accent"
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
        <div className="bg-subtleBg/50 border border-panelBorder p-2.5 rounded text-[11px] text-mutedText leading-relaxed">
          <span className="text-gray-300 font-medium">Safe Clamping:</span> Nilai intensitas di-clamp ketat ke [0, 255] dengan kalkulasi 16-bit untuk mencegah cacat wrap-around.
        </div>
      </div>
    );
  }

  if (activeOp === 'negative') {
    return (
      <div className="space-y-3">
        <div className="bg-subtleBg/60 border border-panelBorder p-3 rounded text-xs space-y-2">
          <p className="font-semibold text-white">Inversi Negatif (255 - I)</p>
          <p className="text-[11px] text-mutedText leading-relaxed">
            Membalik intensitas seluruh kanal warna RGB. Kanal transparansi Alpha (A) PNG dipertahankan penuh tanpa inversi.
          </p>
        </div>
      </div>
    );
  }

  if (activeOp === 'threshold') {
    const p = params as ThresholdParams;
    const isOtsu = p.method === 'otsu';
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Metode Thresholding
          </label>
          <select
            value={p.method}
            onChange={(e) => onChange({ method: e.target.value as ThresholdParams['method'] })}
            className="w-full bg-subtleBg border border-panelBorder text-xs rounded px-2.5 py-2 text-white focus:outline-none focus:border-accent"
          >
            <option value="binary">Binary (I &gt; T → 255, else 0)</option>
            <option value="binary_inv">Binary Invert (I &gt; T → 0, else 255)</option>
            <option value="truncate">Truncate (I &gt; T → T, else I)</option>
            <option value="to_zero">To Zero (I &gt; T → I, else 0)</option>
            <option value="otsu">Otsu's Automatic Threshold</option>
          </select>
        </div>

        {!isOtsu ? (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-mutedText uppercase tracking-wider">
                Ambang Batas (T)
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
                className="w-16 bg-subtleBg border border-panelBorder rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-none focus:border-accent"
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
          <div className="bg-subtleBg/70 border border-panelBorder p-3 rounded text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-mutedText">Otsu Calculated Threshold:</span>
              <span className="font-mono font-bold text-accent text-sm">
                {otsuCalculatedT !== null ? otsuCalculatedT : 'Menghitung...'}
              </span>
            </div>
            <p className="text-[11px] text-mutedText leading-relaxed">
              Algoritma Otsu menghitung ambang batas optimal secara otomatis dengan meminimalkan varians intra-kelas.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (activeOp === 'equalize') {
    const p = params as EqualizeParams;
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Mode Equalization
          </label>
          <div className="grid grid-cols-2 gap-1 bg-subtleBg p-1 rounded border border-panelBorder">
            <button
              type="button"
              onClick={() => onChange({ mode: 'global' })}
              className={`py-1.5 px-2 text-xs font-medium rounded transition ${
                p.mode === 'global'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-[#2A2D34]'
              }`}
            >
              Global YCrCb
            </button>
            <button
              type="button"
              onClick={() => onChange({ mode: 'clahe' })}
              className={`py-1.5 px-2 text-xs font-medium rounded transition ${
                p.mode === 'clahe'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-[#2A2D34]'
              }`}
            >
              Adaptive (CLAHE)
            </button>
          </div>
        </div>

        {p.mode === 'global' ? (
          <p className="text-[11px] text-mutedText leading-relaxed bg-subtleBg/50 border border-panelBorder p-2.5 rounded">
            <span className="text-gray-300 font-medium">Luminance-Only:</span> Meratakan histogram kanal luminansi Y pada ruang warna YCrCb untuk mencegah pergeseran warna (color shift).
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-mutedText">Clip Limit</label>
                <span className="font-mono text-xs text-white">{p.clip_limit}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={10.0}
                step={0.1}
                value={p.clip_limit}
                onChange={(e) => onChange({ clip_limit: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-mutedText">Tile Grid Size</label>
                <span className="font-mono text-xs text-white">{p.tile_grid_size}×{p.tile_grid_size}</span>
              </div>
              <input
                type="range"
                min={2}
                max={32}
                step={2}
                value={p.tile_grid_size}
                onChange={(e) => onChange({ tile_grid_size: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
