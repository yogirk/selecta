import type { Session } from "./store"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

  async getSessions(userId: string): Promise<Session[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions?userId=${userId}`)
      const data: ApiResponse<Session[]> = await response.json()
      return data.data || []
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
      return []
    }
  }

  async getSession(userId: string, sessionId: string): Promise<Session> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}?userId=${userId}`)
      const data: ApiResponse<Session> = await response.json()
      return data.data || { id: sessionId, userId, events: [], lastUpdateTime: Date.now(), createdAt: Date.now() }
    } catch (error) {
      console.error("Failed to fetch session:", error)
      return { id: sessionId, userId, events: [], lastUpdateTime: Date.now(), createdAt: Date.now() }
    }
  }

  async createSession(userId: string, sessionId: string): Promise<Session> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId }),
      })
      const data: ApiResponse<Session> = await response.json()
      return data.data || { id: sessionId, userId, events: [], lastUpdateTime: Date.now(), createdAt: Date.now() }
    } catch (error) {
      console.error("Failed to create session:", error)
      return { id: sessionId, userId, events: [], lastUpdateTime: Date.now(), createdAt: Date.now() }
    }
  }

  async sendMessage(userId: string, sessionId: string, message: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId, message }),
      })
      const data: ApiResponse<{ response: string }> = await response.json()
      return data.data?.response || ""
    } catch (error) {
      console.error("Failed to send message:", error)
      return ""
    }
  }
}

export const apiClient = new ApiClient()
