import { useCallback, useEffect, useRef } from 'react';

import { apiClient } from '@/lib/api';
import { useStore } from '@/lib/store';
import { generateId } from '@/lib/utils';
import { Event, Result } from '@/types';

type StructuredSections = {
  summary?: string;
  resultsMarkdown?: string;
  businessInsights?: string | string[];
};

const HEADING_PATTERN = /^#{1,6}\s+(.+?)\s*$/;

const extractStructuredSections = (markdown: string): StructuredSections => {
  if (!markdown || !markdown.trim()) {
    return {};
  }

  const sections = {
    summary: [] as string[],
    results: [] as string[],
    businessInsights: [] as string[],
  };

  const normaliseHeader = (value: string) => value.trim().toLowerCase();
  let currentSection: keyof typeof sections | null = null;

  markdown.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection) {
        sections[currentSection].push('');
      }
      return;
    }

    const headingMatch = HEADING_PATTERN.exec(trimmed);
    let sectionKey: keyof typeof sections | null = null;

    if (headingMatch && headingMatch[1]) {
      const header = normaliseHeader(headingMatch[1]);
      if (header === 'summary') sectionKey = 'summary';
      else if (header === 'results') sectionKey = 'results';
      else if (header === 'business insights') sectionKey = 'businessInsights';
    } else {
      const plain = normaliseHeader(trimmed);
      if (plain === 'summary') sectionKey = 'summary';
      else if (plain === 'results') sectionKey = 'results';
      else if (plain === 'business insights') sectionKey = 'businessInsights';
    }

    if (sectionKey) {
      currentSection = sectionKey;
      return;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  });

  const join = (key: keyof typeof sections) => sections[key].join('\n').trim();

  const summary = join('summary');
  const resultsMarkdown = join('results');
  const businessInsightsRaw = join('businessInsights');

  return {
    summary: summary || undefined,
    resultsMarkdown: resultsMarkdown || undefined,
    businessInsights: businessInsightsRaw || undefined,
  };
};

const splitReasoningFromFullText = (text: string): { reasoning: string; final: string } => {
  if (!text) {
    return { reasoning: '', final: '' };
  }

  const anchor = text.indexOf('### Summary');
  if (anchor === -1) {
    return { reasoning: '', final: text.trim() };
  }

  const reasoning = text.slice(0, anchor).trim();
  const final = text.slice(anchor).trim();
  return { reasoning, final };
};

const cleanReasoning = (value: string): string => {
  return value.replace(/^\s*thought\s*/i, '').trim();
};

const mergeResult = (
  base: Result | null | undefined,
  updates: StructuredSections & Partial<Result>
): Result | null => {
  if (!base) {
    if (!updates.summary && !updates.resultsMarkdown && !updates.businessInsights) {
      return null;
    }
    return { ...updates };
  }

  return {
    ...base,
    ...updates,
    summary: updates.summary ?? base.summary,
    resultsMarkdown: updates.resultsMarkdown ?? base.resultsMarkdown,
    businessInsights: updates.businessInsights ?? base.businessInsights,
  };
};

const formatBusinessInsights = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }
  const entries = Array.isArray(value) ? value : value.split('\n');
  const bullets = entries
    .map((entry) => entry?.toString().trim())
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => (entry.startsWith('-') ? entry : `- ${entry}`));
  if (bullets.length === 0) {
    return null;
  }
  return bullets.join('\n');
};

const formatResultsTable = (result: Result): string | null => {
  if (result.resultsMarkdown && result.resultsMarkdown.trim()) {
    return result.resultsMarkdown.trim();
  }
  const columns = result.columns ?? [];
  const rows = result.rows ?? [];
  if (columns.length === 0 || rows.length === 0) {
    return null;
  }
  const header = `| ${columns.join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows
    .slice(0, 10)
    .map((row) =>
      `| ${columns
        .map((column) => {
          const value = row[column];
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'number') {
            return Number.isFinite(value) ? value.toLocaleString() : String(value);
          }
          return String(value);
        })
        .join(' | ')} |`
    )
    .join('\n');
  return [header, divider, body].join('\n');
};

const formatStructuredResultMarkdown = (result: Result | null | undefined): string | null => {
  if (!result) {
    return null;
  }
  const parts: string[] = [];
  const summary = result.summary?.trim();
  if (summary) {
    parts.push(`### Summary\n${summary}`);
  }

  const table = formatResultsTable(result);
  if (table) {
    parts.push(`### Results\n${table}`);
  }

  const insights = formatBusinessInsights(result.businessInsights);
  if (insights) {
    parts.push(`### Business Insights\n${insights}`);
  }

  const combined = parts.join('\n\n').trim();
  return combined.length > 0 ? combined : null;
};

const ensureMarkdownSpacing = (value: string): string =>
  value.replace(/(###\s+[^\n]+)\n(?!\s*\n)/g, '$1\n\n');

export function useSSE(userId: string, sessionId: string | null) {
  const fullTextRef = useRef('');
  const resultIdRef = useRef<string | null>(null);
  const messageIdRef = useRef<string | null>(null);
  const hasCompletedRef = useRef(false);
  const streamHandleRef = useRef<{ close: () => void } | null>(null);
  const latestStructuredRef = useRef<Result | null>(null);

  const sendMessage = useCallback(
    (text: string) => {
      if (!sessionId) {
        return;
      }

      const {
        addMessage,
        updateStreamingText,
        setIsStreaming,
        setActiveResult,
        cacheResult,
        cacheError,
        setActiveError,
        setModelMetrics,
        ingestModelMetrics,
      } = useStore.getState();

      const userMessage = {
        id: generateId(),
        role: 'user' as const,
        text,
        timestamp: Date.now() / 1000,
      };
      addMessage(userMessage);
      setActiveError(null);
      setModelMetrics(null);

      if (streamHandleRef.current) {
        streamHandleRef.current.close();
        streamHandleRef.current = null;
      }

      fullTextRef.current = '';
      resultIdRef.current = null;
      messageIdRef.current = generateId();
      hasCompletedRef.current = false;
      updateStreamingText('');
      setIsStreaming(true);

      const finalize = (timestamp?: number) => {
        if (hasCompletedRef.current) {
          return;
        }
        hasCompletedRef.current = true;

        const raw = fullTextRef.current.trim();
        const { reasoning, final } = splitReasoningFromFullText(raw);

        let finalText = final;
        let reasoningText = cleanReasoning(reasoning);

        if (!finalText && raw) {
          finalText = raw;
        }
        if (!finalText && reasoningText) {
          finalText = reasoningText;
          reasoningText = '';
        }

        const structured = extractStructuredSections(finalText || raw);

        let resultForMessage: Result | undefined;
        const existingStructured = latestStructuredRef.current;

        if (resultIdRef.current) {
          const state = useStore.getState();
          const existingResult =
            state.resultHistory.find((entry) => entry.id === resultIdRef.current) ??
            (state.activeResult?.id === resultIdRef.current ? state.activeResult : null);

          const merged = mergeResult(existingResult, structured) ?? undefined;
          if (merged) {
            merged.id = resultIdRef.current;
            merged.messageId = messageIdRef.current ?? merged.messageId;
            merged.createdAt =
              merged.createdAt ??
              (timestamp ? timestamp * 1000 : Date.now());
            setActiveResult(merged);
            resultForMessage = merged;
            latestStructuredRef.current = merged;
          }
        }

        const structuredMarkdown = formatStructuredResultMarkdown(
          resultForMessage ?? latestStructuredRef.current ?? existingStructured
        );

        const hasStructuredHeadings = /###\s+(Summary|Results|Business Insights)/i.test(finalText);

        if (!hasStructuredHeadings && structuredMarkdown) {
          finalText = structuredMarkdown;
        }

        if (!finalText) {
          finalText = structuredMarkdown ?? raw;
        }

        if (finalText) {
          finalText = ensureMarkdownSpacing(finalText);
        }

        if (!reasoningText && raw) {
          reasoningText = cleanReasoning(raw);
        }

        if (finalText || reasoningText || resultForMessage) {
          addMessage({
            id: messageIdRef.current ?? generateId(),
            role: 'model',
            text: finalText || raw,
            thinking: reasoningText || undefined,
            timestamp: Date.now() / 1000,
            result: resultForMessage,
            resultId: resultForMessage?.id,
          });
        }

        fullTextRef.current = '';
        resultIdRef.current = null;
        messageIdRef.current = null;
        updateStreamingText('');
        setIsStreaming(false);
        streamHandleRef.current = null;
        latestStructuredRef.current = null;
      };

      const handleEvent = (event: Event) => {
        if (hasCompletedRef.current) {
          return;
        }

        const parts = event.content?.parts ?? [];
        const hasToolInvocation = parts.some((part) => {
          const candidate = part as {
            functionCall?: unknown;
            functionResponse?: unknown;
          };
          return Boolean(candidate?.functionCall) || Boolean(candidate?.functionResponse);
        });
        const chunk = parts
          .map((part) => {
            const candidate = part as { text?: unknown };
            return typeof candidate?.text === 'string' ? (candidate.text as string) : '';
          })
          .join('');
        const delta = event.actions?.stateDelta;

        if (delta?.results_history) {
          delta.results_history.forEach((entry) => {
            cacheResult(entry);
          });
        }

        if (delta?.errors_history) {
          delta.errors_history.forEach((entry) => {
            cacheError(entry, { timestamp: event.timestamp }, { setActive: false });
          });
        }

        if (delta?.latest_result) {
          if (!resultIdRef.current) {
            const existingId =
              delta.latest_result.id ||
              (delta.latest_result as Record<string, unknown>)['resultId'];
            resultIdRef.current = typeof existingId === 'string' ? existingId : generateId();
          }

          const enrichedLatest: Result = {
            ...delta.latest_result,
            id: resultIdRef.current,
            messageId: messageIdRef.current ?? undefined,
            createdAt:
              delta.latest_result.createdAt ??
              (event.timestamp ? event.timestamp * 1000 : Date.now()),
            summary:
              delta.latest_result.summary ??
              (typeof delta.summary === 'string' ? delta.summary : undefined),
            resultsMarkdown:
              delta.latest_result.resultsMarkdown ??
              (typeof delta.resultsMarkdown === 'string' ? delta.resultsMarkdown : undefined),
            businessInsights:
              delta.latest_result.businessInsights ??
              delta.businessInsights ??
              undefined,
          };

          cacheResult(enrichedLatest);
          setActiveResult(enrichedLatest);
          latestStructuredRef.current = enrichedLatest;
        }

        if (delta?.latest_error) {
          cacheError(delta.latest_error, { timestamp: event.timestamp });
          setActiveResult(null);
        }

        if (event.metrics) {
          ingestModelMetrics(event.metrics);
        }

        if (chunk) {
          fullTextRef.current += chunk;
          const { reasoning } = splitReasoningFromFullText(fullTextRef.current);
          updateStreamingText(cleanReasoning(reasoning) || fullTextRef.current);
        }

        const shouldFinalize =
          !hasToolInvocation &&
          (Boolean(event.finishReason) || event.partial === false || event.type === 'complete');
        if (shouldFinalize) {
          finalize(event.timestamp);
        }
      };

      const handle = apiClient.createSSEConnection(
        userId,
        sessionId,
        text,
        handleEvent,
        (error) => {
          console.error('SSE Error:', error);
          finalize();
        },
        () => {
          finalize();
        }
      );
      streamHandleRef.current = handle;
    },
    [sessionId, userId]
  );

  useEffect(() => {
    return () => {
      if (streamHandleRef.current) {
        streamHandleRef.current.close();
        streamHandleRef.current = null;
      }
    };
  }, []);

  return { sendMessage };
}
