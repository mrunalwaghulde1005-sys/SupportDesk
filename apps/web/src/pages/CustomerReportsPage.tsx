import { useMemo, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import { useTickets } from "../features/tickets/hooks/use-tickets";
import { ContentState, DashboardHero, StatisticCard } from "../components/dashboard-ui";
import { BarChart, DonutChart, priorityChartColors, statusChartColors, type ChartSegment } from "../components/data-charts";

const statuses = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"] as const;
const priorities = ["P1", "P2", "P3", "P4"] as const;

export default function CustomerReportsPage(): ReactElement {
  const { session } = useAuthentication();
  const query = useTickets();
  const tickets = query.data ?? [];
  const statusSegments: ChartSegment[] = statuses.map((status) => ({
    label: status.replaceAll("_", " "),
    value: tickets.filter((ticket) => ticket.status === status).length,
    color: statusChartColors[status] ?? "#64748b",
  }));
  const prioritySegments: ChartSegment[] = priorities.map((priority) => ({
    label: priority,
    value: tickets.filter((ticket) => ticket.priority === priority).length,
    color: priorityChartColors[priority] ?? "#64748b",
  }));
  const openCount = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const inProgressCount = tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED").length;
  const charts = useMemo(() => ({ statusSegments, prioritySegments }), [tickets]);

  return <div className="space-y-8 sm:space-y-10">
    <DashboardHero eyebrow="Customer workspace" title="My ticket reports" description={`A clear view of your SupportDesk requests, ${session?.user.name ?? "customer"}.`} action={<Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-50" to="/app/tickets">View my tickets</Link>} />
    <section aria-label="Your ticket totals"><div className="mb-4"><h2 className="text-lg font-semibold tracking-tight text-slate-950">My ticket summary</h2><p className="mt-1 text-sm text-slate-500">Counts are calculated from your own ticket list</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatisticCard hint="All your support requests" label="Total tickets" value={query.isSuccess ? tickets.length : "—"} />
      <StatisticCard label="Open" value={query.isSuccess ? openCount : "—"} />
      <StatisticCard label="In progress" value={query.isSuccess ? inProgressCount : "—"} />
      <StatisticCard label="Resolved or closed" value={query.isSuccess ? resolvedCount : "—"} />
    </div></section>
    {query.isPending && <ContentState tone="loading">Loading your report…</ContentState>}
    {query.isError && <div className="rounded-2xl border border-rose-200 bg-white"><ContentState tone="error">{query.error.message}</ContentState><div className="-mt-7 pb-5 text-center"><button className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => void query.refetch()} type="button">Try again</button></div></div>}
    {query.isSuccess && tickets.length === 0 && <section className="rounded-2xl border border-slate-200 bg-white"><ContentState>You do not have tickets to report yet. <Link className="font-semibold text-indigo-700 hover:underline" to="/app/tickets/new">Create a ticket</Link> to get started.</ContentState></section>}
    {query.isSuccess && tickets.length > 0 && <section aria-label="Your ticket charts" className="grid gap-5 xl:grid-cols-2"><DonutChart segments={charts.statusSegments} title="My ticket status distribution" /><BarChart segments={charts.prioritySegments} title="My tickets by priority" /></section>}
  </div>;
}
