'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Zap, Eye } from 'lucide-react';
import { Message } from '@/types';
import { useStore } from '@/lib/store';
import { formatTimestamp } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { setActiveResult } = useStore();

  if (message.role === 'user') {
    return (
      <div className="animate-in slide-in-from-bottom-2 flex justify-end">
        <div className="max-w-2xl">
          <Card className="rounded-2xl rounded-tr-sm border border-primary/40 bg-primary/10 px-5 py-3 text-sm">
            <p className="text-card-foreground whitespace-pre-wrap">{message.text}</p>
          </Card>
          <div className="mt-2 flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground/80">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-2 flex gap-4">
      <Avatar className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
        <AvatarFallback className="bg-transparent">
          <Zap className="h-5 w-5 text-primary" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 max-w-3xl">
        <Card className="rounded-2xl rounded-tl-sm border border-border/60 bg-card p-5">
          <p className="text-card-foreground whitespace-pre-wrap">{message.text}</p>
          
          {message.result && (
            <Button
              onClick={() => setActiveResult(message.result!)}
              variant="outline"
              size="sm"
              className="mt-4 rounded-lg border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Results
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
