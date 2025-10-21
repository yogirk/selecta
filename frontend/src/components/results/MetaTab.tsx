'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { ErrorPanel } from './ErrorPanel';

type SectionRow = {
  label: string;
  value: string;
};

type Section = {
  title: string;
  rows: SectionRow[];
};

const formatDateTime = (value?: number | null): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
};

const formatDuration = (value?: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  if (value < 1000) {
    return `${Math.round(value)} ms`;
  }
  const seconds = value / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining.toFixed(1)}s`;
};

const padMultiline = (value: string, indent = '  '): string =>
  value
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${indent}${line}`))
    .join('\n');

export function MetaTab() {
  const activeResult = useStore((state) => state.activeResult);
  const activeError = useStore((state) => state.activeError);
  const modelMetrics = useStore((state) => state.modelMetrics);

  const sections = useMemo<Section[] | null>(() => {
    if (!activeResult) {
      return null;
    }

    const dataset = activeResult.dataset ?? {};

    const executionRows: SectionRow[] = [
      { label: 'completed:', value: formatDateTime(activeResult.createdAt) },
      { label: 'duration:', value: formatDuration(activeResult.executionMs) },
      {
        label: 'rows:',
        value:
          typeof activeResult.rowCount === 'number'
            ? activeResult.rowCount.toLocaleString()
            : '—',
      },
      { label: 'job_id:', value: activeResult.jobId ?? '—' },
    ];

    const datasetRows: SectionRow[] = [
      { label: 'dataset:', value: dataset.id ?? '—' },
      { label: 'project:', value: dataset.projectId ?? '—' },
      { label: 'billing_project:', value: dataset.billingProjectId ?? '—' },
      { label: 'location:', value: dataset.location ?? '—' },
      {
        label: 'tables:',
        value:
          dataset.tables && dataset.tables.length > 0
            ? dataset.tables.map((table) => `- ${table}`).join('\n')
            : '—',
      },
    ];

    const modelRows: SectionRow[] = [];

    if (modelMetrics) {
      if (modelMetrics.modelName) {
        modelRows.push({ label: 'model:', value: modelMetrics.modelName });
      }
      if (modelMetrics.promptTokens !== undefined) {
        modelRows.push({
          label: 'prompt_tokens:',
          value: modelMetrics.promptTokens.toLocaleString(),
        });
      }
      if (modelMetrics.completionTokens !== undefined) {
        modelRows.push({
          label: 'completion_tokens:',
          value: modelMetrics.completionTokens.toLocaleString(),
        });
      }
      if (modelMetrics.totalTokens !== undefined) {
        modelRows.push({
          label: 'total_tokens:',
          value: modelMetrics.totalTokens.toLocaleString(),
        });
      }
      if (modelMetrics.cachedResult !== undefined) {
        modelRows.push({
          label: 'cache_hit:',
          value: String(modelMetrics.cachedResult),
        });
      }
      if (modelMetrics.latencyMs !== undefined) {
        modelRows.push({
          label: 'total_latency:',
          value: formatDuration(modelMetrics.latencyMs),
        });
      }
      if (modelMetrics.modelLatencyMs !== undefined) {
        modelRows.push({
          label: 'model_latency:',
          value: formatDuration(modelMetrics.modelLatencyMs),
        });
      }
      if (modelMetrics.reasoningLatencyMs !== undefined) {
        modelRows.push({
          label: 'reasoning_latency:',
          value: formatDuration(modelMetrics.reasoningLatencyMs),
        });
      }
      if (modelMetrics.toolLatencyMs !== undefined) {
        modelRows.push({
          label: 'tool_latency:',
          value: formatDuration(modelMetrics.toolLatencyMs),
        });
      }
      if (modelMetrics.steps && modelMetrics.steps.length > 0) {
        const stepLines = modelMetrics.steps
          .map((step) => {
            const label = step.name ?? 'step';
            const duration =
              step.latencyMs !== undefined ? formatDuration(step.latencyMs) : '—';
            return `${label}: ${duration}`;
          })
          .join('\n');
        modelRows.push({
          label: 'steps:',
          value: padMultiline(stepLines, '    '),
        });
      }
    }

    const result: Section[] = [
      { title: 'execution', rows: executionRows },
      { title: 'dataset', rows: datasetRows },
    ];

    if (modelRows.length > 0) {
      result.push({ title: 'model', rows: modelRows });
    }

    return result;
  }, [activeResult, modelMetrics]);

  if (activeError) {
    return <ErrorPanel error={activeError} />;
  }

  if (!sections) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface/70 px-6 py-10 text-center font-mono text-xs text-muted-foreground">
        meta details will appear here after you run a query.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="heading-md text-card-foreground">Meta</h4>

      <div className="rounded-2xl border border-border-subtle bg-surface/70 shadow-sm">
        {sections.map((section, index) => (
          <div
            key={section.title}
            className={`font-mono text-xs sm:text-sm text-card-foreground/90 ${index !== 0 ? 'border-t border-border-subtle/60' : ''}`}
          >
            <div className="bg-surface px-4 pt-4">
              <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/90">
                {section.title}
              </span>
            </div>
            <div className="px-4 pb-4 pt-2">
              <dl className="space-y-1">
                {section.rows.map((row) => (
                  <div key={`${section.title}-${row.label}`} className="grid grid-cols-[130px_1fr] gap-3">
                    <dt className="font-semibold text-card-foreground">{row.label}</dt>
                    <dd className="font-normal text-card-foreground whitespace-pre-wrap">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
