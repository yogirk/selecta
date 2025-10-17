import { create } from 'zustand';
import { Message, Session, Result } from '@/types';

interface AppState {
  // Session management
  sessions: Session[];
  currentSessionId: string | null;
  
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
}

export const useStore = create<AppState>((set) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isStreaming: false,
  currentStreamingText: '',
  activeResult: null,

  setSessions: (sessions) => set({ sessions }),
  
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
