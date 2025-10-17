'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { SessionList } from '@/components/sessions/SessionList';
import { ChatArea } from '@/components/chat/ChatArea';
import { ChatInput } from '@/components/chat/ChatInput';
import { ResultsTabs } from '@/components/results/ResultsTabs';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen } from 'lucide-react';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />

      <main className="flex flex-1 min-h-0 overflow-hidden px-4 pb-6 pt-4 lg:px-6">
        <div className="flex w-full min-h-0 gap-4 xl:gap-6">
          {isSidebarOpen ? (
            <SessionList onCollapse={() => setIsSidebarOpen(false)} />
          ) : (
            <div className="hidden h-full w-14 shrink-0 items-start justify-center pt-4 lg:flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="surface-panel h-10 w-10 rounded-xl text-muted-foreground shadow-[0_16px_40px_-28px_hsl(var(--color-foreground)/0.4)] hover:text-foreground"
                aria-label="Open recent sessions"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </Button>
            </div>
          )}

          <section className="surface-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
            <ChatArea />
            <ChatInput />
          </section>

          <ResultsTabs />
        </div>
      </main>
    </div>
  );
}
