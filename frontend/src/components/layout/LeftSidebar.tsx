import React, { useState } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Contrast,
  SunMedium,
  FlipVertical2,
  Binary,
  BarChartHorizontal,
  Sparkles,
  Grid,
  ShieldAlert,
  Layers,
  Table2,
  Zap,
  Compass,
  ScanLine,
  Activity,
  Focus,
  PenTool,
  FlipHorizontal2,
} from 'lucide-react';
import { OperationType } from '@/types/operations';
import {
  OPERATION_CATEGORIES,
  OperationIconName,
  filterOperationsByQuery,
} from '@/constants/operations';

interface LeftSidebarProps {
  activeOp: OperationType;
  onSelectOp: (op: OperationType) => void;
}

const ICON_MAP: Record<OperationIconName, React.FC<{ className?: string }>> = {
  Contrast,
  SunMedium,
  FlipVertical2,
  Binary,
  BarChartHorizontal,
  Sparkles,
  Grid,
  ShieldAlert,
  Layers,
  Table2,
  Zap,
  Compass,
  ScanLine,
  Activity,
  Focus,
  PenTool,
  FlipHorizontal2,
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeOp, onSelectOp }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const filteredOps = filterOperationsByQuery(searchQuery);
  const isSearching = searchQuery.trim().length > 0;

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <aside className="w-56 bg-panel border-r border-panelBorder flex flex-col select-none shrink-0 overflow-hidden">
      {/* Top-Docked Quick Search Input */}
      <div className="p-2.5 border-b border-panelBorder bg-panel shrink-0">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-mutedText absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari operasi..."
            className="w-full bg-white border border-panelBorder rounded pl-7 pr-6 py-1.5 text-xs text-textPrimary placeholder:text-mutedText/70 focus:outline-none focus:border-accent"
          />
          {isSearching && (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-mutedText hover:text-textPrimary cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Category Accordions */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredOps.length === 0 ? (
          <div className="p-4 text-center font-mono text-xs text-mutedText">
            Tidak ada operasi yang cocok
          </div>
        ) : (
          OPERATION_CATEGORIES.map((category) => {
            const opsInCategory = filteredOps.filter((op) => op.category === category);
            if (opsInCategory.length === 0) return null;

            const isCollapsed = !isSearching && !!collapsedCategories[category];

            return (
              <div key={category} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold text-mutedText hover:text-textPrimary uppercase tracking-wider border-b border-panelBorder/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-accent shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-accent shrink-0" />
                    )}
                    <span>{category}</span>
                  </span>
                  <span className="font-mono text-[10px] text-mutedText">
                    {opsInCategory.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5 pt-0.5">
                    {opsInCategory.map((op) => {
                      const isActive = activeOp === op.id;
                      const IconComponent = ICON_MAP[op.iconName];
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => onSelectOp(op.id)}
                          className={`w-full flex items-center gap-2 py-1.5 px-2.5 text-xs rounded transition text-left truncate cursor-pointer border ${
                            isActive
                              ? 'bg-subtleBg text-textPrimary font-semibold border-accent'
                              : 'bg-transparent text-mutedText hover:text-textPrimary hover:bg-subtleBg/50 border-transparent hover:border-panelBorder'
                          }`}
                        >
                          <IconComponent
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-accent' : 'text-mutedText'
                            }`}
                          />
                          <span className="truncate">{op.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
