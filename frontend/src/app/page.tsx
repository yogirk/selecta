'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { SessionList } from '@/components/sessions/SessionList';
import { ChatArea } from '@/components/chat/ChatArea';
import { ChatInput } from '@/components/chat/ChatInput';
import { ResultsTabs } from '@/components/results/ResultsTabs';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen, Plus } from 'lucide-react';

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
            <div className="hidden h-full w-[60px] flex-col items-center border-r border-border-subtle bg-[color:var(--card)] py-4 lg:flex">
              <div className="mb-4 px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </Button>
              </div>
              <div className="px-2">
                <Button
                  onClick={() => {
                    setIsSidebarOpen(true);
                    // Small delay to allow sidebar to expand before triggering new session
                    setTimeout(() => {
                      const newSessionBtn = document.querySelector('button[aria-label="New Session"]');
                      if (newSessionBtn instanceof HTMLElement) newSessionBtn.click();
                    }, 100);
                  }}
                  size="icon"
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  aria-label="New Session"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
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
