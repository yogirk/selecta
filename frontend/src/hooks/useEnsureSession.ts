'use client';

import { useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useStore } from '@/lib/store';
import { generateId, getUserId } from '@/lib/utils';

export function useEnsureSession(userIdOverride?: string) {
  const setSessions = useStore((state) => state.setSessions);
  const setCurrentSessionId = useStore((state) => state.setCurrentSessionId);
  const clearMessages = useStore((state) => state.clearMessages);
  const loadSessionMessages = useStore((state) => state.loadSessionMessages);

  const inFlightRef = useRef<Promise<string | null> | null>(null);

  return useCallback(async () => {
    const currentId = useStore.getState().currentSessionId;
    if (currentId) {
      return currentId;
    }

    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const userId = userIdOverride ?? getUserId();

    const ensurePromise = (async () => {
      try {
        const existingSessions = await apiClient.getSessions(userId);
        setSessions(existingSessions);

        if (existingSessions.length > 0) {
          const sessionId = existingSessions[0].id;
          setCurrentSessionId(sessionId);

          try {
            const session = await apiClient.getSession(userId, sessionId);
            loadSessionMessages(session);
          } catch (error) {
            console.error('Failed to load existing session history:', error);
          }

          return sessionId;
        }

        const sessionId = generateId();
        await apiClient.createSession(userId, sessionId);
        setCurrentSessionId(sessionId);
        clearMessages();

        try {
          const [session, refreshedSessions] = await Promise.all([
            apiClient.getSession(userId, sessionId),
            apiClient.getSessions(userId),
          ]);
          setSessions(refreshedSessions);
          loadSessionMessages(session);
        } catch (error) {
          console.error('Failed to hydrate new session:', error);
        }

        return sessionId;
      } catch (error) {
        console.error('Failed to ensure session:', error);
        return null;
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = ensurePromise;
    return ensurePromise;
  }, [clearMessages, loadSessionMessages, setCurrentSessionId, setSessions, userIdOverride]);
}
 
