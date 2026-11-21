import React from 'react';
import { OperationType } from '@/types/operations';
import { OPERATIONS, OPERATION_CATEGORIES } from '@/constants/operations';
import {
  SunMedium,
  Palette,
  Contrast,
  Sparkles,
  Maximize,
  Grid,
  Zap,
  Activity,
  Layers,
  Scan,
  Compass,
  SquareCode,
  PenTool,
  FlipHorizontal,
  CircleDot,
  Gauge,
  Sliders,
} from 'lucide-react';

interface LeftSidebarProps {
  activeOp: OperationType;
  onSelectOp: (op: OperationType) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeOp, onSelectOp }) => {
  const getIcon = (id: OperationType) => {
    switch (id) {
      case 'grayscale':
        return <Palette className="w-3.5 h-3.5" />;
      case 'brightness':
        return <SunMedium className="w-3.5 h-3.5" />;
      case 'negative':
        return <Contrast className="w-3.5 h-3.5" />;
      case 'threshold':
        return <CircleDot className="w-3.5 h-3.5" />;
      case 'equalize':
        return <Sliders className="w-3.5 h-3.5" />;
      case 'blur_gaussian':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'blur_averaging':
        return <Maximize className="w-3.5 h-3.5" />;
      case 'blur_median':
        return <Grid className="w-3.5 h-3.5" />;
      case 'blur_bilateral':
        return <Zap className="w-3.5 h-3.5" />;
      case 'blur_filter2d':
        return <SquareCode className="w-3.5 h-3.5" />;
      case 'sharpen':
        return <Activity className="w-3.5 h-3.5" />;
      case 'edge_sobel':
        return <Compass className="w-3.5 h-3.5" />;
      case 'edge_prewitt':
        return <Gauge className="w-3.5 h-3.5" />;
      case 'edge_laplacian':
        return <Layers className="w-3.5 h-3.5" />;
      case 'edge_canny':
        return <Scan className="w-3.5 h-3.5" />;
      case 'sketch':
        return <PenTool className="w-3.5 h-3.5" />;
      case 'mirror':
        return <FlipHorizontal className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <aside className="w-60 bg-panel border-r border-panelBorder flex flex-col select-none shrink-0 overflow-y-auto">
      <div className="p-3 space-y-5">
        {OPERATION_CATEGORIES.map((category) => {
          const opsInCategory = OPERATIONS.filter((op) => op.category === category);
          return (
            <div key={category} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-mutedText uppercase tracking-wider">
                {category}
              </div>
              <div className="space-y-0.5">
                {opsInCategory.map((op) => {
                  const isActive = activeOp === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => onSelectOp(op.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded transition text-left group ${
                        isActive
                          ? 'bg-accent/15 text-white font-medium border-l-2 border-accent shadow-sm'
                          : 'text-gray-300 hover:text-white hover:bg-subtleBg border-l-2 border-transparent'
                      }`}
                    >
                      <span
                        className={`transition ${
                          isActive ? 'text-accent' : 'text-mutedText group-hover:text-white'
                        }`}
                      >
                        {getIcon(op.id)}
                      </span>
                      <span className="truncate">{op.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
