'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Zap, Sparkles, ArrowRight } from 'lucide-react';

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
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div ref={viewportRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex h-full flex-col items-center justify-center gap-8 py-12 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 shadow-lg shadow-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <div className="absolute -inset-1 rounded-3xl bg-primary/20 blur-xl opacity-50" />
                </div>
                <div className="space-y-3">
                  <h2 className="font-outfit text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Welcome to Selecta
                  </h2>
                  <p className="max-w-md text-base text-muted-foreground leading-relaxed">
                    Your AI-powered analytics assistant. Ask questions about your data, generate visualizations, and uncover insights instantly.
                  </p>
                </div>
              </div>

              <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  "Show me the top selling products",
                  "Analyze revenue trends for the last quarter",
                  "What are the most popular categories?",
                  "Compare sales performance by region"
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    className="group flex items-center justify-between rounded-xl border border-border-subtle bg-card/50 px-4 py-3.5 text-left text-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5"
                    onClick={() => {
                      const input = document.querySelector('textarea') as HTMLTextAreaElement;
                      if (input) {
                        input.value = suggestion;
                        input.focus();
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }}
                  >
                    <span className="text-foreground/80 group-hover:text-primary font-medium">{suggestion}</span>
                    <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100 text-primary" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isStreaming && (
                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground">Selecta</span>
                      <span className="text-xs text-muted-foreground/60">Thinking...</span>
                    </div>
                    <Card className="card-elevated rounded-2xl rounded-tl-none border-primary/20 p-5 shadow-md">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Zap className="h-4 w-4 animate-pulse text-primary" />
                        <span className="text-sm font-medium">Synthesizing response...</span>
                      </div>
                      {currentStreamingText && (
                        <div className="mt-4 border-t border-border-subtle pt-3">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {currentStreamingText}
                          </p>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
