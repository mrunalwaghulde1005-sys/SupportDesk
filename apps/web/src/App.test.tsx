import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./lib/api-client";
import App from "./App";
import { login } from "./features/auth/api/auth-api";
import { ticketApi } from "./features/tickets/api/tickets-api";
import { adminApi } from "./features/tickets/api/tickets-api";

vi.mock("./features/auth/api/auth-api", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));
vi.mock("./features/tickets/api/tickets-api", () => ({
  ticketApi: { list: vi.fn().mockResolvedValue([]), listPage: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }), listAll: vi.fn().mockResolvedValue([]), get: vi.fn().mockResolvedValue({ id: 42, title: "Created ticket", description: "Details", category: "Account", status: "OPEN", priority: "P3", assigneeId: null, slaDueAt: null, createdById: 7, createdAt: null, updatedAt: null }), create: vi.fn(), update: vi.fn(), updateAgentTicket: vi.fn() },
  adminApi: { listTickets: vi.fn().mockResolvedValue([]), listUsers: vi.fn().mockResolvedValue([]), assignTicket: vi.fn(), updateTicketFields: vi.fn() },
}));

const mockedLogin = vi.mocked(login);
const mockedListTickets = vi.mocked(ticketApi.list);
const mockedTicketPage = vi.mocked(ticketApi.listPage);
const mockedListAllTickets = vi.mocked(ticketApi.listAll);
const mockedCreateTicket = vi.mocked(ticketApi.create);
const mockedAdminTickets = vi.mocked(adminApi.listTickets);
const mockedAdminUsers = vi.mocked(adminApi.listUsers);
const mockedAssignTicket = vi.mocked(adminApi.assignTicket);
const mockedUpdateAdminStatus = vi.mocked(adminApi.updateTicketFields);

function createToken(expirationSeconds: number): string {
  const payload = btoa(JSON.stringify({ sub: "7", exp: expirationSeconds }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `header.${payload}.signature`;
}

function setStoredSession(expirationSeconds: number, role = "CUSTOMER"): void {
  sessionStorage.setItem(
    "supportdesk.auth",
    JSON.stringify({
      token: createToken(expirationSeconds),
      user: {
        id: 7,
        name: "Support Agent",
        email: "agent@example.com",
        role,
      },
    }),
  );
}

describe("SupportDesk frontend foundation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/login");
    vi.clearAllMocks();
    mockedListTickets.mockResolvedValue([]);
    mockedTicketPage.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    mockedListAllTickets.mockResolvedValue([]);
    mockedAdminTickets.mockResolvedValue([]);
    mockedAdminUsers.mockResolvedValue([]);
  });

  it("renders the accessible login form", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Sign in to your account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
  });

  it("toggles password visibility without moving the Show button", async () => {
    const user = userEvent.setup();
    render(<App />);

    const password = screen.getByLabelText("Password");
    await user.type(password, "demo-password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("demo-password");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveValue("demo-password");
  });

  it("opens the login page when the site root is loaded", async () => {
    window.history.replaceState(null, "", "/");
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Sign in to your account",
      }),
    ).toBeInTheDocument();
  });

  it("redirects an authenticated visitor from the root to the app", () => {
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/");
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Welcome back, Support Agent" }),
    ).toBeInTheDocument();
  });

  it("calculates customer ticket totals and recent tickets without exposing status", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app");
    mockedListTickets.mockResolvedValue([
      {
        id: 58,
        title: "Cannot access billing history",
        description: "Billing history is missing.",
        category: "Billing",
        status: "OPEN",
        priority: "P1",
        assigneeId: null,
        slaDueAt: null,
        createdById: 7,
        createdAt: "2026-11-18T08:00:00.000Z",
        updatedAt: "2026-11-18T09:00:00.000Z",
      },
      {
        id: 59,
        title: "Update contact details",
        description: "Please update my details.",
        category: "Account",
        status: "OPEN",
        priority: "P2",
        assigneeId: null,
        slaDueAt: null,
        createdById: 7,
        createdAt: "2026-11-18T08:00:00.000Z",
        updatedAt: "2026-11-18T09:00:00.000Z",
      },
      {
        id: 60,
        title: "Invoice question",
        description: "I have a question about an invoice.",
        category: "Billing",
        status: "IN_PROGRESS",
        priority: "P3",
        assigneeId: null,
        slaDueAt: null,
        createdById: 7,
        createdAt: "2026-11-18T08:00:00.000Z",
        updatedAt: "2026-11-18T09:00:00.000Z",
      },
      {
        id: 61,
        title: "Password reset follow-up",
        description: "Following up on my password reset.",
        category: "Account",
        status: "RESOLVED",
        priority: "P4",
        assigneeId: null,
        slaDueAt: null,
        createdById: 7,
        createdAt: "2026-11-18T08:00:00.000Z",
        updatedAt: "2026-11-18T09:00:00.000Z",
      },
      {
        id: 62,
        title: "Waiting for a receipt",
        description: "Please send me a receipt.",
        category: "Billing",
        status: "WAITING_ON_CUSTOMER",
        priority: "P2",
        assigneeId: null,
        slaDueAt: null,
        createdById: 7,
        createdAt: "2026-11-18T08:00:00.000Z",
        updatedAt: "2026-11-18T09:00:00.000Z",
      },
      {
        id: 63,
        title: "Old access request",
        description: "An older request.",
        category: "Access",
        status: "CLOSED",
        priority: "P4",
        assigneeId: null,
        slaDueAt: null,
        createdById: 7,
        createdAt: "2026-11-18T08:00:00.000Z",
        updatedAt: "2026-11-18T09:00:00.000Z",
      },
    ]);
    render(<App />);

    expect(await screen.findByLabelText("Total Tickets: 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Open Tickets: 2")).toBeInTheDocument();
    expect(screen.getByLabelText("In Progress: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Resolved: 2")).toBeInTheDocument();
    expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", {
        name: "View ticket #58: Cannot access billing history",
      }),
    ).toHaveAttribute("href", "/app/tickets/58");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter tickets by category" }),
      "Account",
    );
    expect(
      screen.getByRole("link", { name: "View ticket #59: Update contact details" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "View ticket #58: Cannot access billing history" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Total Tickets: 6")).toBeInTheDocument();
  });

  it("opens a distinct full ticket directory from the Tickets navigation", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app");
    mockedTicketPage.mockResolvedValue({
      data: [
      {
        id: 70,
        title: "Review account access",
        description: "Please review account access.",
        category: "Account",
        status: "OPEN",
        priority: "P2",
        assigneeId: null,
        slaDueAt: null,
        createdById: 7,
        createdAt: "2026-11-18T08:00:00.000Z",
        updatedAt: "2026-11-18T09:00:00.000Z",
      },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    render(<App />);

    const [ticketsNavigation] = await screen.findAllByRole("link", {
      name: "Tickets",
    });
    if (!ticketsNavigation) {
      throw new Error("The Tickets navigation link is missing.");
    }
    await user.click(ticketsNavigation);

    expect(
      await screen.findByRole("heading", { name: "Ticket directory" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "View ticket #70: Review account access",
      }),
    ).toHaveAttribute("href", "/app/tickets/70");
    expect(
      screen.queryByRole("heading", { name: "Ticket analytics" }),
    ).not.toBeInTheDocument();
  });

  it("opens Customer Reports from the sidebar using only the customer's tickets", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600, "CUSTOMER");
    window.history.replaceState(null, "", "/app");
    mockedListTickets.mockResolvedValue([{
      id: 72, title: "My billing question", description: "Need help with an invoice.", category: "Billing", status: "IN_PROGRESS", priority: "P2", assigneeId: null, slaDueAt: null, createdById: 7, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z",
    }]);
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Reports" }));
    expect(await screen.findByRole("heading", { name: "My ticket reports" })).toBeInTheDocument();
    expect(screen.getByText("Total tickets")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "My ticket status distribution, 1 tickets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My tickets by priority" })).toBeInTheDocument();
  });

  it("shows required errors without sending an empty login", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("rejects an invalid email before sending a login", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("sends valid credentials and redirects after a successful login", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({
      token: createToken(Math.floor(Date.now() / 1000) + 3600),
      user: {
        id: 7,
        name: "Support Agent",
        email: "agent@example.com",
        role: "AGENT",
      },
    });
    render(<App />);

    await user.type(
      screen.getByLabelText("Email address"),
      " agent@example.com ",
    );
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Assigned tickets" }),
    ).toBeInTheDocument();
    expect(mockedLogin.mock.calls[0]?.[0]).toEqual({
      email: "agent@example.com",
      password: "correct-password",
    });
    const storedSession = sessionStorage.getItem("supportdesk.auth");
    expect(storedSession).toContain("agent@example.com");
    expect(storedSession).not.toContain("correct-password");
  });

  it.each([
    ["CUSTOMER", "Customer dashboard", "Welcome back, Support Agent"],
    ["ADMIN", "Admin dashboard", "Admin dashboard"],
  ] as const)("uses the authenticated %s role to open its dashboard", async (role, _label, heading) => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({
      token: createToken(Math.floor(Date.now() / 1000) + 3600),
      user: { id: 7, name: "Support Agent", email: "agent@example.com", role },
    });
    render(<App />);
    await user.type(screen.getByLabelText("Email address"), "agent@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
  });

  it.each([
    ["CUSTOMER", "/agent/dashboard", "Welcome back, Support Agent"],
    ["AGENT", "/admin/dashboard", "Assigned tickets"],
  ] as const)("redirects %s away from an unauthorized dashboard", async (role, path, expectedHeading) => {
    setStoredSession(Math.floor(Date.now() / 1000) + 3600, role);
    window.history.replaceState(null, "", path);
    render(<App />);
    expect(await screen.findByRole("heading", { name: expectedHeading })).toBeInTheDocument();
  });

  it("shows only the assigned ticket list on the agent dashboard", async () => {
    setStoredSession(Math.floor(Date.now() / 1000) + 3600, "AGENT");
    window.history.replaceState(null, "", "/agent/dashboard");
    mockedListTickets.mockResolvedValue([{
      id: 88, title: "Assigned request", description: "Help needed", category: "Account", status: "OPEN", priority: "P2", assigneeId: 7, slaDueAt: null, createdById: 2, createdAt: null, updatedAt: null,
    }]);
    render(<App />);
    expect(await screen.findByRole("link", { name: "View assigned ticket #88: Assigned request" })).toHaveAttribute("href", "/agent/tickets/88");
    expect(screen.getByRole("img", { name: "Ticket status distribution, 1 tickets" })).toBeInTheDocument();
  });

  it("shows admin ticket metrics and customer and agent management lists", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600, "ADMIN");
    window.history.replaceState(null, "", "/admin/dashboard");
    mockedAdminTickets.mockResolvedValue([{
      id: 91, title: "System request", description: "Details", category: "Technical", status: "IN_PROGRESS", priority: "P1", assigneeId: 8, slaDueAt: null, createdById: 1, createdAt: null, updatedAt: null,
    }]);
    mockedAdminUsers.mockImplementation(async (role) => role === "AGENT"
      ? [{ id: 8, name: "Assigned Agent", email: "agent@example.com", role: "AGENT", createdAt: "2026-11-20T00:00:00.000Z" }]
      : [{ id: 1, name: "Customer One", email: "customer@example.com", role: "CUSTOMER", createdAt: "2026-11-20T00:00:00.000Z" }]);
    render(<App />);
    expect(await screen.findByText(/System request/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All Tickets" }));
    await user.selectOptions(screen.getByLabelText("Assign ticket 91"), "");
    await user.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(mockedAssignTicket).toHaveBeenCalledWith(91, null, expect.any(String)));
    await user.selectOptions(screen.getByLabelText("Change status for ticket 91"), "RESOLVED");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mockedUpdateAdminStatus).toHaveBeenCalledWith(91, { status: "RESOLVED", priority: "P1" }, expect.any(String)));
    await user.click(screen.getByRole("button", { name: "Customers" }));
    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agents" }));
    expect(await screen.findAllByText("agent@example.com")).not.toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Reports" }));
    expect(await screen.findByRole("img", { name: "Ticket status distribution, 1 tickets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tickets created by month" })).toBeInTheDocument();
    expect(screen.getByText("Ticket creation dates are not available yet.")).toBeInTheDocument();
  });

  it("opens role-specific admin navigation from the shared application shell", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600, "ADMIN");
    window.history.replaceState(null, "", "/admin/dashboard");
    render(<App />);
    const customersNavigation = screen.getByRole("link", { name: "Customers" });
    await user.click(customersNavigation);
    expect(await screen.findByRole("heading", { name: "Customer management" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it.each([
    ["CUSTOMER", "/app", "Comments"],
    ["AGENT", "/agent/dashboard", "Comments"],
    ["ADMIN", "/admin/dashboard", "Comments"],
  ] as const)("opens the %s Comments view from the sidebar", async (role, path, label) => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600, role);
    window.history.replaceState(null, "", path);
    render(<App />);

    await user.click(screen.getByRole("link", { name: label }));

    expect(await screen.findByRole("heading", { name: "Comments" })).toBeInTheDocument();
    expect(await screen.findByText("No comments to show yet.")).toBeInTheDocument();
  });

  it("opens the responsive navigation with a keyboard-accessible control", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600, "AGENT");
    window.history.replaceState(null, "", "/agent/dashboard");
    render(<App />);
    const openNavigation = screen.getByRole("button", { name: "Open navigation" });
    await user.click(openNavigation);
    expect(screen.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: "Assigned tickets" }).length).toBeGreaterThan(0);
  });

  it("shows a safe invalid-credentials message", async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue(
      new ApiClientError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
        401,
      ),
    );
    render(<App />);

    await user.type(screen.getByLabelText("Email address"), "agent@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Email or password is incorrect."),
    ).toBeInTheDocument();
  });

  it("shows a safe network error when the backend cannot be reached", async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue(
      new ApiClientError(
        "NETWORK_ERROR",
        "Unable to reach SupportDesk.",
        null,
      ),
    );
    render(<App />);

    await user.type(screen.getByLabelText("Email address"), "agent@example.com");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText(
        "Unable to reach SupportDesk. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("disables the login form while a request is pending", async () => {
    const user = userEvent.setup();
    let resolveLogin: ((session: Awaited<ReturnType<typeof login>>) => void) | undefined;
    mockedLogin.mockImplementation(
      () => new Promise((resolve) => { resolveLogin = resolve; }),
    );
    render(<App />);

    await user.type(screen.getByLabelText("Email address"), "agent@example.com");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const submitButton = screen.getByRole("button", { name: "Signing in..." });
    expect(submitButton).toBeDisabled();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(mockedLogin).toHaveBeenCalledOnce();

    resolveLogin?.({
      token: createToken(Math.floor(Date.now() / 1000) + 3600),
      user: { id: 7, name: "Support Agent", email: "agent@example.com", role: "AGENT" },
    });
    expect(
      await screen.findByRole("heading", { name: "Assigned tickets" }),
    ).toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor away from the protected page", async () => {
    window.history.replaceState(null, "", "/app");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Sign in to your account" }),
      ).toBeInTheDocument();
    });
  });

  it("allows a valid stored session through after refresh", async () => {
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app");
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Welcome back, Support Agent" }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText("agent@example.com")).not.toHaveLength(0);
  });

  it("submits the selected category when creating a ticket", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app/tickets/new");
    mockedCreateTicket.mockResolvedValue({
      id: 42,
      title: "Cannot sign in",
      description: "The sign-in page returns an error.",
      category: "Billing",
      status: "OPEN",
      priority: "P3",
      assigneeId: null,
      slaDueAt: null,
      createdById: 7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    render(<App />);

    await user.type(screen.getByLabelText("Title"), "Cannot sign in");
    await user.selectOptions(screen.getByLabelText("Category"), "Billing");
    await user.type(
      screen.getByLabelText("Description"),
      "The sign-in page returns an error.",
    );
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await waitFor(() => expect(mockedCreateTicket).toHaveBeenCalled());
    expect(mockedCreateTicket.mock.calls[0]?.[0]).toMatchObject({
      title: "Cannot sign in",
      category: "Billing",
      priority: "P3",
    });
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(await screen.findByText(/Status:/)).toHaveTextContent("Status: OPEN");
  });

  it("pages through filtered ticket results and resets to page one when filters change", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app/tickets");
    mockedTicketPage
      .mockResolvedValueOnce({ data: [], meta: { page: 1, limit: 20, total: 25, totalPages: 2 } })
      .mockResolvedValueOnce({ data: [], meta: { page: 2, limit: 20, total: 25, totalPages: 2 } })
      .mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 3, totalPages: 1 } });
    render(<App />);

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(mockedTicketPage).toHaveBeenLastCalledWith(expect.any(String), { page: 2, limit: 20 }));
    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "OPEN" }));
    await waitFor(() => expect(mockedTicketPage).toHaveBeenLastCalledWith(expect.any(String), { page: 1, limit: 20, status: "OPEN" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter tickets by priority" }), "P1");
    await waitFor(() => expect(mockedTicketPage).toHaveBeenLastCalledWith(expect.any(String), { page: 1, limit: 20, status: "OPEN", priority: "P1" }));
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("button", { name: "All statuses" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: "Filter tickets by priority" })).toHaveValue("");
  });

  it("filters categories across all ticket pages using the existing paginated API", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app/tickets");
    mockedTicketPage.mockResolvedValue({
      data: [{ id: 1, title: "First page", description: "Details", category: "Account", status: "OPEN", priority: "P2", assigneeId: null, slaDueAt: null, createdById: 7, createdAt: null, updatedAt: null }],
      meta: { page: 1, limit: 20, total: 21, totalPages: 2 },
    });
    mockedListAllTickets.mockResolvedValue([
      { id: 1, title: "First page", description: "Details", category: "Account", status: "OPEN", priority: "P2", assigneeId: null, slaDueAt: null, createdById: 7, createdAt: null, updatedAt: null },
      { id: 21, title: "Later page billing", description: "Details", category: "Billing", status: "OPEN", priority: "P1", assigneeId: null, slaDueAt: null, createdById: 7, createdAt: null, updatedAt: null },
    ]);
    render(<App />);

    expect(await screen.findByRole("link", { name: "View ticket #1: First page" })).toBeInTheDocument();
    const categoryFilter = screen.getByRole("combobox", { name: "Filter tickets by category" });
    await user.click(categoryFilter);
    await waitFor(() => expect(mockedListAllTickets).toHaveBeenCalledWith(expect.any(String), {}));
    expect(await screen.findByRole("option", { name: "Billing" })).toBeInTheDocument();
    await user.selectOptions(categoryFilter, "Billing");

    expect(await screen.findByRole("link", { name: "View ticket #21: Later page billing" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View ticket #1: First page" })).not.toBeInTheDocument();
  });

  it("uses the shared create-ticket schema to reject blank input", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app/tickets/new");
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Create ticket" }));
    expect(await screen.findAllByText("Too small: expected string to have >=1 characters")).toHaveLength(3);
    expect(mockedCreateTicket).not.toHaveBeenCalled();
  });

  it("shows the current ticket status to customers as read-only", async () => {
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app/tickets/42");
    vi.mocked(ticketApi.get).mockResolvedValue({
      id: 42, title: "Created ticket", description: "Details", category: "Account", status: "RESOLVED", priority: "P3", assigneeId: null, slaDueAt: null, createdById: 7, createdAt: null, updatedAt: null,
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Created ticket" })).toBeInTheDocument();
    expect(screen.getByText(/Status:/)).toHaveTextContent("Status: RESOLVED");
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close ticket" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
  });

  it("clears an expired stored token and requires login", () => {
    setStoredSession(Math.floor(Date.now() / 1000) - 1);
    window.history.replaceState(null, "", "/app");
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Sign in to your account" }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("supportdesk.auth")).toBeNull();
  });

  it("signs out by clearing the stored session and returning to login", async () => {
    const user = userEvent.setup();
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app");
    render(<App />);

    const [signOutButton] = screen.getAllByRole("button", { name: "Sign out" });
    if (!signOutButton) {
      throw new Error("The sign-out action is missing.");
    }
    await user.click(signOutButton);

    expect(await screen.findByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument();
    expect(sessionStorage.getItem("supportdesk.auth")).toBeNull();
  });
});
