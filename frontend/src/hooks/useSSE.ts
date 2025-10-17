import { useRef, useCallback } from 'react';
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
