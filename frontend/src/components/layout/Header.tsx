'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/layout/ThemeProvider';

const NAV_LINKS = [
  { label: 'Cloudside', href: 'https://thecloudside.com' },
  { label: 'Blog', href: 'https://blog.cloudside.com' },
  { label: 'Contact Us', href: 'https://thecloudside.com/contactus' },
];

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

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Avatar className="h-9 w-9 border border-border-subtle">
            <AvatarImage src="/cloudside-mark.svg" alt="Cloudside logo" />
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">C</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
