import React, { useState, useRef } from 'react';
import {
  OperationType,
  AnyOperationParams,
  HistogramResult,
} from '@/types/operations';
import { ToneColorControls } from '@/components/controls/ToneColorControls';
import { BlurControls } from '@/components/controls/BlurControls';
import { DetailControls } from '@/components/controls/DetailControls';
import { GeometryControls } from '@/components/controls/GeometryControls';
import { OPERATIONS } from '@/constants/operations';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Check, X, History, BarChart3, Download } from 'lucide-react';

interface RightInspectorProps {
  activeOp: OperationType;
  draftParams: AnyOperationParams;
  currentHistogram: HistogramResult | null;
  originalHistogram: HistogramResult | null;
  historyList: string[];
  historyIndex: number;
  otsuCalculatedT: number | null;
  isProcessing: boolean;
  onUpdateParams: (params: Partial<AnyOperationParams>) => void;
  onApply: () => void;
  onCancel: () => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  activeOp,
  draftParams,
  currentHistogram,
  originalHistogram,
  historyList,
  historyIndex,
  otsuCalculatedT,
  isProcessing,
  onUpdateParams,
  onApply,
  onCancel,
}) => {
  const [histMode, setHistMode] = useState<'rgb' | 'gray'>('rgb');
  const [histTarget, setHistTarget] = useState<'current' | 'original'>('current');
  const chartRef = useRef<HTMLDivElement>(null);

  const activeHist = histTarget === 'current' ? currentHistogram : originalHistogram;
  const opMeta = OPERATIONS.find((o) => o.id === activeOp);

  // Prepare chart data (256 bins)
  const chartData = React.useMemo(() => {
    if (!activeHist || !activeHist.channels || activeHist.channels.length === 0) {
      return [];
    }

    const data: { bin: number; red?: number; green?: number; blue?: number; gray?: number }[] = [];
    const chMap = new Map(activeHist.channels.map((c) => [c.channel, c.values]));

    const redVals = chMap.get('red');
    const greenVals = chMap.get('green');
    const blueVals = chMap.get('blue');
    const grayVals = chMap.get('gray');

    for (let i = 0; i < 256; i++) {
      if (histMode === 'rgb' && redVals && greenVals && blueVals) {
        data.push({
          bin: i,
          red: redVals[i] || 0,
          green: greenVals[i] || 0,
          blue: blueVals[i] || 0,
        });
      } else {
        // Gray / Luma fallback
        const gVal =
          grayVals?.[i] ??
          (redVals && greenVals && blueVals
            ? Math.round(0.299 * redVals[i] + 0.587 * greenVals[i] + 0.114 * blueVals[i])
            : 0);
        data.push({
          bin: i,
          gray: gVal,
        });
      }
    }
    return data;
  }, [activeHist, histMode]);

  // Export Histogram chart as PNG
  const handleDownloadHistogramPng = () => {
    if (!chartRef.current) return;
    const svgElem = chartRef.current.querySelector('svg');
    if (!svgElem) return;

    const svgData = new XMLSerializer().serializeToString(svgElem);
    const canvas = document.createElement('canvas');
    const svgSize = svgElem.getBoundingClientRect();
    canvas.width = svgSize.width * 2;
    canvas.height = svgSize.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    const img = new Image();
    img.setAttribute('src', 'data:image/svg+xml;base64,' + btoa(svgData));
    img.onload = () => {
      ctx.fillStyle = '#181A1F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `histogram_${Date.now()}.png`;
      a.click();
    };
  };

  return (
    <aside className="w-80 bg-panel border-l border-panelBorder flex flex-col select-none shrink-0 overflow-y-auto">
      {/* ------------------------------------------------------------------- */}
      {/* SECTION 1: HISTOGRAM (~35% height) */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3.5 border-b border-panelBorder space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5 text-accent" />
            <span>Histogram</span>
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center gap-1">
            <div className="flex bg-subtleBg p-0.5 rounded border border-panelBorder text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setHistMode('rgb')}
                className={`px-1.5 py-0.5 rounded ${
                  histMode === 'rgb' ? 'bg-[#2A2D34] text-white' : 'text-mutedText'
                }`}
              >
                RGB
              </button>
              <button
                type="button"
                onClick={() => setHistMode('gray')}
                className={`px-1.5 py-0.5 rounded ${
                  histMode === 'gray' ? 'bg-[#2A2D34] text-white' : 'text-mutedText'
                }`}
              >
                Luma
              </button>
            </div>

            <div className="flex bg-subtleBg p-0.5 rounded border border-panelBorder text-[10px]">
              <button
                type="button"
                onClick={() => setHistTarget('current')}
                className={`px-1.5 py-0.5 rounded ${
                  histTarget === 'current' ? 'bg-[#2A2D34] text-white' : 'text-mutedText'
                }`}
              >
                Cur
              </button>
              <button
                type="button"
                onClick={() => setHistTarget('original')}
                className={`px-1.5 py-0.5 rounded ${
                  histTarget === 'original' ? 'bg-[#2A2D34] text-white' : 'text-mutedText'
                }`}
              >
                Orig
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadHistogramPng}
              title="Unduh Grafik Histogram (PNG)"
              className="p-1 rounded bg-subtleBg hover:bg-[#2A2D34] border border-panelBorder text-mutedText hover:text-white transition"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div ref={chartRef} className="h-28 w-full bg-subtleBg/50 rounded border border-panelBorder p-1">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <XAxis dataKey="bin" hide />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-[#14161A] border border-panelBorder p-1.5 rounded text-[10px] font-mono text-white shadow-xl">
                        <div>Bin: {item.bin}</div>
                        {item.red !== undefined && <div className="text-rose-400">R: {item.red}</div>}
                        {item.green !== undefined && <div className="text-emerald-400">G: {item.green}</div>}
                        {item.blue !== undefined && <div className="text-blue-400">B: {item.blue}</div>}
                        {item.gray !== undefined && <div className="text-gray-300">Gray: {item.gray}</div>}
                      </div>
                    );
                  }}
                />
                {histMode === 'rgb' ? (
                  <>
                    <Area type="monotone" dataKey="red" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
                    <Area type="monotone" dataKey="green" stroke="#10B981" fill="#10B981" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
                    <Area type="monotone" dataKey="blue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
                  </>
                ) : (
                  <Area type="monotone" dataKey="gray" stroke="#E2E8F0" fill="#E2E8F0" fillOpacity={0.25} strokeWidth={1} isAnimationActive={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[10px] text-mutedText font-mono">
              Memuat data histogram...
            </div>
          )}
        </div>

        {/* Tabular Monospace Stats */}
        {activeHist?.stats && (
          <div className="grid grid-cols-4 gap-1 text-center font-mono">
            <div className="bg-subtleBg p-1 rounded border border-panelBorder">
              <span className="block text-[9px] text-mutedText uppercase">Min</span>
              <span className="block text-xs font-bold text-white tabular-nums">
                {activeHist.stats.min.toFixed(0)}
              </span>
            </div>
            <div className="bg-subtleBg p-1 rounded border border-panelBorder">
              <span className="block text-[9px] text-mutedText uppercase">Max</span>
              <span className="block text-xs font-bold text-white tabular-nums">
                {activeHist.stats.max.toFixed(0)}
              </span>
            </div>
            <div className="bg-subtleBg p-1 rounded border border-panelBorder">
              <span className="block text-[9px] text-mutedText uppercase">Mean</span>
              <span className="block text-xs font-bold text-white tabular-nums">
                {activeHist.stats.mean.toFixed(1)}
              </span>
            </div>
            <div className="bg-subtleBg p-1 rounded border border-panelBorder">
              <span className="block text-[9px] text-mutedText uppercase">Std</span>
              <span className="block text-xs font-bold text-white tabular-nums">
                {activeHist.stats.std_dev.toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 2: DYNAMIC PARAMETER CONTROLS */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3.5 border-b border-panelBorder flex-1 space-y-4">
        <div>
          <div className="text-[10px] font-bold text-mutedText uppercase tracking-wider">
            {opMeta?.category || 'PARAMETER'}
          </div>
          <h3 className="text-sm font-bold text-white tracking-wide">
            {opMeta?.label || activeOp}
          </h3>
          <p className="text-[11px] text-mutedText mt-0.5 leading-relaxed">
            {opMeta?.description}
          </p>
        </div>

        {/* Dynamic Controls Per Category */}
        <div className="pt-2 border-t border-panelBorder">
          <ToneColorControls
            activeOp={activeOp}
            params={draftParams}
            onChange={onUpdateParams}
            otsuCalculatedT={otsuCalculatedT}
          />
          <BlurControls
            activeOp={activeOp}
            params={draftParams}
            onChange={onUpdateParams}
          />
          <DetailControls
            activeOp={activeOp}
            params={draftParams}
            onChange={onUpdateParams}
          />
          <GeometryControls
            activeOp={activeOp}
            params={draftParams}
            onChange={onUpdateParams}
          />
        </div>

        {/* Action Buttons: Cancel & Apply */}
        <div className="flex gap-2 pt-3 border-t border-panelBorder">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-medium bg-subtleBg hover:bg-[#2A2D34] text-mutedText hover:text-white border border-panelBorder transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-bold bg-accent hover:bg-accentHover text-white shadow-md transition disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Memproses...' : 'Apply (Commit)'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 3: PIPELINE HISTORY STACK */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3.5 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <History className="w-3.5 h-3.5 text-accent" />
          <span>Pipeline History</span>
        </div>

        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {historyList.map((step, idx) => {
            const isCurrent = idx === historyIndex;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono transition border ${
                  isCurrent
                    ? 'bg-accent/15 border-accent text-white font-medium'
                    : 'bg-subtleBg/50 border-panelBorder text-mutedText'
                }`}
              >
                <span className={`text-[10px] ${isCurrent ? 'text-accent font-bold' : 'text-mutedText'}`}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="truncate">{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
