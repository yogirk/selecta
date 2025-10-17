"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sparkles, Settings, Moon, SunMedium } from "lucide-react"
import { useTheme } from "next-themes"

export function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="border-b border-border-subtle bg-surface/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground">Selecta</h1>
            <p className="text-xs text-muted-foreground">AI Analytics Platform</p>
          </div>
        </div>

        {/* Status and Controls */}
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-2 border-primary/30 bg-primary/10 text-primary">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            BigQuery Connected
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </Button>

          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
