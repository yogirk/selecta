import { API_URL, APP_NAME } from '@/config/constants';
import { Session, Event, Result } from '@/types';
import { hashString } from '@/lib/utils';

type SSEHandle = {
  close: () => void;
};

export class APIClient {
  private baseUrl: string;
  private appName: string;

  constructor(baseUrl: string = API_URL, appName: string = APP_NAME) {
    this.baseUrl = baseUrl;
    this.appName = appName;
  }

  private resolveUrl(path: string): string {
    const normalisedPath = path.startsWith('/') ? path : `/${path}`;
    if (!this.baseUrl) {
      return normalisedPath;
    }
    const trimmedBase = this.baseUrl.endsWith('/')
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;
    return `${trimmedBase}${normalisedPath}`;
  }

  async createSession(userId: string, sessionId: string): Promise<Session> {
    const response = await fetch(
      this.resolveUrl(`/apps/${this.appName}/users/${userId}/sessions/${sessionId}`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  async getSessions(userId: string): Promise<Session[]> {
    const response = await fetch(
      this.resolveUrl(`/apps/${this.appName}/users/${userId}/sessions`)
    );

    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.statusText}`);
    }

    return response.json();
  }

  async getSession(userId: string, sessionId: string): Promise<Session> {
    const response = await fetch(
      this.resolveUrl(`/apps/${this.appName}/users/${userId}/sessions/${sessionId}`)
    );

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const response = await fetch(
      this.resolveUrl(`/apps/${this.appName}/users/${userId}/sessions/${sessionId}`),
      {
        method: 'DELETE'
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  }

  createSSEConnection(
    userId: string,
    sessionId: string,
    message: string,
    onEvent: (event: Event) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): SSEHandle {
    const payload = {
      appName: this.appName,
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [{ text: message }]
      },
      streaming: true
    };

    const url = this.resolveUrl('/run_sse');

    const controller = new AbortController();
    // EventSource POST workaround using fetch streaming
    void this.streamWithFetch(
      url,
      payload,
      onEvent,
      onError,
      onComplete,
      controller
    );

    return {
      close: () => {
        controller.abort();
      },
    };
  }

  private async streamWithFetch(
    url: string,
    payload: Record<string, unknown>,
    onEvent: (event: Event) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
    controller: AbortController
  ) {
    const decoder = new TextDecoder();
    let buffer = '';

    const processEvent = (raw: string) => {
      if (!raw.trim()) {
        return;
      }
      const lines = raw.split('\n');
      let dataBuffer = '';
      for (const line of lines) {
        if (!line || line.startsWith(':')) {
          continue;
        }
        if (line.startsWith('data:')) {
          const value = line.slice(5);
          const normalised = value.startsWith(' ') ? value.slice(1) : value;
          dataBuffer += (dataBuffer ? '\n' : '') + normalised;
        }
      }

      const trimmed = dataBuffer.trim();
      if (!trimmed) {
        return;
      }

      try {
        const parsed = JSON.parse(trimmed) as Event;
        onEvent(parsed);
      } catch (error) {
        onError(error as Error);
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            processEvent(buffer);
          }
          onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let delimiterIndex = buffer.indexOf('\n\n');
        while (delimiterIndex !== -1) {
          const rawEvent = buffer.slice(0, delimiterIndex);
          buffer = buffer.slice(delimiterIndex + 2);
          processEvent(rawEvent);
          delimiterIndex = buffer.indexOf('\n\n');
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        onComplete();
        return;
      }
      onError(error as Error);
    }
  }

  async getResult(userId: string, sessionId: string, resultId: string): Promise<Result | null> {
    const session = await this.getSession(userId, sessionId);
    const results: Result[] = [];

    const pushResult = (entry?: Result | null) => {
      if (!entry) {
        return;
      }
      const baseId =
        entry.id ??
        (entry.sql && entry.sql.trim() ? `sql-${hashString(entry.sql.trim())}` : undefined);
      if (!baseId) {
        return;
      }
      results.push({ ...entry, id: baseId });
    };

    for (const event of session.events ?? []) {
      const delta = event.actions?.stateDelta;
      pushResult(delta?.latest_result);
      delta?.results_history?.forEach((entry) => {
        pushResult(entry);
      });
    }

    const normalised = results.find((entry) => entry.id === resultId);
    return normalised ?? null;
  }
}

export const apiClient = new APIClient();
