'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Maximize, BarChart } from 'lucide-react';
import { useStore } from '@/lib/store';
import { VegaEmbed } from 'react-vega';
import { useTheme } from '@/components/layout/ThemeProvider';
import type { ChartOption } from '@/types';
import { ErrorPanel } from './ErrorPanel';
import { createPortal } from 'react-dom';
import type { Result as VegaEmbedResult } from 'vega-embed';

type VegaSpec = Record<string, unknown>;
type VegaEncoding = Record<string, unknown> & { color?: unknown };
type VegaLayer = Record<string, unknown> & { encoding?: VegaEncoding };

const EMPTY_CHART_OPTIONS: ChartOption[] = [];

function cloneSpec<T extends VegaSpec | null>(spec: T): T {
  if (!spec) return spec;
  try {
    return structuredClone(spec);
  } catch {
    return JSON.parse(JSON.stringify(spec));
  }
}

export function VisualizationTab() {
  const activeResult = useStore((state) => state.activeResult);
  const activeError = useStore((state) => state.activeError);
  const { theme } = useTheme();

  const chartOptions = activeResult?.chartOptions ?? EMPTY_CHART_OPTIONS;
  const defaultSpec = activeResult?.chart ?? null;
  const defaultChartId = activeResult?.defaultChartId ?? chartOptions[0]?.id ?? 'default';
  const resultId = activeResult?.id ?? null;

  const [selectedChartId, setSelectedChartId] = useState<string>(defaultChartId);
  const viewRef = useRef<VegaEmbedResult | null>(null);
  const [hasView, setHasView] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setSelectedChartId(defaultChartId);
  }, [defaultChartId, resultId]);

  const selectedBaseSpec = useMemo(() => {
    if (chartOptions.length > 0) {
      const explicit = chartOptions.find((option) => option.id === selectedChartId);
      if (explicit) {
        return explicit.spec as Record<string, unknown>;
      }
      const fallback = chartOptions.find((option) => option.id === defaultChartId);
      if (fallback) {
        return fallback.spec as Record<string, unknown>;
      }
    }
    return defaultSpec;
  }, [chartOptions, selectedChartId, defaultSpec, defaultChartId]);

  const themedSpec = useMemo(() => {
    const spec = cloneSpec(selectedBaseSpec as VegaSpec | null);
    if (!spec) {
      return null;
    }

    if (typeof window === 'undefined') {
      return spec;
    }

    const styles = getComputedStyle(document.documentElement);
    const colorValue = (name: string, fallback: string) => {
      const value = styles.getPropertyValue(name).trim();
      return value || fallback;
    };

    const isDarkMode = theme === 'dark';
    const colors = {
      primary: colorValue('--primary', '#7c3aed'),
      background: 'transparent',
      text: colorValue('--foreground', '#1f2937'),
      muted: colorValue('--muted-foreground', '#6b7280'),
      border: colorValue('--border-subtle', '#e5e7eb'),
      grid: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      range: [
        colorValue('--chart-color-1', '#7c3aed'),
        colorValue('--chart-color-2', '#6366f1'),
        colorValue('--chart-color-3', '#a855f7'),
        colorValue('--chart-color-4', '#8b5cf6'),
      ],
      font: "var(--font-geist-sans), Inter, system-ui, sans-serif",
    };

    const mutableSpec = spec as {
      config?: Record<string, unknown>;
      encoding?: VegaEncoding;
      layer?: VegaLayer[];
    };

    const baseConfig = { ...(mutableSpec.config ?? {}) };

    mutableSpec.config = {
      ...baseConfig,
      background: colors.background,
      font: colors.font,
      view: {
        stroke: 'transparent', // Remove outer border
      },
      axis: {
        domain: false, // Remove axis lines
        ticks: false, // Remove tick marks
        grid: true,
        gridColor: colors.grid,
        gridDash: [4, 4], // Dashed grid lines
        gridWidth: 1,
        labelColor: colors.muted,
        labelFontSize: 11,
        labelPadding: 8,
        titleColor: colors.text,
        titleFontSize: 12,
        titleFontWeight: 600,
        titlePadding: 12,
      },
      axisY: {
        grid: true,
        domain: false,
        ticks: false,
      },
      axisX: {
        grid: false, // Usually no vertical grid for bar charts
        domain: true,
        domainColor: colors.border,
      },
      legend: {
        labelColor: colors.text,
        labelFontSize: 11,
        titleColor: colors.text,
        titleFontSize: 12,
        titleFontWeight: 600,
        symbolType: 'circle',
      },
      range: {
        category: colors.range,
        ordinal: colors.range,
        ramp: colors.range,
      },
      bar: {
        cornerRadiusEnd: 4, // Rounded bars
      },
      line: {
        strokeWidth: 2,
      },
      point: {
        filled: true,
        size: 64,
      },
    };

    // Enforce primary color if not specified
    const encoding = mutableSpec.encoding;
    if (encoding && !encoding.color) {
      encoding.color = { value: colors.primary };
    }

    const layers = mutableSpec.layer;
    if (layers && Array.isArray(layers)) {
      mutableSpec.layer = layers.map((layer: VegaLayer) => {
        if (layer.encoding && !layer.encoding.color) {
          layer.encoding = { ...layer.encoding, color: { value: colors.primary } };
        }
        return layer;
      });
    }

    return spec;
  }, [selectedBaseSpec, theme]);

  const handleEmbed = useCallback((result: VegaEmbedResult) => {
    viewRef.current = result;
    setHasView(true);
  }, []);

  const handleChartExport = useCallback(async () => {
    const embedResult = viewRef.current;
    if (!embedResult) {
      return;
    }
    try {
      setIsExporting(true);
      const url = await embedResult.view.toImageURL('png');
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `selecta-chart-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Chart exported successfully");
    } catch (error) {
      console.error('Failed to export chart:', error);
      toast.error("Failed to export chart");
    } finally {
      setIsExporting(false);
    }
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [isFullscreen]);

  useEffect(() => {
    viewRef.current = null;
    setHasView(false);
  }, [selectedChartId, resultId]);

  if (activeError) {
    return <ErrorPanel error={activeError} />;
  }

  const fullscreenNode =
    isFullscreen && themedSpec && typeof document !== 'undefined'
      ? createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-background/90 backdrop-blur"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="relative h-[min(90vh,780px)] w-[min(94vw,1200px)] rounded-2xl border border-border-subtle bg-card shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute right-4 top-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsFullscreen(false)}>
                Close
              </Button>
            </div>
            <div className="h-full w-full p-6">
              <VegaEmbed
                spec={themedSpec as VegaSpec}
                options={{ actions: false, renderer: 'svg' }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )
      : null;

  if (!themedSpec) {
    return (
      <Card className="card-subtle h-full min-h-[320px] flex flex-col items-center justify-center text-center p-8">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <BarChart className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="heading-sm mb-2 text-foreground/80">No Visualization</h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          Run a query that returns data to generate a chart automatically.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="heading-md text-card-foreground">Data Visualization</h4>
        {chartOptions.length > 1 && (
          <div className="relative">
            <label htmlFor="chart-variant" className="sr-only">
              Chart variant
            </label>
            <select
              id="chart-variant"
              value={selectedChartId}
              onChange={(event) => setSelectedChartId(event.target.value)}
              className="inline-flex h-9 items-center rounded-md border border-border-subtle bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={chartOptions.length <= 1}
            >
              {chartOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Card className="card-elevated overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[320px] w-full">
            <VegaEmbed
              spec={themedSpec as VegaSpec}
              options={{
                actions: false,
                renderer: 'svg',
              }}
              onEmbed={handleEmbed}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleChartExport} disabled={!hasView || isExporting}>
          <Download className="mr-2 h-3.5 w-3.5" />
          {isExporting ? 'Exporting…' : 'Export'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsFullscreen(true)} disabled={!themedSpec}>
          <Maximize className="mr-2 h-3.5 w-3.5" />
          Fullscreen
        </Button>
      </div>

      {fullscreenNode}
    </div>
  );
}
