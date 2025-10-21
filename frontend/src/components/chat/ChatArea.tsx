'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export function ChatArea() {
  const { messages, isStreaming, currentStreamingText } = useStore();
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, currentStreamingText]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden border-r border-border-subtle bg-background">
      <div ref={viewportRef} className="flex-1 overflow-y-auto space-y-4 px-6 py-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-2xl bg-primary/10 p-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="heading-md text-foreground">Start a conversation</h2>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                <b>Selecta : </b>A person who plays recorded reggae and dance music; a DJ. Ask about your data, explore insights, ask for drill downs ...
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isStreaming && (
              <div className="flex gap-3 animate-in fade-in">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <Card className="card-elevated flex-1 rounded-lg p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Processing</p>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {currentStreamingText || 'Synthesizing response...'}
                  </p>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
