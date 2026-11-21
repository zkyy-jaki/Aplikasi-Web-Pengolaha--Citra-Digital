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
    const currentDir = p.direction ?? 'none';

    // State derivation from currentDir (Option A: Accumulative Toggle Model)
    const isHorizActive = currentDir === 'horizontal' || currentDir === 'both';
    const isVertActive = currentDir === 'vertical' || currentDir === 'both';

    const getDirectionFromAxes = (horiz: boolean, vert: boolean): MirrorDirection => {
      if (horiz && vert) return 'both';
      if (horiz) return 'horizontal';
      if (vert) return 'vertical';
      return 'none';
    };

    const handleToggle = (type: 'horizontal' | 'vertical' | 'both') => {
      let nextHoriz = isHorizActive;
      let nextVert = isVertActive;

      if (type === 'horizontal') {
        nextHoriz = !isHorizActive;
      } else if (type === 'vertical') {
        nextVert = !isVertActive;
      } else if (type === 'both') {
        nextHoriz = !isHorizActive;
        nextVert = !isVertActive;
      }

      onChange({ direction: getDirectionFromAxes(nextHoriz, nextVert) });
    };

    const isBothActive = isHorizActive && isVertActive;

    const directions: {
      type: 'horizontal' | 'vertical' | 'both';
      label: string;
      isActive: boolean;
      icon: React.ReactNode;
    }[] = [
      {
        type: 'horizontal',
        label: 'Horizontal Flip',
        isActive: isHorizActive,
        icon: <FlipHorizontal className="w-4 h-4" />,
      },
      {
        type: 'vertical',
        label: 'Vertical Flip',
        isActive: isVertActive,
        icon: <FlipVertical className="w-4 h-4" />,
      },
      {
        type: 'both',
        label: 'Both Axes',
        isActive: isBothActive,
        icon: <Move className="w-4 h-4" />,
      },
    ];

    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
            Mirror Direction
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {directions.map(({ type, label, isActive, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleToggle(type)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs transition border cursor-pointer ${
                  isActive
                    ? 'bg-accent text-white border-accent font-semibold shadow-xs'
                    : 'bg-white text-mutedText border-panelBorder hover:text-textPrimary hover:bg-subtleBg'
                }`}
              >
                {icon}
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto text-[10px] font-mono bg-white/20 px-1.5 py-0.2 rounded-xs">
                    ACTIVE
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-mutedText leading-relaxed bg-subtleBg/70 border border-panelBorder p-2.5 rounded-sm">
          Flips pixel coordinate indices without modifying intensity values. PNG Alpha transparency channel is mirrored identically.
        </p>
      </div>
    );
  }

  return null;
};
