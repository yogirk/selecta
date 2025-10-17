'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, Settings, Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/layout/ThemeProvider';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-card/60 px-6 py-3 backdrop-blur-xl shadow-[0_16px_40px_-28px_rgba(15,23,42,0.25)]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#a855f7] via-[#9333ea] to-[#7c3aed] text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Selecta</h1>
            <p className="text-xs text-muted-foreground">AI Analytics Platform</p>
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
        <Badge variant="outline" className="gap-2 rounded-full border-border/20 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span>BigQuery Connected</span>
        </Badge>
        <Button variant="outline" size="sm" className="rounded-lg gap-2 bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
        <Avatar className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-md">
          <AvatarFallback className="text-sm font-semibold text-primary-foreground">
            U
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
