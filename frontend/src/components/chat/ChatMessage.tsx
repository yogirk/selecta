'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Zap, Eye } from 'lucide-react';
import { Message } from '@/types';
import { useStore } from '@/lib/store';
import { formatTimestamp } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Highlight, themes } from 'prism-react-renderer';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { setActiveResult, activeResult } = useStore();

  const isAssistant = message.role !== 'user';
  const isResultSelected = message.result && activeResult === message.result;

  return (
    <div
      className={`flex gap-3 animate-in fade-in ${isAssistant ? '' : 'flex-row-reverse text-right'}`}
    >
      <Avatar
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          isAssistant ? 'bg-primary/20' : 'bg-accent/20'
        }`}
      >
        <AvatarFallback className="bg-transparent">
          {isAssistant ? <Zap className="h-4 w-4 text-primary" /> : <span className="h-3 w-3 rounded-full bg-accent" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <Card
          className={`rounded-lg px-4 py-3 ${
            isAssistant ? 'border border-border-subtle bg-card shadow-sm' : 'border border-primary/25 bg-primary/10'
          }`}
        >
          <div className="markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  if (inline) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  const language = match?.[1] ?? 'plaintext';
                  const code = String(children).replace(/\n$/, '');
                  return (
                    <Highlight code={code} language={language} theme={themes.nightOwl}>
                      {({ className: highlightClass, style, tokens, getLineProps, getTokenProps }) => (
                        <pre
                          className={`${highlightClass} markdown-pre`}
                          style={{
                            ...style,
                            margin: 0,
                            borderRadius: '0.75rem',
                            background: 'var(--surface)',
                            padding: '1rem',
                          }}
                        >
                          {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({ line, key: i })}>
                              {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token, key })} />
                              ))}
                            </div>
                          ))}
                        </pre>
                      )}
                    </Highlight>
                  );
                },
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>

          {isAssistant && message.result && (
            <Button
              onClick={() => setActiveResult(message.result!)}
              variant={isResultSelected ? 'default' : 'outline'}
              size="sm"
              className={`mt-3 gap-2 rounded-full px-3 py-1 text-xs ${
                isResultSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'border-border-subtle text-muted-foreground hover:border-primary hover:text-foreground'
              }`}
            >
              <Eye className="h-4 w-4" />
              {isResultSelected ? 'Viewing Results' : 'View Results'}
            </Button>
          )}
        </Card>

        <div className={`mt-2 flex items-center gap-2 text-xs text-muted-foreground ${isAssistant ? '' : 'justify-end'}`}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
