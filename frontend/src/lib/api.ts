import { API_URL, APP_NAME } from '@/config/constants';
import { Session, Event } from '@/types';

export class APIClient {
  private baseUrl: string;
  private appName: string;

  constructor(baseUrl: string = API_URL, appName: string = APP_NAME) {
    this.baseUrl = baseUrl;
    this.appName = appName;
  }

  async createSession(userId: string, sessionId: string): Promise<Session> {
    const response = await fetch(
      `${this.baseUrl}/apps/${this.appName}/users/${userId}/sessions/${sessionId}`,
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
      `${this.baseUrl}/apps/${this.appName}/users/${userId}/sessions`
    );

    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.statusText}`);
    }

    return response.json();
  }

  async getSession(userId: string, sessionId: string): Promise<Session> {
    const response = await fetch(
      `${this.baseUrl}/apps/${this.appName}/users/${userId}/sessions/${sessionId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  }

  createSSEConnection(
    userId: string,
    sessionId: string,
    message: string,
    onEvent: (event: Event) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): EventSource {
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

    // Create EventSource with POST data
    const url = `${this.baseUrl}/run_sse`;
    
    // Note: EventSource doesn't support POST directly
    // We'll use fetch with ReadableStream instead
    this.streamWithFetch(url, payload, onEvent, onError, onComplete);

    // Return a dummy EventSource for compatibility
    return new EventSource('');
  }

  private async streamWithFetch(
    url: string,
    payload: Record<string, unknown>,
    onEvent: (event: Event) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onComplete();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const event = JSON.parse(data);
                onEvent(event);
              } catch (e) {
                console.error('Failed to parse SSE event:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      onError(error as Error);
    }
  }
}

export const apiClient = new APIClient();
