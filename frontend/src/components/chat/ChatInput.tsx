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
    <div className="bg-card/90 px-6 pb-6 pt-4">
      <Card className="overflow-hidden rounded-2xl bg-card/95 p-4 shadow-[0_26px_45px_-28px_hsl(var(--color-foreground)/0.4)] gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data, request forecasts, or run queries..."
              className="min-h-[80px] flex-1 resize-none border-0 bg-transparent px-0 text-sm text-card-foreground focus-visible:ring-0"
              disabled={isStreaming || !currentSessionId}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isStreaming || !currentSessionId}
              className="flex-shrink-0 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <span>Send</span>
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Button variant="ghost" size="sm" className="h-auto rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground">
              <Paperclip className="mr-2 h-3 w-3" />
              Attach file
            </Button>
            <Button variant="ghost" size="sm" className="h-auto rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground">
              <Code className="mr-2 h-3 w-3" />
              SQL editor
            </Button>
            <span className="ml-auto text-muted-foreground/80">
              Press Enter to send • Shift + Enter for newline
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
