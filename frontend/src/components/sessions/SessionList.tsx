"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, PanelLeftClose, Pencil, Trash2, Database, LibrarySquare, Zap } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useStore } from "@/lib/store"
import { apiClient } from "@/lib/api"
import { getUserId, generateId, formatTimestamp } from "@/lib/utils"

const NAME_FALLBACK_PREFIX = "Session"

const QUICK_ACTIONS = [
  { id: "browse", label: "Browse Tables", icon: Database },
  { id: "saved", label: "Saved Queries", icon: LibrarySquare },
  { id: "ml", label: "ML Models", icon: Zap },
] as const

interface SessionListProps {
  onCollapse: () => void
}

export function SessionList({ onCollapse }: SessionListProps) {
  const {
    sessions,
    currentSessionId,
    setSessions,
    setCurrentSessionId,
    clearMessages,
    loadSessionMessages,
    sessionMetadata,
    setSessionName,
    removeSession,
  } = useStore()

  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const userId = getUserId()
      const sessionsList = await apiClient.getSessions(userId)
      const sortedSessions = [...sessionsList].sort((a, b) => (b.lastUpdateTime ?? 0) - (a.lastUpdateTime ?? 0))
      setSessions(sortedSessions)

      // If no current session, create one
      if (sortedSessions.length === 0) {
        createNewSession()
      } else if (!currentSessionId) {
        setCurrentSessionId(sortedSessions[0].id)
      }
    } catch (error) {
      console.error("Failed to load sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createNewSession = async () => {
    try {
      const userId = getUserId()
      const sessionId = generateId()

      await apiClient.createSession(userId, sessionId)
      setCurrentSessionId(sessionId)
      clearMessages()

      await loadSessions()
      toast.success("New session created")
    } catch (error) {
      console.error("Failed to create session:", error)
    }
  }

  const selectSession = async (sessionId: string) => {
    try {
      const userId = getUserId()
      const session = await apiClient.getSession(userId, sessionId)

      setCurrentSessionId(sessionId)
      loadSessionMessages(session)
    } catch (error) {
      console.error("Failed to load session:", error)
    }
  }

  const deleteSession = async (sessionId: string) => {
    const userId = getUserId()
    setRemovingId(sessionId)
    try {
      await apiClient.deleteSession(userId, sessionId)
    } catch (error) {
      console.error("Failed to delete session:", error)
    } finally {
      removeSession(sessionId)
      const { currentSessionId: nextId, sessions: remaining } = useStore.getState()
      if (!nextId && remaining.length > 0) {
        await selectSession(remaining[0].id)
      }
      setRemovingId(null)
    }
  }

  return (
    <div className="hidden h-full w-72 flex-col border-r border-border-subtle bg-[color:var(--card)] lg:flex">
      <div className="flex-shrink-0 border-b border-border-subtle">
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="heading-sm text-foreground">Sessions</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onCollapse}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-4 pb-3">
          <Button
            onClick={createNewSession}
            className="w-full gap-2 rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden px-4">
        <div className="flex items-center justify-between px-1 py-3 text-xs text-muted-foreground">
          <span className="heading-xs text-muted-foreground">Recent Sessions</span>
          <span className="font-mono">{sessions.length.toString().padStart(2, "0")}</span>
        </div>

        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="space-y-3 pb-12 pr-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full rounded-lg border border-border-subtle bg-[color:var(--background)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                </div>
              ))
            ) : (
              sessions.map((session, index) => {
                const isActive = session.id === currentSessionId
                const storedName = sessionMetadata[session.id]?.name
                const rawStateTitle = session.state ? (session.state["title"] as unknown) : undefined
                const stateTitle = typeof rawStateTitle === "string" ? rawStateTitle.trim() : ""
                const fallbackName = `${NAME_FALLBACK_PREFIX} ${(index + 1).toString().padStart(2, "0")}`
                const displayName = storedName || stateTitle || fallbackName
                const isRemoving = removingId === session.id

                return (
                  <div
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectSession(session.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void selectSession(session.id);
                      }
                    }}
                    className={`group w-full rounded-lg border bg-[color:var(--background)] px-4 py-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${isActive
                      ? "border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                      : "border-border-subtle hover:border-border hover:bg-[color:var(--card)]"
                      } ${isRemoving ? "translate-x-4 scale-[0.97] opacity-0" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{displayName}</p>

                      <div className="flex flex-shrink-0 items-center gap-1">
                        <span className="rounded-full bg-secondary/60 px-2 py-1 text-xs font-medium text-secondary-foreground transition-opacity group-hover:opacity-0">
                          {formatTimestamp(session.lastUpdateTime)}
                        </span>

                        <div className="absolute right-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isRemoving}
                            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                            onClick={(event) => {
                              event.stopPropagation()
                              const currentName = storedName || stateTitle || fallbackName
                              const input = window.prompt("Name this session", currentName)
                              if (input === null) return
                              const trimmed = input.trim()
                              setSessionName(session.id, trimmed.length > 0 ? trimmed : null)
                              toast.success("Session renamed")
                            }}
                            aria-label={`Rename ${displayName}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isRemoving}
                            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                            onClick={(event) => {
                              event.stopPropagation()
                              if (window.confirm(`Delete ${displayName}?`)) {
                                void deleteSession(session.id)
                                toast.success("Session deleted")
                              }
                            }}
                            aria-label={`Delete ${displayName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
        <div
          className="pointer-events-none absolute bottom-0 left-4 right-4 h-12"
          style={{ background: 'linear-gradient(to top, var(--card), transparent)' }}
        />
      </div>

      <div className="flex-shrink-0 border-t border-border-subtle px-4 py-4">
        <p className="heading-xs mb-3 text-muted-foreground">Quick Actions</p>
        <div className="space-y-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.id}
                variant="ghost"
                className="group h-12 w-full justify-start gap-3 rounded-xl border border-border-subtle bg-[color:var(--background)] px-4 text-sm font-medium text-foreground/80 transition-all duration-150 hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
              >
                <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                {action.label}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
