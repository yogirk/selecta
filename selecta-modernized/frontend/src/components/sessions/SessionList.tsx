"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, PanelLeftClose, Clock, MessageSquare } from "lucide-react"
import { useStore } from "@/lib/store"
import { apiClient } from "@/lib/api"
import { getUserId, generateId, formatTimestamp } from "@/lib/utils"

interface SessionListProps {
  onCollapse: () => void
}

export function SessionList({ onCollapse }: SessionListProps) {
  const { sessions, currentSessionId, setSessions, setCurrentSessionId, clearMessages, loadSessionMessages } =
    useStore()

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSessions = async () => {
    try {
      const userId = getUserId()
      const sessionsList = await apiClient.getSessions(userId)
      setSessions(sessionsList)

      if (sessionsList.length === 0) {
        createNewSession()
      } else if (!currentSessionId) {
        setCurrentSessionId(sessionsList[0].id)
      }
    } catch (error) {
      console.error("Failed to load sessions:", error)
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

  return (
    <div className="flex h-full flex-col bg-surface border-r border-border-subtle">
      {/* Header */}
      <div className="border-b border-border-subtle px-4 py-4 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Sessions</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className="text-muted-foreground hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* New Session Button */}
      <div className="px-4 py-3">
        <Button
          onClick={createNewSession}
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Sessions</h3>
            <span className="text-xs font-mono text-muted-foreground">
              {sessions.length.toString().padStart(2, "0")}
            </span>
          </div>

          {sessions.map((session) => {
            const isActive = session.id === currentSessionId
            const sessionLabel = session.events.length > 0 ? "Active Session" : "New Session"

            return (
              <button
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary/20 border border-primary/50 shadow-lg shadow-primary/10"
                    : "bg-card border border-border hover:border-border-subtle hover:bg-card/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {sessionLabel}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {session.events.length > 0 ? `${session.events.length} messages` : "No messages yet"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(session.lastUpdateTime)}
                </p>
              </button>
            )
          })}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="border-t border-border-subtle px-4 py-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
        <Button variant="outline" className="w-full justify-start text-sm bg-transparent">
          Browse Tables
        </Button>
        <Button variant="outline" className="w-full justify-start text-sm bg-transparent">
          Saved Queries
        </Button>
        <Button variant="outline" className="w-full justify-start text-sm bg-transparent">
          ML Models
        </Button>
      </div>
    </div>
  )
}
