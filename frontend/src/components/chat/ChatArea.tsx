'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Send, Zap } from 'lucide-react';

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
    <div className="layer-base flex-1 min-h-0 border-r border-border-subtle">
      <div className="h-full overflow-y-auto px-6 py-6" ref={viewportRef}>
        <div className="flex h-full flex-col gap-8">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex h-full items-center justify-center">
              <Card className="empty-state max-w-md gap-4 rounded-2xl px-8 py-10 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Send className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Start a conversation</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask about your data, explore insights, or request a forecast—the assistant will guide you.
                </p>
              </Card>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isStreaming && currentStreamingText && (
                <div className="flex gap-4 animate-in slide-in-from-bottom-2">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a855f7] to-[#7c3aed] text-white shadow-md">
                    <Zap className="h-5 w-5" />
                  </div>
                  <Card className="card-elevated flex-1 max-w-3xl rounded-2xl rounded-tl-none p-5">
                    <p className="text-card-foreground whitespace-pre-wrap">{currentStreamingText}</p>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
