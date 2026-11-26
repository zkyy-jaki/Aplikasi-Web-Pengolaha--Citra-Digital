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
  hasImage: boolean;
  isCameraOpen?: boolean;
  isLiveFilter?: boolean;
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
  hasImage,
  isCameraOpen = false,
  isLiveFilter = false,
  onUpdateParams,
  onApply,
  onCancel,
}) => {
  const [histMode, setHistMode] = useState<'rgb' | 'gray'>('rgb');
  const [histTarget, setHistTarget] = useState<'current' | 'original'>('current');
  const chartRef = useRef<HTMLDivElement>(null);
  const effectiveHasImage = hasImage && !isCameraOpen;

  const activeHist = histTarget === 'current' ? currentHistogram : originalHistogram;
  const opMeta = OPERATIONS.find((o) => o.id === activeOp);

  // Prepare chart data (256 bins)
  const chartData = React.useMemo(() => {
    if (!effectiveHasImage || !activeHist || !activeHist.channels || activeHist.channels.length === 0) {
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
  }, [effectiveHasImage, activeHist, histMode]);

  // Export Histogram chart as PNG
  const handleDownloadHistogramPng = () => {
    if (!effectiveHasImage || !chartRef.current) return;
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
      ctx.fillStyle = '#FFF8FA';
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
          <div className="flex items-center gap-1.5 text-xs font-bold text-textPrimary uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5 text-accent" />
            <span>Histogram</span>
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center gap-1">
            <div className={`flex bg-subtleBg p-0.5 rounded-sm border border-panelBorder text-[10px] font-mono ${!effectiveHasImage ? 'opacity-40 pointer-events-none' : ''}`}>
              <button
                type="button"
                disabled={!effectiveHasImage}
                onClick={() => setHistMode('rgb')}
                className={`px-1.5 py-0.5 rounded-sm transition cursor-pointer ${
                  histMode === 'rgb' ? 'bg-white text-textPrimary font-semibold shadow-xs' : 'text-mutedText hover:text-textPrimary'
                }`}
              >
                RGB
              </button>
              <button
                type="button"
                disabled={!effectiveHasImage}
                onClick={() => setHistMode('gray')}
                className={`px-1.5 py-0.5 rounded-sm transition cursor-pointer ${
                  histMode === 'gray' ? 'bg-white text-textPrimary font-semibold shadow-xs' : 'text-mutedText hover:text-textPrimary'
                }`}
              >
                Luma
              </button>
            </div>

            <div className={`flex bg-subtleBg p-0.5 rounded-sm border border-panelBorder text-[10px] ${!effectiveHasImage ? 'opacity-40 pointer-events-none' : ''}`}>
              <button
                type="button"
                disabled={!effectiveHasImage}
                onClick={() => setHistTarget('current')}
                className={`px-1.5 py-0.5 rounded-sm transition cursor-pointer ${
                  histTarget === 'current' ? 'bg-white text-textPrimary font-semibold shadow-xs' : 'text-mutedText hover:text-textPrimary'
                }`}
              >
                Cur
              </button>
              <button
                type="button"
                disabled={!effectiveHasImage}
                onClick={() => setHistTarget('original')}
                className={`px-1.5 py-0.5 rounded-sm transition cursor-pointer ${
                  histTarget === 'original' ? 'bg-white text-textPrimary font-semibold shadow-xs' : 'text-mutedText hover:text-textPrimary'
                }`}
              >
                Orig
              </button>
            </div>

            <button
              type="button"
              disabled={!effectiveHasImage}
              onClick={handleDownloadHistogramPng}
              title="Download Histogram Chart (PNG)"
              className="p-1 rounded-sm bg-subtleBg hover:bg-[#F5D8E2] border border-panelBorder text-mutedText hover:text-textPrimary transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div ref={chartRef} className="h-28 w-full bg-white rounded-sm border border-panelBorder p-1 flex items-center justify-center">
          {isCameraOpen ? (
            <div className="h-full flex items-center justify-center text-[11px] text-mutedText font-mono text-center px-3">
              Stateless camera mode — capture a snapshot to compute histogram
            </div>
          ) : !effectiveHasImage ? (
            <div className="h-full flex items-center justify-center text-xs text-mutedText font-mono">
              No image loaded
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <XAxis dataKey="bin" hide />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white border border-panelBorder p-1.5 rounded-sm text-[10px] font-mono text-textPrimary shadow-md">
                        <div className="font-bold">Bin: {item.bin}</div>
                        {item.red !== undefined && <div className="text-rose-600">R: {item.red}</div>}
                        {item.green !== undefined && <div className="text-emerald-600">G: {item.green}</div>}
                        {item.blue !== undefined && <div className="text-blue-600">B: {item.blue}</div>}
                        {item.gray !== undefined && <div className="text-textPrimary">Gray: {item.gray}</div>}
                      </div>
                    );
                  }}
                />
                {histMode === 'rgb' ? (
                  <>
                    <Area type="monotone" dataKey="red" stroke="#EF4444" fill="#EF4444" fillOpacity={0.25} strokeWidth={1} isAnimationActive={false} />
                    <Area type="monotone" dataKey="green" stroke="#10B981" fill="#10B981" fillOpacity={0.25} strokeWidth={1} isAnimationActive={false} />
                    <Area type="monotone" dataKey="blue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} strokeWidth={1} isAnimationActive={false} />
                  </>
                ) : (
                  <Area type="monotone" dataKey="gray" stroke="#C85A7C" fill="#C85A7C" fillOpacity={0.25} strokeWidth={1} isAnimationActive={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[10px] text-mutedText font-mono">
              Computing histogram...
            </div>
          )}
        </div>

        {/* Tabular Monospace Stats */}
        {effectiveHasImage && activeHist?.stats ? (
          <div className="grid grid-cols-4 gap-1 text-center font-mono">
            <div className="bg-white p-1 rounded-sm border border-panelBorder shadow-xs">
              <span className="block text-[9px] text-mutedText uppercase">Min</span>
              <span className="block text-xs font-bold text-textPrimary tabular-nums">
                {activeHist.stats.min.toFixed(0)}
              </span>
            </div>
            <div className="bg-white p-1 rounded-sm border border-panelBorder shadow-xs">
              <span className="block text-[9px] text-mutedText uppercase">Max</span>
              <span className="block text-xs font-bold text-textPrimary tabular-nums">
                {activeHist.stats.max.toFixed(0)}
              </span>
            </div>
            <div className="bg-white p-1 rounded-sm border border-panelBorder shadow-xs">
              <span className="block text-[9px] text-mutedText uppercase">Mean</span>
              <span className="block text-xs font-bold text-textPrimary tabular-nums">
                {activeHist.stats.mean.toFixed(1)}
              </span>
            </div>
            <div className="bg-white p-1 rounded-sm border border-panelBorder shadow-xs">
              <span className="block text-[9px] text-mutedText uppercase">Std</span>
              <span className="block text-xs font-bold text-textPrimary tabular-nums">
                {activeHist.stats.std_dev.toFixed(1)}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 text-center font-mono opacity-50">
            {['Min', 'Max', 'Mean', 'Std'].map((label) => (
              <div key={label} className="bg-subtleBg/50 p-1 rounded-sm border border-panelBorder/60">
                <span className="block text-[9px] text-mutedText uppercase">{label}</span>
                <span className="block text-xs text-mutedText tabular-nums">—</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 2: DYNAMIC PARAMETER CONTROLS */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3.5 border-b border-panelBorder flex-1 space-y-4">
        <div>
          <div className="text-[10px] font-bold text-mutedText uppercase tracking-wider">
            {opMeta?.category || 'PARAMETERS'}
          </div>
          <h3 className="text-sm font-bold text-textPrimary tracking-tight">
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
        <div className="space-y-2 pt-3 border-t border-panelBorder">
          {isCameraOpen && (
            <p className="text-[11px] font-mono text-accent bg-subtleBg border border-accent/30 px-2.5 py-1.5 rounded-sm">
              {isLiveFilter
                ? 'Live preview is stateless. Click "Capture Snapshot" to edit & commit to history.'
                : 'Turn on "Live Filter" to preview operations on camera, or click "Capture Snapshot".'}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!effectiveHasImage}
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm text-xs font-medium bg-subtleBg hover:bg-[#F5D8E2] text-textPrimary border border-panelBorder transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              disabled={!effectiveHasImage || isProcessing}
              onClick={onApply}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm text-xs font-semibold bg-accent hover:bg-accentHover text-white shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Processing...' : 'Apply (Commit)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 3: PIPELINE HISTORY STACK */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3.5 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-textPrimary uppercase tracking-wider">
          <History className="w-3.5 h-3.5 text-accent" />
          <span>Pipeline History</span>
        </div>

        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {historyList.map((step, idx) => {
            const isCurrent = idx === historyIndex;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs font-mono transition border ${
                  isCurrent
                    ? 'bg-[#FCEAF0] border-[#C85A7C] text-textPrimary font-semibold shadow-xs'
                    : 'bg-white border-panelBorder text-mutedText'
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
