'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, Settings, Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/layout/ThemeProvider';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-border-subtle bg-[color:var(--card)]">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground">Selecta</h1>
            <p className="text-xs text-muted-foreground">Agentic Analytics solution from Cloudside</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-2 rounded-full border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            BigQuery Connected
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" className="rounded-lg text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </Button>

          <Avatar className="h-9 w-9 border border-border-subtle">
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
