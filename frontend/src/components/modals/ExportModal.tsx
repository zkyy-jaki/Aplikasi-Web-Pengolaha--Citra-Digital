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
      setError(err instanceof Error ? err.message : 'Gagal mengekspor berkas');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-[#181A1F] border border-[#2A2D34] rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2D34]">
          <h2 className="text-sm font-semibold text-white tracking-wide">Simpan Citra (Export)</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-mutedText hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-2">
              Format Berkas
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'jpeg', 'bmp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`py-2 px-3 rounded text-xs font-medium uppercase border transition ${
                    format === fmt
                      ? 'border-accent bg-accent/20 text-white font-bold'
                      : 'border-[#2A2D34] bg-[#21242B] text-mutedText hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider (JPEG only) */}
          {format === 'jpeg' && (
            <div className="bg-[#21242B] p-3 rounded border border-[#2A2D34] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-mutedText">Kualitas JPEG</span>
                <span className="font-mono text-white font-bold">{quality}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-mutedText font-mono">
                <span>10% (Terkecil)</span>
                <span>90% (Optimal)</span>
                <span>100% (Maksimal)</span>
              </div>
            </div>
          )}

          {/* Filename Input */}
          <div>
            <label className="text-xs font-semibold text-mutedText uppercase tracking-wider block mb-1.5">
              Nama Berkas
            </label>
            <div className="flex items-center bg-[#21242B] border border-[#2A2D34] rounded px-3 py-2 text-xs">
              <input
                type="text"
                placeholder={baseName + '_processed'}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="bg-transparent flex-1 text-white focus:outline-none font-mono"
              />
              <span className="text-mutedText font-mono ml-1">.{ext}</span>
            </div>
          </div>

          {/* Histogram Download Bonus */}
          <div className="pt-2 border-t border-[#2A2D34]">
            <button
              type="button"
              onClick={onDownloadHistogram}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded border border-[#2A2D34] bg-[#21242B] text-xs text-mutedText hover:text-white hover:border-gray-500 transition"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Unduh Grafik Histogram Saat Ini (PNG)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-[#14161A] border-t border-[#2A2D34]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs text-mutedText hover:text-white transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Mengekspor...' : 'Unduh Citra'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
