import React, { useState, useRef } from 'react';
import {
  OperationType,
  AnyOperationParams,
  HistogramResult,
  HistoryStepItem,
} from '@/types/operations';
import { ToneColorControls } from '@/components/controls/ToneColorControls';
import { BlurControls } from '@/components/controls/BlurControls';
import { DetailControls } from '@/components/controls/DetailControls';
import { GeometryControls } from '@/components/controls/GeometryControls';
import { OPERATIONS, getOperationEquation } from '@/constants/operations';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Check, X, History, BarChart3, Download, Eye, EyeOff, Trash2 } from 'lucide-react';

interface RightInspectorProps {
  activeOp: OperationType;
  draftParams: AnyOperationParams;
  currentHistogram: HistogramResult | null;
  originalHistogram: HistogramResult | null;
  historyList: string[];
  historyIndex: number;
  historySteps?: HistoryStepItem[];
  otsuCalculatedT: number | null;
  isProcessing: boolean;
  hasImage: boolean;
  isCameraOpen?: boolean;
  isLiveFilter?: boolean;
  onUpdateParams: (params: Partial<AnyOperationParams>) => void;
  onApply: () => void;
  onCancel: () => void;
  onToggleHistoryStep?: (stepIndex: number) => void;
  onDeleteHistoryStep?: (stepIndex: number) => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  activeOp,
  draftParams,
  currentHistogram,
  originalHistogram,
  historyList,
  historyIndex,
  historySteps = [],
  otsuCalculatedT,
  isProcessing,
  hasImage,
  isCameraOpen = false,
  isLiveFilter = false,
  onUpdateParams,
  onApply,
  onCancel,
  onToggleHistoryStep,
  onDeleteHistoryStep,
}) => {
  const [histMode, setHistMode] = useState<'rgb' | 'gray'>('rgb');
  const chartRef = useRef<HTMLDivElement>(null);
  const effectiveHasImage = hasImage && !isCameraOpen;
  const hasActiveHistogram = effectiveHasImage || (isCameraOpen && isLiveFilter);
  const activeStats = currentHistogram?.stats ?? originalHistogram?.stats ?? null;

  const opMeta = OPERATIONS.find((o) => o.id === activeOp);
  const equationSpec = getOperationEquation(activeOp, draftParams);

  // Format layer label with compact parameter summary when not already formatted
  const formatLayerSummary = (layer: HistoryStepItem): string => {
    if (layer.label && layer.label.includes('(')) {
      return layer.label;
    }
    const entries = Object.entries(layer.params || {});
    if (entries.length === 0) {
      return layer.label || layer.operation;
    }
    const parts = entries.map(([k, v]) => {
      if (Array.isArray(v)) return `${v.length}×${v.length}`;
      if (typeof v === 'string') return v;
      return `${k}=${String(v)}`;
    });
    return `${layer.operation} (${parts.join(', ')})`;
  };
  const committedLayerItems: HistoryStepItem[] = React.useMemo(() => {
    if (historySteps.length > 0) {
      return historySteps;
    }
    return historyList.slice(1).map((step, idx) => ({
      id: `fallback-${idx}`,
      operation: step,
      params: {},
      label: step,
      enabled: true,
    }));
  }, [historySteps, historyList]);

  // Helper to build 256-bin chart data (0..255) for either Original or Current histogram
  const buildHistogramChartData = React.useCallback(
    (hist: HistogramResult | null) => {
      if (!hasActiveHistogram || !hist || !hist.channels || hist.channels.length === 0) {
        return [];
      }

      const data: { bin: number; red?: number; green?: number; blue?: number; gray?: number }[] =
        [];
      const chMap = new Map(hist.channels.map((c) => [c.channel, c.values]));

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
    },
    [hasActiveHistogram, histMode]
  );

  const originalChartData = React.useMemo(
    () => buildHistogramChartData(originalHistogram),
    [buildHistogramChartData, originalHistogram]
  );
  const currentChartData = React.useMemo(
    () => buildHistogramChartData(currentHistogram),
    [buildHistogramChartData, currentHistogram]
  );

  const renderHistogramChart = (
    data: { bin: number; red?: number; green?: number; blue?: number; gray?: number }[],
    emptyLabel: string
  ) => {
    if (isCameraOpen && !isLiveFilter) {
      return (
        <div className="h-full flex items-center justify-center text-[10px] text-mutedText font-mono text-center px-3">
          Turn on Live Filter or capture snapshot to view histogram
        </div>
      );
    }
    if (!hasActiveHistogram) {
      return (
        <div className="h-full flex items-center justify-center text-[11px] text-mutedText font-mono">
          {emptyLabel}
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-[10px] text-mutedText font-mono">
          Computing histogram...
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <XAxis dataKey="bin" type="number" domain={[0, 255]} hide />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const item = payload[0].payload;
              return (
                <div className="bg-white border border-panelBorder p-1.5 rounded-sm text-[10px] font-mono text-textPrimary">
                  <div className="font-bold">Bin: {item.bin}</div>
                  {item.red !== undefined && <div className="text-rose-600">R: {item.red}</div>}
                  {item.green !== undefined && (
                    <div className="text-emerald-600">G: {item.green}</div>
                  )}
                  {item.blue !== undefined && <div className="text-blue-600">B: {item.blue}</div>}
                  {item.gray !== undefined && (
                    <div className="text-textPrimary">Gray: {item.gray}</div>
                  )}
                </div>
              );
            }}
          />
          {histMode === 'rgb' ? (
            <>
              <Area
                type="monotone"
                dataKey="red"
                stroke="#EF4444"
                fill="#EF4444"
                fillOpacity={0.25}
                strokeWidth={1}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="green"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.25}
                strokeWidth={1}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="blue"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.25}
                strokeWidth={1}
                isAnimationActive={false}
              />
            </>
          ) : (
            <Area
              type="monotone"
              dataKey="gray"
              stroke="#C85A7C"
              fill="#C85A7C"
              fillOpacity={0.25}
              strokeWidth={1}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // Export Histogram chart as PNG
  const handleDownloadHistogramPng = () => {
    if (!hasActiveHistogram || !chartRef.current) return;
    const svgElems = chartRef.current.querySelectorAll('svg');
    const svgElem = svgElems[svgElems.length - 1] ?? svgElems[0];
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
    <aside className="w-80 bg-panel border-l border-panelBorder flex flex-col select-none shrink-0 overflow-hidden">
      {/* ------------------------------------------------------------------- */}
      {/* SECTION 1: VERTICAL STACKED HISTOGRAMS (ORIGINAL TOP, CURRENT BOTTOM) */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3 border-b border-panelBorder space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-textPrimary uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5 text-accent" />
            <span>Histogram</span>
            {isCameraOpen && isLiveFilter && (
              <span className="px-1.5 py-0.2 rounded-sm bg-subtleBg border border-accent text-[9px] font-mono text-accent font-semibold">
                LIVE 320PX
              </span>
            )}
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center gap-1">
            <div
              className={`flex bg-white rounded-sm border border-panelBorder divide-x divide-panelBorder text-[10px] font-mono overflow-hidden ${
                !hasActiveHistogram ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <button
                type="button"
                disabled={!hasActiveHistogram}
                onClick={() => setHistMode('rgb')}
                className={`px-1.5 py-0.5 transition cursor-pointer ${
                  histMode === 'rgb'
                    ? 'bg-subtleBg text-textPrimary font-semibold'
                    : 'text-mutedText hover:text-textPrimary'
                }`}
              >
                RGB
              </button>
              <button
                type="button"
                disabled={!hasActiveHistogram}
                onClick={() => setHistMode('gray')}
                className={`px-1.5 py-0.5 transition cursor-pointer ${
                  histMode === 'gray'
                    ? 'bg-subtleBg text-textPrimary font-semibold'
                    : 'text-mutedText hover:text-textPrimary'
                }`}
              >
                Luma
              </button>
            </div>

            <button
              type="button"
              disabled={!hasActiveHistogram}
              onClick={handleDownloadHistogramPng}
              title="Download Histogram Chart (PNG)"
              className="p-1 rounded-sm bg-white hover:bg-subtleBg border border-panelBorder text-mutedText hover:text-textPrimary transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Vertical Stacked Charts: Original (Top) & Current/Filtered (Bottom) */}
        <div
          ref={chartRef}
          data-testid="histogram-vertical-stack"
          className="flex flex-col gap-1.5 w-full"
        >
          {/* Top Chart: Histogram Original */}
          <div data-testid="histogram-chart-original" className="w-full space-y-0.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-mutedText uppercase px-0.5">
              <span className="font-semibold text-textPrimary">ORIGINAL</span>
              <span>
                {hasActiveHistogram && originalHistogram?.stats
                  ? `μ=${originalHistogram.stats.mean.toFixed(1)} • 0–255`
                  : 'SCALE: 0–255'}
              </span>
            </div>
            <div className="h-20 w-full bg-white rounded-sm border border-panelBorder p-1 flex items-center justify-center">
              {renderHistogramChart(originalChartData, 'No image loaded')}
            </div>
          </div>

          {/* Bottom Chart: Histogram Current (Filtered) */}
          <div data-testid="histogram-chart-current" className="w-full space-y-0.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-mutedText uppercase px-0.5">
              <span className="font-semibold text-accent">CURRENT (FILTERED)</span>
              <span>
                {hasActiveHistogram && currentHistogram?.stats
                  ? `μ=${currentHistogram.stats.mean.toFixed(1)} • 0–255`
                  : 'SCALE: 0–255'}
              </span>
            </div>
            <div className="h-20 w-full bg-white rounded-sm border border-panelBorder p-1 flex items-center justify-center">
              {renderHistogramChart(currentChartData, 'No image loaded')}
            </div>
          </div>
        </div>

        {/* 4-Column Monospace Tabular Stats */}
        {hasActiveHistogram && activeStats ? (
          <div className="grid grid-cols-4 gap-1 text-center font-mono">
            <div className="bg-white py-1 px-1 rounded-sm border border-panelBorder">
              <span className="block text-[9px] text-mutedText uppercase">MIN</span>
              <span className="block text-xs font-bold text-textPrimary tabular-nums">
                {activeStats.min.toFixed(0)}
              </span>
            </div>
            <div className="bg-white py-1 px-1 rounded-sm border border-panelBorder">
              <span className="block text-[9px] text-mutedText uppercase">MAX</span>
              <span className="block text-xs font-bold text-textPrimary tabular-nums">
                {activeStats.max.toFixed(0)}
              </span>
            </div>
            <div className="bg-white py-1 px-1 rounded-sm border border-panelBorder">
              <span className="block text-[9px] text-mutedText uppercase">MEAN</span>
              <span className="block text-xs font-bold text-textPrimary tabular-nums">
                {activeStats.mean.toFixed(1)}
              </span>
            </div>
            <div className="bg-white py-1 px-1 rounded-sm border border-panelBorder">
              <span className="block text-[9px] text-mutedText uppercase">STD</span>
              <span className="block text-xs font-bold text-textPrimary tabular-nums">
                {activeStats.std_dev.toFixed(1)}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 text-center font-mono opacity-50">
            {['MIN', 'MAX', 'MEAN', 'STD'].map((label) => (
              <div key={label} className="bg-subtleBg/50 py-1 px-1 rounded-sm border border-panelBorder/60">
                <span className="block text-[9px] text-mutedText uppercase">{label}</span>
                <span className="block text-xs text-mutedText tabular-nums">—</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 2: OPERATION PARAMETERS & TECHNICAL EQUATION SPECIFICATION */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3">
        <div>
          <div className="text-[10px] font-bold text-mutedText uppercase tracking-wider">
            {opMeta?.category || 'PARAMETERS'}
          </div>
          <h3 className="text-sm font-bold text-textPrimary tracking-tight">
            {opMeta?.label || activeOp}
          </h3>
          <p className="text-[11px] text-mutedText mt-0.5 leading-snug">
            {opMeta?.description}
          </p>
        </div>

        {/* Dedicated Technical Equation / Kernel Specification Box */}
        <div className="bg-black/[0.03] border border-panelBorder rounded-sm p-2 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-mutedText">
              EQUATION / KERNEL
            </span>
            <span className="text-[9px] font-mono text-accent font-semibold uppercase truncate">
              {equationSpec.title}
            </span>
          </div>
          <div className="font-mono text-[11px] text-textPrimary break-words leading-snug">
            {equationSpec.formula}
          </div>
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
        <div className="space-y-2 pt-2.5 border-t border-panelBorder">
          {isCameraOpen && (
            <p className="text-[11px] font-mono text-accent bg-subtleBg border border-accent/40 px-2.5 py-1.5 rounded-sm">
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
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm text-xs font-medium bg-white hover:bg-subtleBg text-textPrimary border border-panelBorder transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              disabled={!effectiveHasImage || isProcessing}
              onClick={onApply}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm text-xs font-semibold bg-accent hover:bg-accentHover text-white border border-accent transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Processing...' : 'Apply (Commit)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 3: EXPANDED PIPELINE HISTORY LAYER STACK (~34% height) */}
      {/* ------------------------------------------------------------------- */}
      <div className="h-[34%] min-h-[190px] border-t border-panelBorder p-3 flex flex-col shrink-0 bg-panel">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-textPrimary uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-accent" />
            <span>Pipeline History</span>
          </div>
          <span className="font-mono text-[10px] text-mutedText bg-subtleBg px-1.5 py-0.5 rounded-sm border border-panelBorder">
            {effectiveHasImage ? `${committedLayerItems.length} LAYERS` : '0 LAYERS'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {!effectiveHasImage || historyList.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[11px] font-mono text-mutedText border border-dashed border-panelBorder rounded-sm">
              Belum ada layer operasi
            </div>
          ) : (
            <>
              {/* Base Layer: 00 Original Image */}
              <div
                className={`flex items-center justify-between px-2 py-1.5 rounded-sm text-xs font-mono border ${
                  historyIndex === 0
                    ? 'bg-subtleBg border-accent text-textPrimary font-semibold'
                    : 'bg-white border-panelBorder text-mutedText'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[10px] ${
                      historyIndex === 0 ? 'text-accent font-bold' : 'text-mutedText'
                    }`}
                  >
                    00
                  </span>
                  <span className="truncate">Original Image</span>
                </div>
                <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded-sm bg-subtleBg border border-panelBorder text-mutedText">
                  BASE
                </span>
              </div>

              {/* Committed Filter Layers */}
              {committedLayerItems.map((layer, stepIdx) => {
                const listIndex = stepIdx + 1;
                const isCurrent = listIndex === historyIndex;
                const isFutureUndo = listIndex > historyIndex;

                return (
                  <div
                    key={layer.id || stepIdx}
                    className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-sm text-xs font-mono transition border ${
                      isCurrent
                        ? 'bg-subtleBg border-accent text-textPrimary font-semibold'
                        : isFutureUndo
                        ? 'bg-white/60 border-panelBorder/60 text-mutedText/60'
                        : 'bg-white border-panelBorder text-textPrimary'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`text-[10px] shrink-0 ${
                          isCurrent ? 'text-accent font-bold' : 'text-mutedText'
                        }`}
                      >
                        {String(listIndex).padStart(2, '0')}
                      </span>
                      <span
                        className={`truncate ${
                          !layer.enabled ? 'line-through text-mutedText/60' : ''
                        }`}
                        title={formatLayerSummary(layer)}
                      >
                        {formatLayerSummary(layer)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Toggle layer ${listIndex}`}
                        title={layer.enabled ? 'Sembunyikan layer' : 'Tampilkan layer'}
                        onClick={() => onToggleHistoryStep?.(stepIdx)}
                        className={`p-1 rounded-sm border transition cursor-pointer ${
                          layer.enabled
                            ? 'text-textPrimary border-transparent hover:border-panelBorder hover:bg-white'
                            : 'text-mutedText border-panelBorder bg-subtleBg/60'
                        }`}
                      >
                        {layer.enabled ? (
                          <Eye className="w-3.5 h-3.5 text-accent" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-mutedText" />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-label={`Delete layer ${listIndex}`}
                        title="Hapus layer dari pipeline"
                        onClick={() => onDeleteHistoryStep?.(stepIdx)}
                        className="p-1 rounded-sm border border-transparent text-mutedText hover:text-rose-600 hover:border-panelBorder hover:bg-white transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
