#!/bin/bash

# Selecta Frontend - Complete Codebase Generator
# This script creates a production-ready Next.js 14 + TypeScript + Shadcn application

set -e

PROJECT_NAME="selecta-frontend"
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"

echo "🚀 Creating Selecta Frontend Application..."
echo "📍 Backend URL: $BACKEND_URL"

# Check if project directory exists
if [ -d "$PROJECT_NAME" ]; then
    echo "❌ Directory '$PROJECT_NAME' already exists!"
    read -p "Do you want to remove it and start fresh? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_NAME"
    else
        exit 1
    fi
fi

# Create Next.js app
echo "📦 Creating Next.js application..."
npx create-next-app@latest "$PROJECT_NAME" \
    --typescript \
    --tailwind \
    --eslint \
    --app \
    --src-dir \
    --import-alias "@/*" \
    --no-git

cd "$PROJECT_NAME"

# Install dependencies
echo "📦 Installing dependencies..."
npm install \
    lucide-react \
    react-vega vega vega-lite \
    zustand \
    date-fns \
    clsx tailwind-merge \
    class-variance-authority

# Install Shadcn components
echo "🎨 Installing Shadcn UI components..."
npx shadcn@latest init -d -y
npx shadcn@latest add button card avatar badge tabs table textarea scroll-area progress separator -y

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/{components,lib,hooks,types,config}
mkdir -p src/components/{chat,sessions,results,layout}

# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=$BACKEND_URL
NEXT_PUBLIC_APP_NAME=app
EOF

# Create types
cat > src/types/index.ts << 'EOF'
export interface Session {
  id: string;
  appName: string;
  userId: string;
  state: Record<string, any>;
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
  rows?: any[];
  columns?: string[];
  rowCount?: number;
  chart?: any; // Vega-Lite spec
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
      [key: string]: any;
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
EOF

# Create config
cat > src/config/constants.ts << 'EOF'
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'app';

export const QUICK_ACTIONS = [
  {
    id: '1',
    label: 'Show monthly revenue trends with YoY comparison',
    prompt: 'Show monthly revenue trends with year-over-year comparison'
  },
  {
    id: '2',
    label: 'Which customer segments grew fastest last quarter?',
    prompt: 'Which customer segments grew fastest last quarter?'
  },
  {
    id: '3',
    label: 'Find products with declining repeat purchases',
    prompt: 'Find products with declining repeat purchases'
  },
  {
    id: '4',
    label: 'Forecast net sales for the next 90 days',
    prompt: 'Forecast net sales for the next 90 days'
  }
];
EOF

# Create utility functions
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getUserId(): string {
  if (typeof window === 'undefined') return 'server-user';
  
  let userId = localStorage.getItem('selecta_user_id');
  if (!userId) {
    userId = `user-${generateId()}`;
    localStorage.setItem('selecta_user_id', userId);
  }
  return userId;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
EOF

# Create API client
cat > src/lib/api.ts << 'EOF'
import { API_URL, APP_NAME } from '@/config/constants';
import { Session, Message } from '@/types';

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
    onEvent: (event: any) => void,
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
    payload: any,
    onEvent: (event: any) => void,
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
EOF

# Create Zustand store
cat > src/lib/store.ts << 'EOF'
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
EOF

# Create hooks
cat > src/hooks/useSSE.ts << 'EOF'
import { useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useStore } from '@/lib/store';
import { generateId } from '@/lib/utils';
import { Event } from '@/types';

export function useSSE(userId: string, sessionId: string | null) {
  const accumulatedTextRef = useRef('');
  const messageIdRef = useRef<string | null>(null);
  
  const { 
    addMessage, 
    updateStreamingText, 
    setIsStreaming,
    setActiveResult 
  } = useStore();

  const sendMessage = useCallback((text: string) => {
    if (!sessionId) return;

    // Add user message immediately
    const userMessage = {
      id: generateId(),
      role: 'user' as const,
      text,
      timestamp: Date.now() / 1000
    };
    addMessage(userMessage);

    // Reset streaming state
    accumulatedTextRef.current = '';
    messageIdRef.current = generateId();
    setIsStreaming(true);

    // Start SSE connection
    apiClient.createSSEConnection(
      userId,
      sessionId,
      text,
      (event: Event) => {
        // Handle incoming event
        if (event.content?.parts?.[0]?.text) {
          accumulatedTextRef.current += event.content.parts[0].text;
          updateStreamingText(accumulatedTextRef.current);
        }

        // Handle results
        if (event.actions?.stateDelta?.latest_result) {
          setActiveResult(event.actions.stateDelta.latest_result);
        }

        // Check if complete
        if (event.partial === false || event.finishReason) {
          const assistantMessage = {
            id: messageIdRef.current!,
            role: 'model' as const,
            text: accumulatedTextRef.current,
            timestamp: Date.now() / 1000,
            result: event.actions?.stateDelta?.latest_result
          };
          addMessage(assistantMessage);
          setIsStreaming(false);
        }
      },
      (error) => {
        console.error('SSE Error:', error);
        setIsStreaming(false);
      },
      () => {
        setIsStreaming(false);
      }
    );
  }, [userId, sessionId, addMessage, updateStreamingText, setIsStreaming, setActiveResult]);

  return { sendMessage };
}
EOF

# Create components - Layout
cat > src/components/layout/Header.tsx << 'EOF'
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, Settings } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border/60 bg-card/80 backdrop-blur px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-ring flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Selecta</h1>
            <p className="text-xs text-muted-foreground">AI Analytics Platform</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm">BigQuery Connected</span>
        </Badge>
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
        <Avatar className="w-9 h-9">
          <AvatarFallback className="bg-gradient-to-br from-primary to-ring text-primary-foreground">
            U
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
EOF

# Create Session List
cat > src/components/sessions/SessionList.tsx << 'EOF'
'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { getUserId, generateId, formatTimestamp } from '@/lib/utils';

export function SessionList() {
  const { sessions, currentSessionId, setSessions, setCurrentSessionId, clearMessages, loadSessionMessages } = useStore();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const userId = getUserId();
      const sessionsList = await apiClient.getSessions(userId);
      setSessions(sessionsList);
      
      // If no current session, create one
      if (sessionsList.length === 0) {
        createNewSession();
      } else if (!currentSessionId) {
        setCurrentSessionId(sessionsList[0].id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const userId = getUserId();
      const sessionId = generateId();
      
      await apiClient.createSession(userId, sessionId);
      setCurrentSessionId(sessionId);
      clearMessages();
      
      await loadSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const selectSession = async (sessionId: string) => {
    try {
      const userId = getUserId();
      const session = await apiClient.getSession(userId, sessionId);
      
      setCurrentSessionId(sessionId);
      loadSessionMessages(session);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  return (
    <aside className="w-72 border-r border-border flex flex-col bg-card">
      <div className="p-4 border-b border-border">
        <Button 
          onClick={createNewSession}
          className="w-full bg-gradient-to-r from-primary to-ring hover:opacity-90"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Session
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recent Sessions
        </h3>
        
        <ScrollArea className="h-full">
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  session.id === currentSessionId ? 'border-2 border-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-card-foreground">
                    {session.events.length > 0 ? 'Active Session' : 'New Session'}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(session.lastUpdateTime)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {session.events.length > 0 ? `${session.events.length} messages` : 'No messages yet'}
                </p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      <div className="p-4 border-t border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-xs" size="sm">
            Browse Tables
          </Button>
          <Button variant="ghost" className="w-full justify-start text-xs" size="sm">
            Saved Queries
          </Button>
          <Button variant="ghost" className="w-full justify-start text-xs" size="sm">
            ML Models
          </Button>
        </div>
      </div>
    </aside>
  );
}
EOF

# Create Chat components
cat > src/components/chat/ChatMessage.tsx << 'EOF'
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Zap, Eye } from 'lucide-react';
import { Message } from '@/types';
import { useStore } from '@/lib/store';
import { formatTimestamp } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { setActiveResult } = useStore();

  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-in slide-in-from-bottom-2">
        <div className="max-w-2xl">
          <Card className="px-5 py-3 rounded-2xl rounded-tr-sm">
            <p className="text-card-foreground">{message.text}</p>
          </Card>
          <div className="flex items-center justify-end gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 animate-in slide-in-from-bottom-2">
      <Avatar className="w-9 h-9 flex-shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-primary to-ring">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 max-w-3xl">
        <Card className="rounded-2xl rounded-tl-sm p-5">
          <p className="text-card-foreground whitespace-pre-wrap">{message.text}</p>
          
          {message.result && (
            <Button
              onClick={() => setActiveResult(message.result!)}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Results
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
EOF

cat > src/components/chat/ChatInput.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Code } from 'lucide-react';
import { useSSE } from '@/hooks/useSSE';
import { getUserId } from '@/lib/utils';
import { useStore } from '@/lib/store';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { currentSessionId, isStreaming } = useStore();
  const { sendMessage } = useSSE(getUserId(), currentSessionId);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming || !currentSessionId) return;
    
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border p-4 bg-card">
      <Card className="rounded-xl p-3 shadow-lg">
        <div className="flex items-end gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data, request forecasts, or run queries..."
            className="min-h-[80px] resize-none border-0 focus-visible:ring-0"
            disabled={isStreaming || !currentSessionId}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming || !currentSessionId}
            className="bg-gradient-to-r from-primary to-ring"
          >
            <span>Send</span>
            <Send className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-auto p-1">
            <Paperclip className="w-3 h-3 mr-1" />
            Attach file
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-1">
            <Code className="w-3 h-3 mr-1" />
            SQL editor
          </Button>
          <span className="ml-auto">Press Enter to send, Shift+Enter for new line</span>
        </div>
      </Card>
    </div>
  );
}
EOF

cat > src/components/chat/ChatArea.tsx << 'EOF'
'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';

export function ChatArea() {
  const { messages, isStreaming, currentStreamingText } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamingText]);

  return (
    <ScrollArea className="flex-1 p-6">
      <div ref={scrollRef} className="space-y-6">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isStreaming && currentStreamingText && (
          <div className="flex gap-4 animate-in slide-in-from-bottom-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-ring flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
            </div>
            <Card className="flex-1 max-w-3xl rounded-2xl rounded-tl-sm p-5">
              <p className="text-card-foreground whitespace-pre-wrap">
                {currentStreamingText}
              </p>
            </Card>
          </div>
        )}
        
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full">
            <Card className="max-w-md p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions about your data, request forecasts, or explore insights.
              </p>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
EOF

# Create Results components
cat > src/components/results/ResultsTabs.tsx << 'EOF'
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VisualizationTab } from './VisualizationTab';
import { TableTab } from './TableTab';
import { SQLTab } from './SQLTab';
import { MetaTab } from './MetaTab';
import { InsightsTab } from './InsightsTab';
import { BarChart, Table, Lightbulb, Code, Info } from 'lucide-react';

export function ResultsTabs() {
  return (
    <div className="w-1/3 bg-card flex flex-col" style={{ minWidth: '450px' }}>
      <Tabs defaultValue="visualization" className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <TabsList className="justify-start">
            <TabsTrigger value="visualization" className="text-xs">
              <BarChart className="w-4 h-4 mr-2" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="table" className="text-xs">
              <Table className="w-4 h-4 mr-2" />
              Table
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <Lightbulb className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="sql" className="text-xs">
              <Code className="w-4 h-4 mr-2" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="meta" className="text-xs">
              <Info className="w-4 h-4 mr-2" />
              Meta
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="visualization">
            <VisualizationTab />
          </TabsContent>
          
          <TabsContent value="table">
            <TableTab />
          </TabsContent>
          
          <TabsContent value="insights">
            <InsightsTab />
          </TabsContent>
          
          <TabsContent value="sql">
            <SQLTab />
          </TabsContent>
          
          <TabsContent value="meta">
            <MetaTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
EOF

cat > src/components/results/VisualizationTab.tsx << 'EOF'
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Maximize } from 'lucide-react';
import { useStore } from '@/lib/store';
import { VegaLite } from 'react-vega';

export function VisualizationTab() {
  const { activeResult } = useStore();

  if (!activeResult?.chart) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No visualization available. Send a query to see results.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        Data Visualization
      </h4>
      
      <Card>
        <CardContent className="p-4">
          <VegaLite 
            spec={activeResult.chart} 
            actions={false}
            theme="dark"
          />
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm">
          <Download className="w-3.5 h-3.5 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm">
          <Maximize className="w-3.5 h-3.5 mr-2" />
          Fullscreen
        </Button>
      </div>
    </div>
  );
}
EOF

cat > src/components/results/TableTab.tsx << 'EOF'
'use client';

import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStore } from '@/lib/store';

export function TableTab() {
  const { activeResult } = useStore();

  if (!activeResult?.rows || !activeResult?.columns) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No table data available. Send a query to see results.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        Query Results
      </h4>
      
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {activeResult.columns.map((column, i) => (
                <TableHead key={i} className="text-xs">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeResult.rows.slice(0, 10).map((row, i) => (
              <TableRow key={i}>
                {activeResult.columns!.map((column, j) => (
                  <TableCell key={j} className="text-xs">
                    {String(row[column] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      
      {activeResult.rowCount && activeResult.rowCount > 10 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing 10 of {activeResult.rowCount} rows
        </p>
      )}
    </div>
  );
}
EOF

cat > src/components/results/InsightsTab.tsx << 'EOF'
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';

export function InsightsTab() {
  const { activeResult } = useStore();

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        AI Insights
      </h4>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {activeResult 
              ? 'Insights will be generated based on the query results.'
              : 'No insights available yet. Send a query to get started.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
EOF

cat > src/components/results/SQLTab.tsx << 'EOF'
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useStore } from '@/lib/store';

export function SQLTab() {
  const { activeResult } = useStore();

  const copyToClipboard = () => {
    if (activeResult?.sql) {
      navigator.clipboard.writeText(activeResult.sql);
    }
  };

  if (!activeResult?.sql) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No SQL query available. Send a query to see the generated SQL.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        SQL Query
      </h4>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider text-primary">
            Generated Query
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            <Copy className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-muted-foreground overflow-x-auto p-3 bg-secondary/20 rounded border-l-2 border-primary">
            <code>{activeResult.sql}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
EOF

cat > src/components/results/MetaTab.tsx << 'EOF'
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';

export function MetaTab() {
  const { activeResult } = useStore();

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        Execution Metadata
      </h4>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Query Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rows Returned</span>
            <span className="font-medium">{activeResult?.rowCount ?? 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Columns</span>
            <span className="font-medium">{activeResult?.columns?.length ?? 'N/A'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
EOF

# Create main page
cat > src/app/page.tsx << 'EOF'
'use client';

import { Header } from '@/components/layout/Header';
import { SessionList } from '@/components/sessions/SessionList';
import { ChatArea } from '@/components/chat/ChatArea';
import { ChatInput } from '@/components/chat/ChatInput';
import { ResultsTabs } from '@/components/results/ResultsTabs';

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <SessionList />
        
        <div className="flex-1 flex flex-col border-r border-border">
          <ChatArea />
          <ChatInput />
        </div>
        
        <ResultsTabs />
      </div>
    </div>
  );
}
EOF

# Update global styles
cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 47.4% 11.2%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 47.4% 11.2%;
    --popover-foreground: 210 40% 98%;
    --primary: 263 70% 50.4%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 263 70% 50.4%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@keyframes slide-in-from-bottom {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: slide-in-from-bottom 0.3s ease-out;
}
EOF

# Create README
cat > README.md << 'EOF'
# Selecta Frontend

Modern AI Analytics Platform built with Next.js 14, TypeScript, and Shadcn UI.

## Features

- ✨ Real-time chat interface with streaming responses
- 📊 Interactive data visualizations using Vega-Lite
- 🔄 Session management with persistent state
- 🎨 Beautiful dark mode UI with Tailwind CSS
- 🚀 Server-Sent Events (SSE) for live updates
- 📱 Responsive 3-column layout

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.local.example .env.local
   # Edit .env.local with your backend URL
   \`\`\`

3. Run development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000)

## Backend Setup

This frontend requires the Selecta ADK backend running at port 8080.

\`\`\`bash
cd ../backend
uv run adk api_server app --allow_origins "*" --port 8080
\`\`\`

## Project Structure

\`\`\`
src/
├── app/                  # Next.js 14 app directory
├── components/           # React components
│   ├── chat/            # Chat interface
│   ├── sessions/        # Session management
│   ├── results/         # Results visualization
│   └── layout/          # Layout components
├── lib/                 # Utilities and API client
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
└── config/              # Configuration
\`\`\`

## Technologies

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand
- **Charts**: Vega-Lite + React-Vega
- **Icons**: Lucide React

## Environment Variables

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=app
\`\`\`

## Development

\`\`\`bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
\`\`\`

## License

MIT
EOF

echo "✅ Codebase generated successfully!"
echo ""
echo "📝 Next steps:"
echo "   cd $PROJECT_NAME"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "🔌 Make sure your backend is running at: $BACKEND_URL"