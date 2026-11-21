import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ToastErrorProps {
  title: string;
  detail?: string | null;
  onDismiss: () => void;
}

export const ToastError: React.FC<ToastErrorProps> = ({ title, detail, onDismiss }) => {
  return (
    <div className="fixed bottom-8 right-8 z-50 max-w-sm w-full bg-white border border-rose-300 rounded-sm shadow-xl p-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-rose-900">{title}</p>
        {detail && <p className="text-[11px] text-rose-700/90 font-mono mt-0.5 break-words">{detail}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-rose-400 hover:text-rose-700 transition shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
