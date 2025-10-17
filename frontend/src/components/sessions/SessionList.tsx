'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, PanelLeftClose } from 'lucide-react';
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
    <aside className="layer-surface hidden h-full w-72 shrink-0 flex-col border-r border-border shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)] lg:flex">
      <div className="flex items-center gap-2 border-b border-border-subtle p-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={createNewSession}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white shadow-md transition hover:from-[#9a4ff6] hover:to-[#6d28d9]"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Session
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className="rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Collapse recent sessions"
          >
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            Recent Sessions
          </h3>
          <span className="text-[10px] text-muted-foreground/80">{sessions.length.toString().padStart(2, '0')}</span>
        </div>

        <ScrollArea className="h-full pr-1">
          <div className="space-y-3">
            {sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const sessionLabel = session.events.length > 0 ? 'Active Session' : 'New Session';
              return (
                <div
                  key={session.id}
                  onClick={() => selectSession(session.id)}
                  className={`session-card cursor-pointer p-4 ${
                    isActive ? 'session-card-active' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-card-foreground">
                        {sessionLabel}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        {session.events.length > 0 ? `${session.events.length} messages` : 'No messages yet'}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary/70 px-2 py-1 text-[10px] font-medium text-secondary-foreground">
                      {formatTimestamp(session.lastUpdateTime)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t border-border-subtle p-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="h-10 w-full justify-start gap-2 rounded-full border-0 px-4 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            size="sm"
          >
            Browse Tables
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full justify-start gap-2 rounded-full border-0 px-4 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            size="sm"
          >
            Saved Queries
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full justify-start gap-2 rounded-full border-0 px-4 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            size="sm"
          >
            ML Models
          </Button>
        </div>
      </div>
    </aside>
  );
}
