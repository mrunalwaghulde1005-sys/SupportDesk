import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { commentApi, type TicketComment } from "../features/tickets/api/comments-api";
import { adminApi, ticketApi, type Ticket } from "../features/tickets/api/tickets-api";
import CommentsPage from "./CommentsPage";

const mocks = vi.hoisted(() => ({ useAuthentication: vi.fn() }));

vi.mock("../features/auth/auth-context", () => ({
  useAuthentication: mocks.useAuthentication,
}));
vi.mock("../features/tickets/api/comments-api", () => ({
  commentApi: { list: vi.fn(), create: vi.fn() },
}));
vi.mock("../features/tickets/api/tickets-api", () => ({
  ticketApi: { list: vi.fn() },
  adminApi: { listTickets: vi.fn() },
}));

const mockCommentList = vi.mocked(commentApi.list);
const mockTicketList = vi.mocked(ticketApi.list);
const mockAdminTicketList = vi.mocked(adminApi.listTickets);

function makeTicket(id: number): Ticket {
  return {
    id,
    title: `Ticket ${id} title`,
    description: `Ticket ${id} description`,
    status: "OPEN",
    priority: "P2",
    category: "Account",
    assigneeId: 20,
    slaDueAt: null,
    createdById: 10,
    createdAt: "2026-11-21T08:00:00.000Z",
    updatedAt: "2026-11-21T09:00:00.000Z",
  };
}

function makeComment(
  id: number,
  ticketId: number,
  role: "CUSTOMER" | "AGENT" | "ADMIN",
  visibility: "PUBLIC" | "INTERNAL",
): TicketComment {
  return {
    id,
    ticketId,
    authorId: id,
    body: `${role} ${visibility} note ${id}`,
    visibility,
    createdAt: "2026-11-21T10:00:00.000Z",
    author: { id, name: `${role} Author`, role },
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CommentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CommentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthentication.mockReturnValue({
      session: {
        token: "test-token",
        user: { id: 10, name: "Test user", email: "test@example.com", role: "CUSTOMER" },
      },
    });
    mockTicketList.mockResolvedValue([]);
    mockAdminTicketList.mockResolvedValue([]);
    mockCommentList.mockResolvedValue([]);
  });

  it("shows only public Agent comments to Customers", async () => {
    mockTicketList.mockResolvedValue([makeTicket(7)]);
    mockCommentList.mockResolvedValue([
      makeComment(1, 7, "AGENT", "PUBLIC"),
      makeComment(2, 7, "AGENT", "INTERNAL"),
      makeComment(3, 7, "ADMIN", "PUBLIC"),
      makeComment(4, 7, "CUSTOMER", "PUBLIC"),
    ]);

    renderPage();

    expect(await screen.findByText("AGENT PUBLIC note 1")).toBeInTheDocument();
    expect(screen.queryByText("AGENT INTERNAL note 2")).not.toBeInTheDocument();
    expect(screen.queryByText("ADMIN PUBLIC note 3")).not.toBeInTheDocument();
    expect(screen.queryByText("CUSTOMER PUBLIC note 4")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ticket #7" })).toHaveAttribute(
      "href",
      "/app/tickets/7",
    );
  });

  it("shows all comment authors and visibilities for assigned Agent tickets", async () => {
    mocks.useAuthentication.mockReturnValue({
      session: {
        token: "agent-token",
        user: { id: 20, name: "Agent", email: "agent@example.com", role: "AGENT" },
      },
    });
    mockTicketList.mockResolvedValue([makeTicket(8)]);
    mockCommentList.mockResolvedValue([
      makeComment(5, 8, "ADMIN", "INTERNAL"),
      makeComment(6, 8, "AGENT", "PUBLIC"),
      makeComment(7, 8, "CUSTOMER", "PUBLIC"),
    ]);

    renderPage();

    expect(await screen.findByText("ADMIN INTERNAL note 5")).toBeInTheDocument();
    expect(screen.getByText("ADMIN Author · ADMIN")).toBeInTheDocument();
    expect(screen.getByText("INTERNAL")).toBeInTheDocument();
    expect(screen.getByText("AGENT PUBLIC note 6")).toBeInTheDocument();
    expect(screen.getByText("CUSTOMER PUBLIC note 7")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Ticket #8" })).toHaveLength(3);
    for (const link of screen.getAllByRole("link", { name: "Ticket #8" })) {
      expect(link).toHaveAttribute("href", "/agent/tickets/8");
    }
  });

  it("loads comments from all Admin tickets and links to Admin ticket details", async () => {
    mocks.useAuthentication.mockReturnValue({
      session: {
        token: "admin-token",
        user: { id: 30, name: "Admin", email: "admin@example.com", role: "ADMIN" },
      },
    });
    mockAdminTicketList.mockResolvedValue([makeTicket(9), makeTicket(10)]);
    mockCommentList.mockImplementation(async (ticketId) => [
      makeComment(ticketId, ticketId, "CUSTOMER", "PUBLIC"),
    ]);

    renderPage();

    expect(await screen.findByText("CUSTOMER PUBLIC note 9")).toBeInTheDocument();
    expect(screen.getByText("CUSTOMER PUBLIC note 10")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ticket #9" })).toHaveAttribute(
      "href",
      "/admin/tickets/9",
    );
    expect(screen.getByRole("link", { name: "Ticket #10" })).toHaveAttribute(
      "href",
      "/admin/tickets/10",
    );
    expect(mockAdminTicketList).toHaveBeenCalledWith("admin-token");
  });
});
