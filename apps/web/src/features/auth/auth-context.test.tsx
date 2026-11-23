import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { login } from "./api/auth-api";
import { AuthenticationProvider, useAuthentication } from "./auth-context";

vi.mock("./api/auth-api", () => ({ login: vi.fn(), register: vi.fn() }));

function LogoutControl() {
  const { logout } = useAuthentication();
  return <button onClick={logout}>Sign out</button>;
}

function LoginControl() {
  const { login } = useAuthentication();
  return <button onClick={() => login({ email: "next@example.com", password: "password" }, () => undefined)}>Switch account</button>;
}

describe("AuthenticationProvider cache cleanup", () => {
  afterEach(() => { sessionStorage.clear(); vi.mocked(login).mockReset(); });

  it("clears user-scoped query data when the user logs out", async () => {
    const expiration = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: "17", exp: expiration })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    sessionStorage.setItem("supportdesk.auth", JSON.stringify({
      token: `header.${payload}.signature`,
      user: { id: 17, name: "Customer", email: "customer@example.com", role: "CUSTOMER" },
    }));

    const client = new QueryClient();
    client.setQueryData(["tickets", 17, "CUSTOMER"], [{ id: 21 }]);
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}><AuthenticationProvider>{children}</AuthenticationProvider></QueryClientProvider>;
    render(<LogoutControl />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(client.getQueryCache().getAll()).toHaveLength(0));
    expect(sessionStorage.getItem("supportdesk.auth")).toBeNull();
    client.clear();
  });

  it("removes old-user queries when a different account becomes active", async () => {
    const expiration = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ sub: "17", exp: expiration })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    sessionStorage.setItem("supportdesk.auth", JSON.stringify({
      token: `header.${payload}.signature`,
      user: { id: 17, name: "Customer", email: "customer@example.com", role: "CUSTOMER" },
    }));
    vi.mocked(login).mockResolvedValue({
      token: "next-token",
      user: { id: 18, name: "Next Customer", email: "next@example.com", role: "CUSTOMER" },
    });

    const client = new QueryClient();
    client.setQueryData(["tickets", 17, "CUSTOMER"], [{ id: 21 }]);
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}><AuthenticationProvider>{children}</AuthenticationProvider></QueryClientProvider>;
    render(<LoginControl />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "Switch account" }));
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem("supportdesk.auth") ?? "{}").user.id).toBe(18));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    client.clear();
  });
});
