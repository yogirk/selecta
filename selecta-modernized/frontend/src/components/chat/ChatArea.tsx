"use client"
import { useEffect, useRef } from "react"
import { ChatMessage } from "./ChatMessage"
import { useStore } from "@/lib/store"
import { Zap } from "lucide-react"

export function ChatArea() {
  const { messages, isStreaming, currentStreamingText } = useStore()
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages, currentStreamingText])

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Chat Messages */}
      <div ref={viewportRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-2xl bg-primary/10 p-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Start a conversation</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                Ask about your data, explore insights, or request a forecast—the assistant will guide you.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isStreaming && currentStreamingText && (
              <div className="flex gap-3 animate-in fade-in">
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 rounded-lg bg-card border border-border p-4">
                  <p className="text-sm text-foreground">{currentStreamingText}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
