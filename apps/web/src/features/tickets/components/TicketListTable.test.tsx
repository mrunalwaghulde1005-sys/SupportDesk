import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Ticket } from "../api/tickets-api";
import { TicketListTable } from "./TicketListTable";

const ticket: Ticket = {
  id: 42,
  title: "Payment page is unavailable",
  description: "The payment page returns an error.",
  status: "IN_PROGRESS",
  priority: "P1",
  category: "Billing",
  assigneeId: null,
  slaDueAt: null,
  createdById: 7,
  createdAt: "2026-11-21T08:00:00.000Z",
  updatedAt: "2026-11-21T09:00:00.000Z",
};

describe("TicketListTable", () => {
  it("renders semantic columns, actual ticket fields, badges, and a role-specific detail link", () => {
    render(
      <MemoryRouter>
        <TicketListTable
          ariaLabel="Agent assigned tickets"
          dateLabel="Updated"
          dateValueForTicket={(item) => item.updatedAt}
          hrefForTicket={(item) => `/agent/tickets/${item.id}`}
          tickets={[ticket]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("region", { name: "Agent assigned tickets" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Updated" })).toBeInTheDocument();
    expect(screen.getByText("Payment page is unavailable")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("IN PROGRESS")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open ticket #42: Payment page is unavailable" })).toHaveAttribute(
      "href",
      "/agent/tickets/42",
    );
  });
});
