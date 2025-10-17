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
    <div className="bg-background/80 px-6 py-4 backdrop-blur">
      <Card className="input-glass rounded-xl p-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data, request forecasts, or run queries..."
              className="min-h-[72px] resize-none border-0 bg-transparent px-0 text-sm text-card-foreground focus-visible:ring-0 focus-visible:outline-none"
              disabled={isStreaming || !currentSessionId}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming || !currentSessionId}
            className="flex-shrink-0 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#7c3aed] px-5 py-3 text-sm font-medium text-white shadow-md transition hover:from-[#9a4ff6] hover:to-[#6d28d9] disabled:opacity-50"
          >
            <span>Send</span>
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-auto gap-1 rounded-lg bg-transparent px-0 py-0 text-muted-foreground hover:text-foreground">
            <Paperclip className="h-3 w-3" />
            Attach file
          </Button>
          <Button variant="ghost" size="sm" className="h-auto gap-1 rounded-lg bg-transparent px-0 py-0 text-muted-foreground hover:text-foreground">
            <Code className="h-3 w-3" />
            SQL editor
          </Button>
          <span className="ml-auto text-muted-foreground/80">
            Press Enter to send
          </span>
        </div>
      </Card>
    </div>
  );
}
