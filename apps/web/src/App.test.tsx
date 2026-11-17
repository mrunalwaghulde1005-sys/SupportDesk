import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./lib/api-client";
import App from "./App";
import { login } from "./features/auth/api/auth-api";
import { ticketApi } from "./features/tickets/api/tickets-api";

vi.mock("./features/auth/api/auth-api", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));
vi.mock("./features/tickets/api/tickets-api", () => ({
  ticketApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn() },
}));

const mockedLogin = vi.mocked(login);
const mockedCreateTicket = vi.mocked(ticketApi.create);

function createToken(expirationSeconds: number): string {
  const payload = btoa(JSON.stringify({ sub: "7", exp: expirationSeconds }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `header.${payload}.signature`;
}

function setStoredSession(expirationSeconds: number): void {
  sessionStorage.setItem(
    "supportdesk.auth",
    JSON.stringify({
      token: createToken(expirationSeconds),
      user: {
        id: 7,
        name: "Support Agent",
        email: "agent@example.com",
        role: "AGENT",
      },
    }),
  );
}

describe("SupportDesk frontend foundation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/login");
    vi.clearAllMocks();
  });

  it("renders the accessible login form", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Sign in to your account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
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

    expect(await screen.findByText("Welcome to SupportDesk")).toBeInTheDocument();
    expect(mockedLogin.mock.calls[0]?.[0]).toEqual({
      email: "agent@example.com",
      password: "correct-password",
    });
    const storedSession = sessionStorage.getItem("supportdesk.auth");
    expect(storedSession).toContain("agent@example.com");
    expect(storedSession).not.toContain("correct-password");
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

  it("redirects an unauthenticated visitor away from the protected page", async () => {
    window.history.replaceState(null, "", "/app");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Sign in to your account" }),
      ).toBeInTheDocument();
    });
  });

  it("allows a valid stored session through after refresh", () => {
    setStoredSession(Math.floor(Date.now() / 1000) + 3600);
    window.history.replaceState(null, "", "/app");
    render(<App />);

    expect(screen.getByText("Welcome to SupportDesk")).toBeInTheDocument();
    expect(screen.getByText("agent@example.com")).toBeInTheDocument();
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
      status: "OPEN",
      priority: "P3",
    });
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
});
