import { create } from "zustand"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface Session {
  id: string
  userId: string
  events: Message[]
  lastUpdateTime: number
  createdAt: number
}

interface StoreState {
  messages: Message[]
  sessions: Session[]
  currentSessionId: string | null
  isStreaming: boolean
  currentStreamingText: string

  // Actions
  addMessage: (message: Message) => void
  clearMessages: () => void
  setMessages: (messages: Message[]) => void
  setSessions: (sessions: Session[]) => void
  setCurrentSessionId: (id: string) => void
  loadSessionMessages: (session: Session) => void
  setStreaming: (streaming: boolean) => void
  setStreamingText: (text: string) => void
}

export const useStore = create<StoreState>((set) => ({
  messages: [],
  sessions: [],
  currentSessionId: null,
  isStreaming: false,
  currentStreamingText: "",

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () =>
    set({
      messages: [],
      currentStreamingText: "",
    }),

  setMessages: (messages) =>
    set({
      messages,
    }),

  setSessions: (sessions) =>
    set({
      sessions,
    }),

  setCurrentSessionId: (id) =>
    set({
      currentSessionId: id,
    }),

  loadSessionMessages: (session) =>
    set({
      messages: session.events,
      currentSessionId: session.id,
    }),

  setStreaming: (streaming) =>
    set({
      isStreaming: streaming,
    }),

  setStreamingText: (text) =>
    set({
      currentStreamingText: text,
    }),
}))
