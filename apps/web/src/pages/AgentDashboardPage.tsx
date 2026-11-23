import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthentication } from "../features/auth/auth-context";
import { ticketApi, type TicketStatus } from "../features/tickets/api/tickets-api";
import { ContentState, DashboardHero, StatisticCard } from "../components/dashboard-ui";
import { BarChart, DonutChart, priorityChartColors, statusChartColors, type ChartSegment } from "../components/data-charts";
import TicketRow from "../features/tickets/components/TicketRow";
import { TicketListTable } from "../features/tickets/components/TicketListTable";
import { Button } from "../components/ui-components";

const ticketStatuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];

export default function AgentDashboardPage(): ReactElement {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const { session } = useAuthentication();
  const query = useQuery({
    queryKey: ["agent-tickets", session?.user.id],
    queryFn: () => ticketApi.list(session!.token),
    enabled: Boolean(session),
    refetchInterval: 15_000,
  });
  const tickets = query.data ?? [];
  const countByStatus = (status: string): number => tickets.filter((ticket) => ticket.status === status).length;
  const filteredTickets = statusFilter === "ALL" ? tickets : tickets.filter((ticket) => ticket.status === statusFilter);
  const recentTickets = [...filteredTickets].sort((left, right) =>
    (Date.parse(right.updatedAt ?? "") || 0) - (Date.parse(left.updatedAt ?? "") || 0),
  ).slice(0, 8);
  const statusSegments: ChartSegment[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"].map((status) => ({
    label: status.replaceAll("_", " "), value: countByStatus(status), color: statusChartColors[status] ?? "#64748b",
  }));
  const prioritySegments: ChartSegment[] = ["P1", "P2", "P3", "P4"].map((priority) => ({
    label: priority, value: tickets.filter((ticket) => ticket.priority === priority).length, color: priorityChartColors[priority] ?? "#64748b",
  }));

  return <div className="space-y-8 sm:space-y-10">
    <DashboardHero eyebrow="Agent workspace" title="Assigned tickets" description={`Welcome back, ${session?.user.name ?? "there"}. Review your support queue and keep each conversation moving.`} />
    <section aria-label="Assigned ticket analytics">
      <div className="mb-4"><h2 className="text-lg font-semibold tracking-tight text-slate-950">Your ticket analytics</h2><p className="mt-1 text-sm text-slate-500">A live summary of your assigned queue</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard label="Assigned tickets" value={query.isSuccess ? tickets.length : "—"} hint="Tickets assigned to you" />
        <StatisticCard label="Open" value={query.isSuccess ? countByStatus("OPEN") : "—"} />
        <StatisticCard label="In progress" value={query.isSuccess ? countByStatus("IN_PROGRESS") : "—"} />
        <StatisticCard label="Resolved or closed" value={query.isSuccess ? countByStatus("RESOLVED") + countByStatus("CLOSED") : "—"} />
      </div>
    </section>
    {query.isSuccess && tickets.length > 0 && <section aria-label="Assigned ticket charts" className="grid gap-5 xl:grid-cols-2"><DonutChart segments={statusSegments} title="Ticket status distribution" /><BarChart segments={prioritySegments} title="Tickets by priority" /></section>}
    <section aria-labelledby="agent-queue-heading" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_rgba(29,37,70,0.04)]" id="assigned-tickets">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6"><h2 className="text-base font-semibold tracking-tight text-slate-950" id="agent-queue-heading">My assigned tickets</h2><p className="mt-1 text-sm text-slate-500">Recent work assigned to your account</p></div>
      {query.isSuccess && tickets.length > 0 && (
        <nav aria-label="Filter assigned tickets by status" className="flex max-w-full gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:px-6">
          <Button aria-pressed={statusFilter === "ALL"} className="shrink-0 px-3 py-2 text-xs" onClick={() => setStatusFilter("ALL")} type="button" variant={statusFilter === "ALL" ? "primary" : "secondary"}>
            All ({tickets.length})
          </Button>
          {ticketStatuses.map((status) => (
            <Button aria-pressed={statusFilter === status} className="shrink-0 px-3 py-2 text-xs" key={status} onClick={() => setStatusFilter(status)} type="button" variant={statusFilter === status ? "primary" : "secondary"}>
              {status.replaceAll("_", " ")} ({countByStatus(status)})
            </Button>
          ))}
        </nav>
      )}
      {query.isPending && <ContentState tone="loading">Loading assigned tickets…</ContentState>}
      {query.isError && <ContentState tone="error">{query.error.message}</ContentState>}
      {query.isSuccess && tickets.length === 0 && <ContentState>No tickets are assigned to you yet.</ContentState>}
      {query.isSuccess && tickets.length > 0 && filteredTickets.length === 0 && <ContentState>No assigned tickets match this status.</ContentState>}
      {query.isSuccess && recentTickets.length > 0 && <>
        <div className="divide-y divide-slate-100 lg:hidden">
          {recentTickets.map((ticket) => <TicketRow ariaLabel={`View assigned ticket #${ticket.id}: ${ticket.title}`} dateLabel="Updated" key={ticket.id} ticket={ticket} to={`/agent/tickets/${ticket.id}`} />)}
        </div>
        <div className="hidden lg:block">
          <TicketListTable ariaLabel="Agent assigned tickets" dateLabel="Updated" dateValueForTicket={(ticket) => ticket.updatedAt} hrefForTicket={(ticket) => `/agent/tickets/${ticket.id}`} tickets={recentTickets} />
        </div>
      </>}
      {query.isSuccess && filteredTickets.length > recentTickets.length && <p className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-500">Showing your {recentTickets.length} most recently updated tickets.</p>}
    </section>
  </div>;
}
