import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ticketAiApi, type TicketAiSuggestion } from "../api/ai-api";
import { ticketApi, type Ticket } from "../api/tickets-api";
import { TicketAiAssist } from "./TicketAiAssist";

vi.mock("../api/ai-api", () => ({
  ticketAiApi: { suggestReply: vi.fn(), categorize: vi.fn() },
}));
vi.mock("../api/tickets-api", () => ({
  ticketApi: { update: vi.fn(), updateAgentTicket: vi.fn() },
}));

const mockedAiApi = vi.mocked(ticketAiApi);
const mockedTicketApi = vi.mocked(ticketApi);
const updatedTicket: Ticket = {
  id: 7,
  title: "Test ticket",
  description: "Test description",
  status: "OPEN",
  priority: "P1",
  category: "Billing",
  assigneeId: 4,
  slaDueAt: null,
  createdById: 1,
  createdAt: null,
  updatedAt: null,
};

function renderAssist(isAdmin = false) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <QueryClientProvider client={client}>
      <TicketAiAssist ticketId={7} token="session-jwt" isAdmin={isAdmin} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return { ...view, onSaved, client };
}

describe("TicketAiAssist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading, streams into an editable review draft, and never sends it automatically", async () => {
    let finish: (() => void) | undefined;
    mockedAiApi.suggestReply.mockImplementation(async (_id, _token, onDelta) => {
      onDelta("A suggested ");
      return new Promise<void>((resolve) => { finish = resolve; });
    });
    renderAssist(true);

    fireEvent.click(screen.getByRole("button", { name: "Suggest reply" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Generating a reply draft…");
    const draft = await screen.findByLabelText(/review, edit, and manually send/i);
    await waitFor(() => expect(draft).toHaveValue("A suggested "));
    fireEvent.change(draft, { target: { value: "A reviewed reply." } });
    expect(draft).toHaveValue("A reviewed reply.");
    expect(mockedTicketApi.update).not.toHaveBeenCalled();
    expect(mockedTicketApi.updateAgentTicket).not.toHaveBeenCalled();
    finish?.();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("shows an accessible error when reply streaming fails", async () => {
    mockedAiApi.suggestReply.mockRejectedValue(new Error("AI is unavailable."));
    renderAssist();

    fireEvent.click(screen.getByRole("button", { name: "Suggest reply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI is unavailable.");
  });

  it("requires explicit review before applying the Admin category and priority suggestions", async () => {
    const suggestion: TicketAiSuggestion = { category: "Billing", priority: "P1" };
    mockedAiApi.categorize.mockResolvedValue(suggestion);
    mockedTicketApi.update.mockResolvedValue(updatedTicket);
    const { onSaved } = renderAssist(true);

    fireEvent.click(screen.getByRole("button", { name: "Auto-categorise + priority" }));
    expect(await screen.findByText("Billing")).toBeInTheDocument();
    expect(mockedTicketApi.update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Apply suggestions" }));
    await waitFor(() => expect(mockedTicketApi.update).toHaveBeenCalledWith(7, {
      category: "Billing",
      priority: "P1",
    }, "session-jwt"));
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("lets an Agent apply only the priority using the normal ticket update flow", async () => {
    mockedAiApi.categorize.mockResolvedValue({ category: "Account", priority: "P3" });
    mockedTicketApi.updateAgentTicket.mockResolvedValue(updatedTicket);

    renderAssist();

    fireEvent.click(screen.getByRole("button", { name: "Auto-categorise + priority" }));
    await screen.findByText(/Category changes require an administrator/);
    fireEvent.click(screen.getByRole("button", { name: "Apply priority" }));

    await waitFor(() => expect(mockedTicketApi.updateAgentTicket).toHaveBeenCalledWith(7, {
      priority: "P3",
    }, "session-jwt"));
    expect(mockedTicketApi.update).not.toHaveBeenCalled();
  });

  it("shows categorization errors without exposing an apply action", async () => {
    mockedAiApi.categorize.mockRejectedValue(new Error("AI returned an invalid suggestion."));
    renderAssist();

    fireEvent.click(screen.getByRole("button", { name: "Auto-categorise + priority" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI returned an invalid suggestion.");
    expect(screen.queryByRole("button", { name: "Apply suggestions" })).not.toBeInTheDocument();
  });
});
