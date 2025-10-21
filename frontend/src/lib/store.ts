import { create } from 'zustand';
import { Message, Session, Result, QueryError, ModelMetrics, ModelMetricsStep } from '@/types';
import { apiClient } from '@/lib/api';
import { generateId, getUserId, hashString } from '@/lib/utils';

type SessionMetadata = {
  name?: string;
};

type SessionMetadataMap = Record<string, SessionMetadata>;

const SESSION_METADATA_KEY = 'selecta_session_metadata';

const readSessionMetadata = (): SessionMetadataMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(SESSION_METADATA_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored) as SessionMetadataMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const persistSessionMetadata = (metadata: SessionMetadataMap) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(SESSION_METADATA_KEY, JSON.stringify(metadata));
  } catch {
    // no-op if storage unavailable
  }
};

const selectString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normaliseBusinessInsights = (value: unknown): string | string[] | undefined => {
  if (Array.isArray(value)) {
    const entries = value
      .map((item) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          return trimmed.length > 0 ? trimmed : undefined;
        }
        if (typeof item === 'number' || typeof item === 'boolean') {
          return String(item);
        }
        return undefined;
      })
      .filter((item): item is string => typeof item === 'string');
    return entries.length > 0 ? entries : undefined;
  }
  return selectString(value);
};

const normaliseError = (
  rawError?: QueryError | null,
  extras?: { id?: string; timestamp?: number }
): QueryError | null => {
  if (!rawError) {
    return null;
  }

  const normalizeTimestamp = (value: unknown): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return Date.now();
    }
    // If the timestamp looks like seconds, convert to milliseconds.
    return value > 10 ** 12 ? value : Math.round(value * 1000);
  };

  const deriveId = (): string => {
    if (typeof rawError.id === 'string' && rawError.id.trim()) {
      return rawError.id.trim();
    }
    if (extras?.id) {
      return extras.id;
    }
    if (typeof rawError.jobId === 'string' && rawError.jobId.trim()) {
      return `job-${rawError.jobId.trim()}`;
    }
    if (typeof rawError.sql === 'string' && rawError.sql.trim()) {
      return `err-sql-${hashString(rawError.sql.trim())}`;
    }
    if (typeof rawError.message === 'string' && rawError.message.trim()) {
      const seed = `${rawError.message.trim()}-${rawError.timestamp ?? extras?.timestamp ?? Date.now()}`;
      return `err-${hashString(seed)}`;
    }
    return generateId();
  };

  const rawRecord = rawError as unknown as Record<string, unknown>;

  const rawTimestamp =
    rawError.timestamp ??
    extras?.timestamp ??
    (typeof rawRecord['timestamp'] === 'number'
      ? (rawRecord['timestamp'] as number)
      : undefined);
  const timestamp = normalizeTimestamp(rawTimestamp);

  const detailsRaw = rawRecord['details'];
  let details: QueryError['details'] | undefined;
  if (Array.isArray(detailsRaw)) {
    const entries = detailsRaw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const detail = entry as Record<string, unknown>;
        const message = typeof detail.message === 'string' ? detail.message : undefined;
        const reason = typeof detail.reason === 'string' ? detail.reason : undefined;
        const location = typeof detail.location === 'string' ? detail.location : undefined;
        const debugInfo = typeof detail.debugInfo === 'string' ? detail.debugInfo : undefined;
        if (!message && !reason && !location && !debugInfo) {
          return null;
        }
        return { message, reason, location, debugInfo };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (entries.length > 0) {
      details = entries;
    }
  }

  return {
    ...rawError,
    id: deriveId(),
    timestamp,
    details,
  };
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getRecord = (source: Record<string, unknown>, keys: string[]): Record<string, unknown> => {
  for (const key of keys) {
    const candidate = source[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }
  return {};
};

const pickNumber = (source: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const candidate = toNumber(source[key]);
    if (candidate !== undefined) {
      return candidate;
    }
  }
  return undefined;
};

const normaliseModelMetrics = (rawMetrics?: Record<string, unknown> | null): ModelMetrics | null => {
  if (!rawMetrics || typeof rawMetrics !== 'object') {
    return null;
  }

  const metrics = rawMetrics as Record<string, unknown>;
  const modelNode = getRecord(metrics, ['model', 'llm', 'modelMetrics']);
  const tokenNode = getRecord(modelNode, ['tokenUsage', 'tokens', 'tokenCounts', 'usage']);
  const promptTokens =
    pickNumber(metrics, ['promptTokens', 'inputTokens']) ??
    pickNumber(tokenNode, ['promptTokens', 'inputTokens', 'prompt', 'input']);
  const completionTokens =
    pickNumber(metrics, ['completionTokens', 'outputTokens']) ??
    pickNumber(tokenNode, ['completionTokens', 'outputTokens', 'completion', 'output']);
  const totalTokens =
    pickNumber(metrics, ['totalTokens']) ??
    pickNumber(tokenNode, ['totalTokens', 'total']) ??
    (promptTokens !== undefined && completionTokens !== undefined
      ? promptTokens + completionTokens
      : undefined);

  const latencyMs =
    pickNumber(metrics, ['latencyMs', 'totalLatencyMs', 'latency']) ??
    pickNumber(modelNode, ['latencyMs', 'responseLatencyMs', 'modelLatency']);
  const modelLatencyMs =
    pickNumber(modelNode, ['latencyMs', 'responseLatencyMs', 'modelLatencyMs']) ?? undefined;
  const reasoningLatencyMs =
    pickNumber(metrics, ['reasoningLatencyMs', 'reasoningLatency']) ?? undefined;
  const toolLatencyMs =
    pickNumber(metrics, ['toolLatencyMs', 'toolLatency']) ?? undefined;

  const stepsCandidate =
    Array.isArray(metrics.steps)
      ? metrics.steps
      : Array.isArray(metrics.stepMetrics)
        ? metrics.stepMetrics
        : Array.isArray(metrics.timeline)
          ? metrics.timeline
          : Array.isArray(modelNode.steps)
            ? (modelNode.steps as unknown[])
            : null;

  let steps: ModelMetricsStep[] | undefined;
  if (stepsCandidate) {
    const normalisedSteps = stepsCandidate
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const record = entry as Record<string, unknown>;
        const name =
          (typeof record.name === 'string' && record.name) ||
          (typeof record.step === 'string' && record.step) ||
          (typeof record.id === 'string' && record.id) ||
          undefined;
        const duration =
          pickNumber(record, ['latencyMs', 'durationMs', 'duration', 'timeMs']) ?? undefined;
        if (!name && duration === undefined) {
          return null;
        }
        return { name, latencyMs: duration } as ModelMetricsStep;
      })
      .filter((entry): entry is ModelMetricsStep => entry !== null);
    steps = normalisedSteps.length > 0 ? normalisedSteps : undefined;
  }

  const cachedResult =
    typeof metrics.cacheHit === 'boolean'
      ? metrics.cacheHit
      : typeof modelNode.cacheHit === 'boolean'
        ? modelNode.cacheHit
        : undefined;

  const modelNameRaw =
    modelNode.name ??
    metrics.modelName ??
    metrics.model ??
    (typeof metrics.engine === 'string' ? metrics.engine : undefined);

  const modelName = typeof modelNameRaw === 'string' ? modelNameRaw : undefined;

  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metrics)) {
    if (
      ['model', 'llm', 'modelMetrics', 'tokenUsage', 'tokens', 'steps', 'stepMetrics', 'timeline'].includes(
        key
      )
    ) {
      continue;
    }
    metadata[key] = value;
  }

  return {
    modelName,
    promptTokens,
    completionTokens,
    totalTokens,
    cachedResult,
    latencyMs,
    modelLatencyMs,
    reasoningLatencyMs,
    toolLatencyMs,
    steps,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
};

const normaliseResult = (
  rawResult?: Result | null,
  extras?: { id?: string; messageId?: string; timestamp?: number }
): Result | null => {
  if (!rawResult) {
    return null;
  }

  const base = rawResult as Record<string, unknown>;
  const deriveId = (): string => {
    if (extras?.id) {
      return extras.id;
    }
    if (typeof extras?.timestamp === 'number') {
      return `ts-${extras.timestamp}`;
    }
    if (rawResult.id) {
      return rawResult.id;
    }
    if (typeof base['resultId'] === 'string') {
      return base['resultId'] as string;
    }
    if (typeof rawResult.sql === 'string' && rawResult.sql.trim()) {
      return `sql-${hashString(rawResult.sql.trim())}`;
    }
    if (typeof base['sql'] === 'string' && (base['sql'] as string).trim()) {
      return `sql-${hashString((base['sql'] as string).trim())}`;
    }
    return generateId();
  };

  const inferredId =
    (() => {
      const candidate = deriveId();
      return candidate;
    })();

  const summary =
    rawResult.summary ??
    selectString(base['summary']) ??
    selectString(base['summaryMarkdown']);

  const resultsMarkdown =
    rawResult.resultsMarkdown ??
    selectString(base['resultsMarkdown']) ??
    selectString(base['results_markdown']) ??
    selectString(base['results']);

  const businessInsights =
    rawResult.businessInsights ??
    normaliseBusinessInsights(base['businessInsights']) ??
    normaliseBusinessInsights(base['business_insights']);

  const createdAt =
    rawResult.createdAt ??
    (extras?.timestamp ? extras.timestamp * 1000 : undefined) ??
    (typeof base['createdAt'] === 'number' ? (base['createdAt'] as number) : undefined) ??
    Date.now();

  return {
    ...rawResult,
    id: inferredId,
    messageId: extras?.messageId ?? rawResult.messageId,
    createdAt,
    summary,
    resultsMarkdown,
    businessInsights,
  };
};

interface AppState {
  // Session management
  sessions: Session[];
  currentSessionId: string | null;
  sessionMetadata: SessionMetadataMap;
  
  // Messages
  messages: Message[];
  isStreaming: boolean;
  currentStreamingText: string;
  
  // Results
  activeResult: Result | null;
  activeResultId: string | null;
  resultHistory: Result[];
  
  // Actions
  setSessions: (sessions: Session[]) => void;
  setCurrentSessionId: (id: string) => void;
  addMessage: (message: Message) => void;
  updateStreamingText: (text: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setActiveResult: (result: Result | null) => void;
  setActiveResultById: (id: string) => void;
  cacheResult: (result: Result | null) => void;
  fetchResultById: (sessionId: string, resultId: string) => Promise<void>;
  resetResults: () => void;
  clearMessages: () => void;
  loadSessionMessages: (session: Session) => void;
  setSessionName: (sessionId: string, name: string | null) => void;
  removeSession: (sessionId: string) => void;
  activeError: QueryError | null;
  errorHistory: QueryError[];
  setActiveError: (error: QueryError | null) => void;
  cacheError: (
    error: QueryError | null,
    extras?: { id?: string; timestamp?: number },
    options?: { setActive?: boolean }
  ) => void;
  clearErrors: () => void;
  modelMetrics: ModelMetrics | null;
  setModelMetrics: (metrics: ModelMetrics | null) => void;
  ingestModelMetrics: (metrics: unknown) => void;
}

export const useStore = create<AppState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  sessionMetadata: readSessionMetadata(),
  messages: [],
  isStreaming: false,
  currentStreamingText: '',
  activeResult: null,
  activeResultId: null,
  resultHistory: [],
  activeError: null,
  errorHistory: [],
  modelMetrics: null,

  setSessions: (sessions) =>
    set((state) => {
      const metadata = { ...state.sessionMetadata };
      const validIds = new Set(sessions.map((session) => session.id));
      let metadataChanged = false;

      Object.keys(metadata).forEach((id) => {
        if (!validIds.has(id)) {
          delete metadata[id];
          metadataChanged = true;
        }
      });

      if (metadataChanged) {
        persistSessionMetadata(metadata);
      }

      return {
        sessions,
        sessionMetadata: metadataChanged ? metadata : state.sessionMetadata,
      };
    }),
  
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      currentStreamingText: ''
    })),
  
  updateStreamingText: (text) =>
    set({ currentStreamingText: text }),
  
  setIsStreaming: (isStreaming) =>
    set({ isStreaming }),
 
  cacheResult: (result) =>
    set((state) => {
      const normalised = normaliseResult(result);
      if (!normalised) {
        return {};
      }
      const filtered = state.resultHistory.filter((entry) => entry.id !== normalised.id);
      // Preserve existing active result if we are updating it implicitly.
      const shouldUpdateActive = state.activeResultId === normalised.id;
      const merged = [...filtered, normalised].sort(
        (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
      );
      if (state.activeResultId) {
        const idx = merged.findIndex((entry) => entry.id === state.activeResultId);
        if (idx > 0) {
          const [activeEntry] = merged.splice(idx, 1);
          merged.unshift(activeEntry);
        }
      }
      return {
        resultHistory: merged,
        activeResult: shouldUpdateActive ? normalised : state.activeResult,
        activeError: null,
        modelMetrics: normalised.modelMetrics ?? state.modelMetrics,
      };
    }),

  setActiveResult: (result) =>
    set((state) => {
      if (!result) {
        return { activeResult: null, activeResultId: null };
      }
      const normalised = normaliseResult(result);
      if (!normalised) {
        return {};
      }
      const filtered = state.resultHistory.filter((entry) => entry.id !== normalised.id);
      return {
        activeResult: normalised,
        activeResultId: normalised.id ?? null,
        resultHistory: [normalised, ...filtered],
        activeError: null,
        modelMetrics: normalised.modelMetrics ?? state.modelMetrics,
      };
    }),

  fetchResultById: async (sessionId, resultId) => {
    if (!sessionId || !resultId) {
      return;
    }
    try {
      const userId = getUserId();
      const fetched = await apiClient.getResult(userId, sessionId, resultId);
      if (!fetched) {
        return;
      }
      set((state) => {
        const normalised = normaliseResult(fetched, { id: resultId });
        if (!normalised) {
          return {};
        }
        const filtered = state.resultHistory.filter((entry) => entry.id !== normalised.id);
        return {
          activeResult: normalised,
          activeResultId: normalised.id,
          resultHistory: [normalised, ...filtered],
          activeError: null,
          modelMetrics: normalised.modelMetrics ?? state.modelMetrics,
        };
      });
    } catch (error) {
      console.error('Failed to fetch result from backend:', error);
    }
  },

  setActiveResultById: (id) => {
    if (!id) {
      return;
    }
    const state = get();
    const target = state.resultHistory.find((entry) => entry.id === id);
    if (target) {
      const filtered = state.resultHistory.filter((entry) => entry.id !== id);
      set({
        activeResult: target,
        activeResultId: id,
        resultHistory: [target, ...filtered],
        activeError: null,
        modelMetrics: target.modelMetrics ?? state.modelMetrics,
      });
      return;
    }
    if (state.currentSessionId) {
      void state.fetchResultById(state.currentSessionId, id);
    }
  },

  resetResults: () =>
    set({
      activeResult: null,
      activeResultId: null,
      resultHistory: [],
      activeError: null,
      errorHistory: [],
      modelMetrics: null,
    }),

  clearMessages: () =>
    set({
      messages: [],
      currentStreamingText: '',
      activeResult: null,
      activeResultId: null,
      resultHistory: [],
      activeError: null,
      errorHistory: [],
      modelMetrics: null,
    }),

  setSessionName: (sessionId, name) =>
    set((state) => {
      const metadata = { ...state.sessionMetadata };
      if (name && name.trim()) {
        metadata[sessionId] = { name: name.trim() };
      } else {
        delete metadata[sessionId];
      }
      persistSessionMetadata(metadata);
      return { sessionMetadata: metadata };
    }),

  removeSession: (sessionId) =>
    set((state) => {
      const metadata = { ...state.sessionMetadata };
      if (metadata[sessionId]) {
        delete metadata[sessionId];
        persistSessionMetadata(metadata);
      }

      const sessions = state.sessions.filter((session) => session.id !== sessionId);
      const wasActive = state.currentSessionId === sessionId;

      return {
        sessions,
        sessionMetadata: metadata,
        currentSessionId: wasActive ? null : state.currentSessionId,
        messages: wasActive ? [] : state.messages,
        currentStreamingText: wasActive ? '' : state.currentStreamingText,
        activeResult: wasActive ? null : state.activeResult,
        activeResultId: wasActive ? null : state.activeResultId,
        resultHistory: wasActive ? [] : state.resultHistory,
        isStreaming: wasActive ? false : state.isStreaming,
        activeError: wasActive ? null : state.activeError,
        errorHistory: wasActive ? [] : state.errorHistory,
        modelMetrics: wasActive ? null : state.modelMetrics,
      };
    }),

  loadSessionMessages: (session) => {
    const messages: Message[] = [];
    const historyMap = new Map<string, Result>();
    let latestResult: Result | null = null;
    let latestResultId: string | null = null;
    const errorMap = new Map<string, QueryError>();
    let latestError: QueryError | null = null;
    let latestModelMetrics: ModelMetrics | null = null;

    session.events.forEach((event, index) => {
      const timestampSeconds = event.timestamp || Date.now() / 1000;
      const messageId = `${session.id}-${timestampSeconds}-${index}`;

      if (event.author === 'user') {
        messages.push({
          id: messageId,
          role: 'user',
          text: event.content?.parts?.[0]?.text || '',
          timestamp: timestampSeconds,
        });
        return;
      }

      if (event.author !== 'selecta') {
        return;
      }

      const delta = event.actions?.stateDelta;
      const rawText = event.content?.parts?.[0]?.text || '';
      const normalisedLatest = normaliseResult(delta?.latest_result, {
        messageId,
        timestamp: event.timestamp,
      });

      if (delta?.results_history) {
        delta.results_history.forEach((entry) => {
          const normalisedEntry = normaliseResult(entry, { timestamp: event.timestamp });
          if (normalisedEntry?.id) {
            historyMap.set(normalisedEntry.id, normalisedEntry);
          }
        });
      }

      if (normalisedLatest) {
        if (normalisedLatest.id) {
          historyMap.set(normalisedLatest.id, normalisedLatest);
        }
        latestResult = normalisedLatest;
        latestResultId = normalisedLatest.id ?? null;
      }

      if (delta?.errors_history) {
        delta.errors_history.forEach((entry) => {
          const normalisedError = normaliseError(entry, { timestamp: event.timestamp });
          if (normalisedError?.id) {
            errorMap.set(normalisedError.id, normalisedError);
          }
        });
      }

      const normalisedLatestError = normaliseError(delta?.latest_error, { timestamp: event.timestamp });
      if (normalisedLatestError?.id) {
        errorMap.set(normalisedLatestError.id, normalisedLatestError);
        latestError = normalisedLatestError;
      }

      if (event.metrics) {
        const normalisedMetrics = normaliseModelMetrics(event.metrics);
        if (normalisedMetrics) {
          latestModelMetrics = normalisedMetrics;
          if (latestResult && latestResultId) {
            const baseResult = latestResult as Result;
            const enriched: Result = { ...baseResult, modelMetrics: latestModelMetrics };
            historyMap.set(latestResultId, enriched);
            latestResult = enriched;
            latestResultId = enriched.id ?? latestResultId;
          }
        }
      }

      messages.push({
        id: messageId,
        role: 'model',
        text: rawText,
        timestamp: timestampSeconds,
        result: normalisedLatest ?? undefined,
        resultId: normalisedLatest?.id,
      });
    });

    if (latestModelMetrics) {
      if (latestResult && latestResultId) {
        const baseResult = latestResult as Result;
        const enriched: Result = { ...baseResult, modelMetrics: latestModelMetrics };
        historyMap.set(latestResultId, enriched);
        latestResult = enriched;
        latestResultId = enriched.id ?? latestResultId;
      }
    }

    const resultHistory = Array.from(historyMap.values()).sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
    );
    const errorHistory = Array.from(errorMap.values()).sort(
      (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
    );

    set({
      messages,
      resultHistory,
      activeResult: latestResult,
      activeResultId: latestResult?.id ?? null,
      errorHistory,
      activeError: latestError,
      modelMetrics: latestModelMetrics,
    });
  },

  setActiveError: (error) => set({ activeError: error ?? null }),

  cacheError: (error, extras, options) =>
    set((state) => {
      const normalised = normaliseError(error, extras);
      if (!normalised) {
        return {};
      }
      const filtered = state.errorHistory.filter((entry) => entry.id !== normalised.id);
      const merged = [normalised, ...filtered].sort(
        (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
      );
      const shouldSetActive = options?.setActive ?? true;
      const currentActive = state.activeError;
      const nextActive =
        shouldSetActive || (currentActive?.id === normalised.id ? true : false)
          ? normalised
          : currentActive ?? null;
      return {
        errorHistory: merged,
        activeError: nextActive,
      };
    }),

  clearErrors: () => set({ activeError: null, errorHistory: [] }),

  setModelMetrics: (metrics) => set({ modelMetrics: metrics }),

  ingestModelMetrics: (metrics) =>
    set((state) => {
      if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
        return {};
      }
      const normalised = normaliseModelMetrics(metrics as Record<string, unknown>);
      if (!normalised) {
        return {};
      }

      const updates: Partial<AppState> = { modelMetrics: normalised };

      if (state.activeResult) {
        const activeResult = { ...state.activeResult, modelMetrics: normalised };
        updates.activeResult = activeResult;
        updates.resultHistory = state.resultHistory.map((entry) =>
          entry.id === activeResult.id ? { ...entry, modelMetrics: normalised } : entry
        );
      }

      return updates;
    }),
}));
