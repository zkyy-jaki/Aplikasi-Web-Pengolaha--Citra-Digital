import React, { useState } from 'react';
import { X, Download, BarChart2 } from 'lucide-react';
import { downloadExportImage } from '@/services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  defaultFilename: string;
  onDownloadHistogram: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  defaultFilename,
  onDownloadHistogram,
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'bmp'>('png');
  const [quality, setQuality] = useState<number>(90);
  const [customName, setCustomName] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseName = defaultFilename.replace(/\.[^/.]+$/, '');
  const ext = format === 'jpeg' ? 'jpg' : format;
  const computedFilename = customName.trim()
    ? `${customName.trim()}.${ext}`
    : `${baseName}_processed.${ext}`;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await downloadExportImage(sessionId, format, quality, computedFilename);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export image file');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-panel border border-panelBorder rounded-sm w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-panelBorder bg-white">
          <h2 className="text-sm font-bold text-textPrimary tracking-tight">Export Processed Image</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-mutedText hover:text-textPrimary transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-rose-50 border border-rose-300 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-1.5">
              File Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'jpeg', 'bmp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`py-2 px-3 rounded-sm text-xs font-semibold uppercase border transition cursor-pointer ${
                    format === fmt
                      ? 'border-accent bg-subtleBg text-accent shadow-xs'
                      : 'border-panelBorder bg-white text-mutedText hover:text-textPrimary'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider (JPEG only) */}
          {format === 'jpeg' && (
            <div className="bg-subtleBg/70 p-3 rounded-sm border border-panelBorder space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-mutedText font-semibold">JPEG Quality</span>
                <span className="font-mono text-textPrimary font-bold">{quality}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-mutedText font-mono">
                <span>10% (Lowest)</span>
                <span>90% (Optimal)</span>
                <span>100% (Maximum)</span>
              </div>
            </div>
          )}

          {/* Filename Input */}
          <div>
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-1.5">
              File Name
            </label>
            <div className="flex items-center bg-white border border-panelBorder rounded-sm px-3 py-1.5 text-xs">
              <input
                type="text"
                placeholder={baseName + '_processed'}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="bg-transparent flex-1 text-textPrimary focus:outline-none font-mono"
              />
              <span className="text-mutedText font-mono ml-1">.{ext}</span>
            </div>
          </div>

          {/* Histogram Download Action */}
          <div className="pt-2 border-t border-panelBorder">
            <button
              type="button"
              onClick={onDownloadHistogram}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-sm border border-panelBorder bg-white text-xs font-medium text-textPrimary hover:bg-subtleBg transition cursor-pointer shadow-xs"
            >
              <BarChart2 className="w-3.5 h-3.5 text-accent" />
              <span>Download Current Histogram Chart (PNG)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 bg-white border-t border-panelBorder">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-sm text-xs text-mutedText hover:text-textPrimary transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-sm text-xs font-semibold bg-accent text-white hover:bg-accentHover transition disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Download Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
