'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, Settings, Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/layout/ThemeProvider';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-card/95 px-6 py-4 shadow-[0_14px_40px_-30px_hsl(var(--color-foreground)/0.4)] backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Selecta</h1>
            <p className="text-xs text-muted-foreground">AI Analytics</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg text-muted-foreground hover:text-foreground"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? (
            <SunMedium className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <Badge variant="secondary" className="gap-2 rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          BigQuery Connected
        </Badge>
        <Button variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:text-foreground">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
        <Avatar className="h-10 w-10 rounded-full border border-border bg-card">
          <AvatarFallback className="text-sm font-semibold text-foreground">
            U
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
