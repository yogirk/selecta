'use client';

import { useState } from 'react';
import { ChevronRight, BarChart, ArrowRight, Sparkles, User } from 'lucide-react';
import { Message } from '@/types';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import { ThinkingIndicator } from './ThinkingIndicator';
import { CodeBlock } from './CodeBlock';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type CodeRendererProps = {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
} & ComponentPropsWithoutRef<'code'>;

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const activeResultId = useStore((state) => state.activeResultId);
  const setActiveResultById = useStore((state) => state.setActiveResultById);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  const isAssistant = message.role !== 'user';
  const resultId = message.resultId ?? message.result?.id;
  const isResultSelected = Boolean(resultId && activeResultId === resultId);

  const showThinking = isAssistant && !message.text && !message.thinking && !message.resultId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        "group flex w-full gap-4",
        !isAssistant && "flex-row-reverse"
      )}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm",
        isAssistant ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted border-border-subtle text-muted-foreground"
      )}>
        {isAssistant ? (
          <Sparkles className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>

      <div className={cn("flex max-w-[85%] flex-col gap-2", !isAssistant && "items-end")}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-medium text-muted-foreground">
            {isAssistant ? 'Selecta' : 'You'}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-2xl px-5 py-3.5 text-sm shadow-sm",
            isAssistant
              ? "bg-card border border-border-subtle text-foreground"
              : "bg-primary/10 border border-primary/10 text-foreground"
          )}
        >
          {showThinking && (
            <ThinkingIndicator />
          )}

          {message.thinking && (
            <div className="mb-4">
              <div
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setIsReasoningOpen(!isReasoningOpen)}
              >
                <motion.div
                  animate={{ rotate: isReasoningOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </motion.div>
                <span>Reasoning Process</span>
              </div>
              <AnimatePresence>
                {isReasoningOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 border-l-2 border-border-subtle pl-3 text-muted-foreground">
                      <div className="markdown text-xs">
                        <ReactMarkdown>
                          {message.thinking}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {message.text && (
            <div className="markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ inline, className, children, ...props }: CodeRendererProps) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match?.[1] ?? 'plaintext';
                    const code = String(children).replace(/\n$/, '');

                    if (inline) {
                      return (
                        <code className={cn('inline-code', className)} {...props}>
                          {children}
                        </code>
                      );
                    }

                    return <CodeBlock language={language} code={code} />;
                  },
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {isAssistant && resultId && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => setActiveResultById(resultId)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                isResultSelected
                  ? "border-primary bg-primary/5 text-primary shadow-sm"
                  : "border-border-subtle bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <BarChart className="h-3.5 w-3.5" />
              <span>View Analysis Result</span>
              <ArrowRight className={cn("h-3 w-3 transition-transform", isResultSelected && "translate-x-0.5")} />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
