"use client"

import { useState } from "react"
import { Header } from "@/frontend/src/components/layout/Header"
import { SessionList } from "@/frontend/src/components/sessions/SessionList"
import { ChatArea } from "@/frontend/src/components/chat/ChatArea"
import { ResultsTabs } from "@/frontend/src/components/results/ResultsTabs"

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 border-r border-border overflow-hidden">
            <SessionList onCollapse={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Chat and Results */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
            <ChatArea />
          </div>

          {/* Results Tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ResultsTabs />
          </div>
        </div>
      </div>
    </div>
  )
}
