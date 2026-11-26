import { apiClient, ApiClientError } from "../../../lib/api-client";
import type { TicketPriority } from "./tickets-api";

export interface TicketAiSuggestion {
  category: "Technical" | "Account" | "Billing";
  priority: TicketPriority;
}

export const ticketAiApi = {
  async suggestReply(ticketId: number, token: string, onDelta: (delta: string) => void, signal?: AbortSignal): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`/tickets/${ticketId}/ai/suggest-reply`, {
        method: "POST",
        headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
        signal,
      });
    } catch (error) {
      if (error instanceof TypeError) throw new ApiClientError("NETWORK_ERROR", "Unable to reach SupportDesk. Check your connection and try again.", null);
      throw error;
    }
    if (!response.ok || !response.body) {
      let message = "AI reply generation failed. Please try again.";
      try {
        const body: unknown = await response.json();
        if (typeof body === "object" && body !== null && "error" in body) {
          const apiError = body.error;
          if (typeof apiError === "object" && apiError !== null && "message" in apiError && typeof apiError.message === "string") message = apiError.message;
        }
      } catch { /* Keep the safe fallback. */ }
      throw new ApiClientError("AI_REQUEST_FAILED", message, response.status);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;
    const processEvent = (event: string) => {
      let eventType = "message";
      const data: string[] = [];
      for (const line of event.split(/\r?\n/)) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data.push(line.slice(5).trimStart());
        }
      }
      if (eventType === "error") {
        throw new ApiClientError("AI_REQUEST_FAILED", "AI reply generation failed. Please try again.", response.status);
      }
      if (data.length === 0) return;
      const payloadText = data.join("\n");
      if (payloadText === "[DONE]") {
        completed = true;
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(payloadText);
      } catch {
        throw new ApiClientError("INVALID_RESPONSE", "The server returned an unexpected response.", response.status);
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("delta" in payload) ||
        typeof payload.delta !== "string"
      ) {
        throw new ApiClientError("INVALID_RESPONSE", "The server returned an unexpected response.", response.status);
      }
      onDelta(payload.delta);
    };
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        for (const event of events) processEvent(event);
      }
      buffer += decoder.decode();
      if (buffer.trim()) processEvent(buffer);
      if (!completed) {
        throw new ApiClientError("INVALID_RESPONSE", "The server ended the reply stream before completion.", response.status);
      }
    } finally {
      reader.releaseLock();
    }
  },
  categorize(ticketId: number, token: string): Promise<TicketAiSuggestion> {
    return apiClient.post(`/tickets/${ticketId}/ai/categorize`, {}, token);
  },
};
