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
    <div className="layer-base flex min-h-screen w-full flex-col">
      <Header />

      <main className="flex flex-1 overflow-hidden">
        <div className="flex w-full min-h-0">
          {isSidebarOpen ? (
            <SessionList onCollapse={() => setIsSidebarOpen(false)} />
          ) : (
            <div className="hidden h-full w-14 shrink-0 items-start justify-center pt-4 lg:flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="mt-4 rounded-xl bg-card/70 p-2 text-muted-foreground shadow-md hover:text-foreground"
                aria-label="Open recent sessions"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </Button>
            </div>
          )}

          <section className="layer-base flex min-h-0 min-w-0 flex-1 flex-col">
            <ChatArea />
            <ChatInput />
          </section>

          <ResultsTabs />
        </div>
      </main>
    </div>
  );
}
