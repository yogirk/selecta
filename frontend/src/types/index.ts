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
  result?: Result;
}

export interface Result {
  sql?: string;
  rows?: Record<string, unknown>[];
  columns?: string[];
  rowCount?: number;
  chart?: Record<string, unknown>; // Vega-Lite spec
}

export interface Event {
  author: string;
  content?: {
    parts: Array<{ text?: string }>;
    role: string;
  };
  actions?: {
    stateDelta?: {
      latest_result?: Result;
      results_history?: Result[];
      [key: string]: unknown;
    };
  };
  partial?: boolean;
  finishReason?: string;
  timestamp?: number;
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
}
