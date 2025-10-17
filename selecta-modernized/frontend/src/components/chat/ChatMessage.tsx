import type { Message } from "@/lib/store"
import { Sparkles } from "lucide-react"

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant"

  return (
    <div className={`flex gap-3 animate-in fade-in ${isAssistant ? "" : "flex-row-reverse"}`}>
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
          isAssistant ? "bg-primary/20" : "bg-accent/20"
        }`}
      >
        {isAssistant ? (
          <Sparkles className="h-4 w-4 text-primary" />
        ) : (
          <div className="h-4 w-4 rounded-full bg-accent" />
        )}
      </div>
      <div
        className={`flex-1 rounded-lg p-4 ${
          isAssistant ? "bg-card border border-border" : "bg-primary/10 border border-primary/20"
        }`}
      >
        <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
