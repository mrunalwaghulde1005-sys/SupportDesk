import { apiClient } from "../../../lib/api-client";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "P1" | "P2" | "P3" | "P4";
export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  assigneeId: number | null;
  slaDueAt: string | null;
  createdById: number;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface TicketInput {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
}
export const ticketApi = {
  list(token: string): Promise<Ticket[]> { return apiClient.get("/tickets", token); },
  get(id: number, token: string): Promise<Ticket> { return apiClient.get(`/tickets/${id}`, token); },
  create(input: TicketInput, token: string): Promise<Ticket> { return apiClient.post("/tickets", input, token); },
  update(id: number, input: Partial<TicketInput>, token: string): Promise<Ticket> {
    return apiClient.patch(`/tickets/${id}`, input, token);
  },
  close(id: number, token: string): Promise<Ticket> { return apiClient.patch(`/tickets/${id}/close`, {}, token); },
  reopen(id: number, token: string): Promise<Ticket> { return apiClient.patch(`/tickets/${id}/reopen`, {}, token); },
  remove(id: number, token: string): Promise<Ticket> { return apiClient.delete(`/tickets/${id}`, token); },
};
