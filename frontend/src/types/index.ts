export interface Session {
  id: string;
  appName: string;
  userId: string;
  state: Record<string, unknown>;
  events: Event[];
  lastUpdateTime: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  thinking?: string;
  result?: Result;
  resultId?: string;
}

export interface Result {
  id?: string;
  messageId?: string;
  createdAt?: number;
  sql?: string;
  rows?: Record<string, unknown>[];
  columns?: string[];
  rowCount?: number;
  chart?: Record<string, unknown>; // Vega-Lite spec
  chartOptions?: ChartOption[];
  defaultChartId?: string;
  summary?: string;
  resultsMarkdown?: string;
  businessInsights?: string | string[];
  executionMs?: number;
  jobId?: string;
  dataset?: {
    id?: string;
    projectId?: string;
    billingProjectId?: string;
    location?: string;
    tables?: string[];
  };
  modelMetrics?: ModelMetrics;
}

export interface QueryErrorDetail {
  message?: string;
  reason?: string;
  location?: string;
  debugInfo?: string;
}

export interface QueryError {
  id?: string;
  message: string;
  sql?: string;
  timestamp?: number;
  type?: string;
  jobId?: string;
  errorCode?: string | number | null;
  details?: QueryErrorDetail[];
}

export interface ModelMetricsStep {
  name?: string;
  latencyMs?: number;
}

export interface ModelMetrics {
  modelName?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedResult?: boolean;
  latencyMs?: number;
  modelLatencyMs?: number;
  reasoningLatencyMs?: number;
  toolLatencyMs?: number;
  steps?: ModelMetricsStep[];
  metadata?: Record<string, unknown>;
}

export interface ChartOption {
  id: string;
  label: string;
  spec: Record<string, unknown>;
}

export interface Event {
  author: string;
  type?: string;
  content?: {
    parts: Array<{
      text?: string;
      functionCall?: {
        id: string;
        name: string;
        args: Record<string, unknown>;
      };
      functionResponse?: {
        id: string;
        name: string;
        response: Record<string, unknown>;
      };
    }>;
    role: string;
  };
  actions?: {
    stateDelta?: {
      latest_result?: Result;
      results_history?: Result[];
      summary?: string;
      resultsMarkdown?: string;
      businessInsights?: string | string[];
      latest_error?: QueryError;
      errors_history?: QueryError[];
      [key: string]: unknown;
    };
  };
  partial?: boolean;
  finishReason?: string;
  timestamp?: number;
  metrics?: Record<string, unknown>;
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
}
