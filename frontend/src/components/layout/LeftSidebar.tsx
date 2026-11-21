import React from 'react';
import { OperationType } from '@/types/operations';
import { OPERATIONS, OPERATION_CATEGORIES } from '@/constants/operations';

interface LeftSidebarProps {
  activeOp: OperationType;
  onSelectOp: (op: OperationType) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeOp, onSelectOp }) => {
  return (
    <aside className="w-56 bg-panel border-r border-panelBorder flex flex-col select-none shrink-0 overflow-y-auto">
      <div className="p-3 space-y-4">
        {OPERATION_CATEGORIES.map((category) => {
          const opsInCategory = OPERATIONS.filter((op) => op.category === category);
          return (
            <div key={category} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-mutedText uppercase tracking-wider">
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
                      className={`w-full py-1.5 px-3 text-[13px] rounded-sm transition text-left truncate cursor-pointer ${
                        isActive
                          ? 'bg-[#FCEAF0] text-[#2B1F24] font-medium border-l-2 border-[#C85A7C]'
                          : 'text-[#7A636C] hover:text-[#2B1F24] hover:bg-[#FCEAF0]/60 border-l-2 border-transparent'
                      }`}
                    >
                      {op.label}
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
