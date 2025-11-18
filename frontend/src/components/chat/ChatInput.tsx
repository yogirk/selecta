'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
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
    <div className="layer-surface border-t border-border-subtle px-6 py-4">
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-2xl border border-border-subtle bg-card shadow-lg">
          <div className="flex items-end gap-3 p-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data, request forecasts, or run queries..."
              className="min-h-[64px] flex-1 resize-none border border-border-subtle bg-card px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none"
              disabled={isStreaming || !currentSessionId}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isStreaming || !currentSessionId}
              className="flex-shrink-0 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
            >
              <span>Send</span>
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-end px-3 pb-3 text-xs text-muted-foreground">
            <span>Press Enter to send</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
