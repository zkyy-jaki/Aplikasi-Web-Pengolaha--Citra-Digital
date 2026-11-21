import React from 'react';
import {
  OperationType,
  AnyOperationParams,
  MirrorParams,
  MirrorDirection,
} from '@/types/operations';
import { FlipHorizontal, FlipVertical, Move } from 'lucide-react';

interface GeometryControlsProps {
  activeOp: OperationType;
  params: AnyOperationParams;
  onChange: (params: Partial<AnyOperationParams>) => void;
}

export const GeometryControls: React.FC<GeometryControlsProps> = ({
  activeOp,
  params,
  onChange,
}) => {
  if (activeOp === 'mirror') {
    const p = params as MirrorParams;
    const directions: { dir: MirrorDirection; label: string; icon: React.ReactNode }[] = [
      { dir: 'horizontal', label: 'Horizontal Flip', icon: <FlipHorizontal className="w-4 h-4" /> },
      { dir: 'vertical', label: 'Vertical Flip', icon: <FlipVertical className="w-4 h-4" /> },
      { dir: 'both', label: 'Both Axes', icon: <Move className="w-4 h-4" /> },
    ];

    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Arah Pencerminan
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {directions.map(({ dir, label, icon }) => (
              <button
                key={dir}
                type="button"
                onClick={() => onChange({ direction: dir })}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs transition border ${
                  p.direction === dir
                    ? 'bg-accent text-white border-accent font-medium shadow-sm'
                    : 'bg-subtleBg text-gray-300 border-panelBorder hover:text-white hover:bg-[#2A2D34]'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-mutedText leading-relaxed bg-subtleBg/50 border border-panelBorder p-2.5 rounded">
          Membalik posisi koordinat piksel tanpa mengubah nilai intensitas. Kanal Alpha ikut dicerminkan secara identik.
        </p>
      </div>
    );
  }

  return null;
};
