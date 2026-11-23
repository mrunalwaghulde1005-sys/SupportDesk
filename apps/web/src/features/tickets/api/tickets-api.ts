import { apiClient, ApiClientError } from "../../../lib/api-client";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "P1" | "P2" | "P3" | "P4";
export interface TicketListParams {
  page: number;
  limit: number;
  status?: TicketStatus;
  priority?: TicketPriority;
}
export interface TicketListPage {
  data: Ticket[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
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
export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: "CUSTOMER" | "AGENT";
  createdAt: string;
}
export interface TicketInput {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
}
export type TicketCreateInput = Omit<TicketInput, "status">;
export const ticketApi = {
  async listPage(token: string, params: TicketListParams): Promise<TicketListPage> {
    const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.status) search.set("status", params.status);
    if (params.priority) search.set("priority", params.priority);
    const response = await apiClient.getWithMeta<Ticket[]>(`/tickets?${search.toString()}`, token);
    const page = readMetaNumber(response.meta.page);
    const limit = readMetaNumber(response.meta.limit);
    const total = readMetaNumber(response.meta.total);
    const totalPages = readMetaNumber(response.meta.totalPages);
    if (page === null || limit === null || total === null || totalPages === null) {
      throw new ApiClientError("INVALID_RESPONSE", "The server returned invalid ticket pagination metadata.", null);
    }
    return { data: response.data, meta: { page, limit, total, totalPages } };
  },
  async list(token: string): Promise<Ticket[]> {
    const tickets: Ticket[] = [];
    let page = 1;
    while (true) {
      const batch = await apiClient.get<Ticket[]>(`/tickets?page=${page}&limit=100`, token);
      tickets.push(...batch);
      if (batch.length < 100) return tickets;
      page += 1;
    }
  },
  async listAll(
    token: string,
    filters: Pick<TicketListParams, "status" | "priority"> = {},
  ): Promise<Ticket[]> {
    const firstPage = await ticketApi.listPage(token, { page: 1, limit: 100, ...filters });
    if (firstPage.meta.totalPages <= 1) return firstPage.data;
    const tickets = [...firstPage.data];
    for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
      const result = await ticketApi.listPage(token, { page, limit: 100, ...filters });
      tickets.push(...result.data);
    }
    return tickets;
  },
  get(id: number, token: string): Promise<Ticket> { return apiClient.get(`/tickets/${id}`, token); },
  create(input: TicketCreateInput, token: string): Promise<Ticket> { return apiClient.post("/tickets", input, token); },
  update(id: number, input: Partial<TicketInput>, token: string): Promise<Ticket> {
    return apiClient.patch(`/tickets/${id}`, input, token);
  },
  updateAgentTicket(id: number, input: { status?: TicketStatus; priority?: TicketPriority }, token: string): Promise<Ticket> {
    return apiClient.patch(`/tickets/${id}`, input, token);
  },
  close(id: number, token: string): Promise<Ticket> { return apiClient.patch(`/tickets/${id}/close`, {}, token); },
  reopen(id: number, token: string): Promise<Ticket> { return apiClient.patch(`/tickets/${id}/reopen`, {}, token); },
  remove(id: number, token: string): Promise<Ticket> { return apiClient.delete(`/tickets/${id}`, token); },
};

function readMetaNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const adminApi = {
  async listTickets(token: string): Promise<Ticket[]> {
    const tickets: Ticket[] = [];
    let page = 1;
    while (true) {
      const batch = await apiClient.get<Ticket[]>(`/api/admin/tickets?page=${page}&limit=100`, token);
      tickets.push(...batch);
      if (batch.length < 100) return tickets;
      page += 1;
    }
  },
  listUsers(role: ManagedUser["role"], token: string): Promise<ManagedUser[]> {
    return apiClient.get(`/api/admin/users?role=${role}`, token);
  },
  assignTicket(id: number, assigneeId: number | null, token: string): Promise<Ticket> {
    return apiClient.patch(`/api/admin/tickets/${id}/assignment`, { assigneeId }, token);
  },
  updateTicketFields(
    id: number,
    fields: Partial<Pick<TicketInput, "status" | "priority">>,
    token: string,
  ): Promise<Ticket> {
    return apiClient.patch(`/api/admin/tickets/${id}`, fields, token);
  },
};
