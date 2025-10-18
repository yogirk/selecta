'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, PanelLeftClose, MessageSquare } from 'lucide-react';
import { useStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { getUserId, generateId, formatTimestamp } from '@/lib/utils';

interface SessionListProps {
  onCollapse: () => void;
}

export function SessionList({ onCollapse }: SessionListProps) {
  const { sessions, currentSessionId, setSessions, setCurrentSessionId, clearMessages, loadSessionMessages } = useStore();

  useEffect(() => {
    loadSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="hidden h-full w-72 flex-col border-r border-border-subtle bg-[hsl(var(--surface))] lg:flex">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={onCollapse}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 py-3">
        <Button
          onClick={createNewSession}
          className="w-full gap-2 rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-[0.26em]">Recent Sessions</span>
            <span className="font-mono">{sessions.length.toString().padStart(2, '0')}</span>
          </div>

          {sessions.map((session) => {
            const isActive = session.id === currentSessionId;
            const sessionLabel = session.events.length > 0 ? 'Active Session' : 'New Session';

            return (
              <button
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                  isActive
                    ? 'border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10'
                    : 'border-border-subtle bg-card hover:border-border hover:bg-card/90'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{sessionLabel}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      {session.events.length > 0 ? `${session.events.length} messages` : 'No messages yet'}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary/60 px-2 py-1 text-[10px] font-medium text-secondary-foreground">
                    {formatTimestamp(session.lastUpdateTime)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-border-subtle px-4 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">Quick Actions</p>
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="h-auto w-full justify-start rounded-full bg-[hsl(var(--card))] px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-[hsl(var(--card))/0.92] hover:text-foreground"
          >
            Browse Tables
          </Button>
          <Button
            variant="ghost"
            className="h-auto w-full justify-start rounded-full bg-[hsl(var(--card))] px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-[hsl(var(--card))/0.92] hover:text-foreground"
          >
            Saved Queries
          </Button>
          <Button
            variant="ghost"
            className="h-auto w-full justify-start rounded-full bg-[hsl(var(--card))] px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-[hsl(var(--card))/0.92] hover:text-foreground"
          >
            ML Models
          </Button>
        </div>
      </div>
    </div>
  );
}
