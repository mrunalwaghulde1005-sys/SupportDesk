import { apiClient } from "../../../lib/api-client";

export type CommentVisibility = "PUBLIC" | "INTERNAL";
export interface TicketComment {
  id: number;
  ticketId: number;
  authorId: number;
  body: string;
  visibility: CommentVisibility;
  createdAt: string;
  author: { id: number; name: string; role: "CUSTOMER" | "AGENT" | "ADMIN" };
}

export const commentApi = {
  list(ticketId: number, token: string): Promise<TicketComment[]> {
    return apiClient.get(`/tickets/${ticketId}/comments`, token);
  },
  create(ticketId: number, input: { body: string; visibility?: CommentVisibility }, token: string): Promise<TicketComment> {
    return apiClient.post(`/tickets/${ticketId}/comments`, input, token);
  },
};
