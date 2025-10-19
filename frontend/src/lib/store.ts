import { create } from 'zustand';
import { Message, Session, Result } from '@/types';

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
  
  // Actions
  setSessions: (sessions: Session[]) => void;
  setCurrentSessionId: (id: string) => void;
  addMessage: (message: Message) => void;
  updateStreamingText: (text: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setActiveResult: (result: Result | null) => void;
  clearMessages: () => void;
  loadSessionMessages: (session: Session) => void;
  setSessionName: (sessionId: string, name: string | null) => void;
  removeSession: (sessionId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  sessions: [],
  currentSessionId: null,
  sessionMetadata: readSessionMetadata(),
  messages: [],
  isStreaming: false,
  currentStreamingText: '',
  activeResult: null,

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
  
  setActiveResult: (result) =>
    set({ activeResult: result }),
  
  clearMessages: () =>
    set({ messages: [], currentStreamingText: '' }),

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
        isStreaming: wasActive ? false : state.isStreaming,
      };
    }),

  loadSessionMessages: (session) => {
    const messages: Message[] = [];
    
    session.events.forEach((event) => {
      if (event.author === 'user') {
        messages.push({
          id: `${event.timestamp}`,
          role: 'user',
          text: event.content?.parts[0]?.text || '',
          timestamp: event.timestamp || Date.now() / 1000
        });
      } else if (event.author === 'selecta') {
        messages.push({
          id: `${event.timestamp}`,
          role: 'model',
          text: event.content?.parts[0]?.text || '',
          timestamp: event.timestamp || Date.now() / 1000,
          result: event.actions?.stateDelta?.latest_result
        });
      }
    });
    
    set({ messages });
  }
}));
