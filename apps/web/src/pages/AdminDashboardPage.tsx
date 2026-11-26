import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import { adminApi, type ManagedUser, type Ticket, type TicketPriority, type TicketStatus } from "../features/tickets/api/tickets-api";
import { ContentState, DashboardHero, PriorityBadge, StatisticCard, StatusBadge } from "../components/dashboard-ui";
import { Button, ResponsiveTable } from "../components/ui-components";
import { BarChart, DonutChart, LineChart, priorityChartColors, statusChartColors, type ChartSegment } from "../components/data-charts";

type AdminTab = "dashboard" | "tickets" | "customers" | "agents" | "reports";
const ticketStatuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
const ticketPriorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];
function AdminTicketRow({ ticket, agents, customer, agent, token }: {
  ticket: Ticket;
  agents: ManagedUser[];
  customer?: ManagedUser;
  agent?: ManagedUser;
  token: string;
}): ReactElement {
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId?.toString() ?? "");
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  useEffect(() => {
    setAssigneeId(ticket.assigneeId?.toString() ?? "");
    setStatus(ticket.status);
    setPriority(ticket.priority);
  }, [ticket.assigneeId, ticket.priority, ticket.status]);
  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateTicketFields(ticket.id, { status, priority }, token),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-tickets"] }),
  });
  const assignmentMutation = useMutation({
    mutationFn: () => adminApi.assignTicket(ticket.id, assigneeId ? Number(assigneeId) : null, token),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-tickets"] }),
  });
  const inputClass = "min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  return <>
    <tr className="border-t border-slate-100 align-top">
      <td className="px-4 py-4"><button className="text-left text-sm font-semibold text-indigo-700 hover:text-indigo-900" onClick={() => setExpanded((open) => !open)} type="button">#{ticket.id} · {ticket.title}</button><p className="mt-1 text-xs text-slate-500">{ticket.category}</p></td>
      <td className="px-4 py-4"><form className="flex min-w-[15rem] flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); updateMutation.mutate(); }}>
        <label className="sr-only" htmlFor={`status-${ticket.id}`}>Change status for ticket {ticket.id}</label><select className={inputClass} id={`status-${ticket.id}`} onChange={(event) => setStatus(event.target.value as TicketStatus)} value={status}>{ticketStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
        <label className="sr-only" htmlFor={`priority-${ticket.id}`}>Change priority for ticket {ticket.id}</label><select className={inputClass} id={`priority-${ticket.id}`} onChange={(event) => setPriority(event.target.value as TicketPriority)} value={priority}>{ticketPriorities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <button className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-50" disabled={updateMutation.isPending || (status === ticket.status && priority === ticket.priority)}>{updateMutation.isPending ? "Saving…" : "Save"}</button>
      </form>{updateMutation.isError && <p className="mt-2 text-xs text-rose-700" role="alert">{updateMutation.error.message}</p>}</td>
      <td className="px-4 py-4"><form className="flex min-w-52 gap-2" onSubmit={(event) => { event.preventDefault(); assignmentMutation.mutate(); }}><label className="sr-only" htmlFor={`assign-${ticket.id}`}>Assign ticket {ticket.id}</label><select className={`${inputClass} flex-1`} id={`assign-${ticket.id}`} onChange={(event) => setAssigneeId(event.target.value)} value={assigneeId}><option value="">Unassigned</option>{agents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={assignmentMutation.isPending || assigneeId === (ticket.assigneeId?.toString() ?? "")}>{assignmentMutation.isPending ? "Saving…" : "Assign"}</button></form>{assignmentMutation.isError && <p className="mt-2 text-xs text-rose-700" role="alert">{assignmentMutation.error.message}</p>}</td>
      <td className="px-4 py-4"><StatusBadge status={ticket.status} /></td>
      <td className="px-4 py-4"><Link className="inline-flex min-h-10 items-center rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700" aria-label={`Comment on ticket #${ticket.id}`} to={`/admin/tickets/${ticket.id}`}>Comment</Link></td>
    </tr>
    {expanded && <tr className="bg-slate-50/70"><td className="px-5 py-4" colSpan={5}><div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p><p className="mt-1 text-slate-700">{ticket.description}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p><p className="mt-1 text-slate-700">{customer?.name ?? `Customer #${ticket.createdById}`}</p><p className="text-xs text-slate-500">{customer?.email ?? "Details unavailable"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned agent</p><p className="mt-1 text-slate-700">{agent?.name ?? "Unassigned"}</p><p className="text-xs text-slate-500">{agent?.email ?? ""}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Priority · created</p><p className="mt-1"><PriorityBadge priority={ticket.priority} /></p><p className="mt-1 text-xs text-slate-500">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Date unavailable"}</p></div></div></td></tr>}
  </>;
}

function UserList({ users, label, workload }: { users: ManagedUser[]; label: string; workload?: (userId: number) => number }): ReactElement {
  if (users.length === 0) return <section className="rounded-2xl border border-slate-200 bg-white"><h2 className="border-b border-slate-100 px-5 py-4 font-semibold">{label}</h2><ContentState>No {label.toLowerCase()} found.</ContentState></section>;
  return <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_rgba(29,37,70,0.04)]"><h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">{label}</h2><ResponsiveTable className="min-w-[560px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-400"><tr><th scope="col" className="px-5 py-3">Name</th><th scope="col" className="px-5 py-3">Email</th><th scope="col" className="px-5 py-3">Role</th>{workload && <th scope="col" className="px-5 py-3">Assigned tickets</th>}<th scope="col" className="px-5 py-3">Member since</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}><td className="px-5 py-4 font-semibold text-slate-800">{user.name}</td><td className="px-5 py-4 text-slate-600">{user.email}</td><td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{user.role}</span></td>{workload && <td className="px-5 py-4 text-slate-600">{workload(user.id)}</td>}<td className="px-5 py-4 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td></tr>)}</tbody></ResponsiveTable></section>;
}

export default function AdminDashboardPage(): ReactElement {
  const { session } = useAuthentication();
  const location = useLocation();
  const navigate = useNavigate();
  const token = session!.token;
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get("tab");
    if (requestedTab === "tickets" || requestedTab === "customers" || requestedTab === "agents" || requestedTab === "reports" || requestedTab === "dashboard") setTab(requestedTab);
  }, [location.search]);
  const ticketsQuery = useQuery({ queryKey: ["admin-tickets"], queryFn: () => adminApi.listTickets(token), refetchInterval: 15_000 });
  const customersQuery = useQuery({ queryKey: ["admin-users", "CUSTOMER"], queryFn: () => adminApi.listUsers("CUSTOMER", token) });
  const agentsQuery = useQuery({ queryKey: ["admin-users", "AGENT"], queryFn: () => adminApi.listUsers("AGENT", token) });
  const tickets = ticketsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const customerById = new Map(customers.map((user) => [user.id, user]));
  const agentById = new Map(agents.map((user) => [user.id, user]));
  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const matchesSearch = `${ticket.id} ${ticket.title} ${ticket.category}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (statusFilter === "ALL" || ticket.status === statusFilter) && (priorityFilter === "ALL" || ticket.priority === priorityFilter);
  }), [priorityFilter, search, statusFilter, tickets]);
  const setActiveTab = (nextTab: AdminTab, query: string): void => {
    setTab(nextTab);
    navigate(query ? `/admin/dashboard?tab=${query}` : "/admin/dashboard", { replace: true });
  };
  const countStatus = (status: TicketStatus): number => tickets.filter((ticket) => ticket.status === status).length;
  const activeCount = (agentId: number): number => tickets.filter((ticket) => ticket.assigneeId === agentId && !["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const recentTickets = [...tickets].sort((left, right) => (Date.parse(right.createdAt ?? "") || right.id) - (Date.parse(left.createdAt ?? "") || left.id)).slice(0, 6);
  const statusSegments: ChartSegment[] = ticketStatuses.map((status) => ({ label: status.replaceAll("_", " "), value: countStatus(status), color: statusChartColors[status] ?? "#64748b" }));
  const prioritySegments: ChartSegment[] = ticketPriorities.map((priority) => ({ label: priority, value: tickets.filter((ticket) => ticket.priority === priority).length, color: priorityChartColors[priority] ?? "#64748b" }));
  const workloadSegments: ChartSegment[] = agents.map((agent, index) => ({ label: agent.name, value: tickets.filter((ticket) => ticket.assigneeId === agent.id).length, color: ["#4f46e5", "#0284c7", "#059669", "#d97706", "#7c3aed"][index % 5] ?? "#64748b" }));
  const createdByMonth = new Map<string, number>();
  for (const ticket of tickets) {
    if (ticket.createdAt === null) continue;
    const timestamp = Date.parse(ticket.createdAt);
    if (!Number.isFinite(timestamp)) continue;
    const monthDate = new Date(timestamp);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    createdByMonth.set(monthKey, (createdByMonth.get(monthKey) ?? 0) + 1);
  }
  const monthlyPoints = [...createdByMonth].sort(([left], [right]) => left.localeCompare(right)).map(([month, value]) => {
    const [yearText, monthText] = month.split("-");
    const monthDate = new Date(Number(yearText), Number(monthText) - 1);
    return { label: monthDate.toLocaleDateString(undefined, { month: "short", year: "2-digit" }), value };
  });
  const adminTabs: { id: AdminTab; label: string }[] = [{ id: "dashboard", label: "Overview" }, { id: "tickets", label: "All Tickets" }, { id: "customers", label: "Customers" }, { id: "agents", label: "Agents" }, { id: "reports", label: "Reports" }];
  const queryError = ticketsQuery.error ?? customersQuery.error ?? agentsQuery.error;

  return <div className="space-y-8 sm:space-y-10">
    <DashboardHero eyebrow="Administration workspace" title="Admin dashboard" description="Monitor support activity, manage ticket assignments, and review customer and agent accounts." />
    <nav aria-label="Admin dashboard sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_3px_16px_rgba(29,37,70,0.04)]">
      {adminTabs.map((item) => <button aria-current={tab === item.id ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === item.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`} key={item.id} onClick={() => setActiveTab(item.id, item.id === "dashboard" ? "" : item.id)} type="button">{item.label}</button>)}
    </nav>
    {queryError && <ContentState tone="error">{queryError.message}</ContentState>}
    {tab === "dashboard" && <div className="space-y-8">
      <section><div className="mb-4"><h2 className="text-lg font-semibold tracking-tight text-slate-950">System analytics</h2><p className="mt-1 text-sm text-slate-500">Current ticket and account totals from SupportDesk</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard label="Total tickets" value={ticketsQuery.isSuccess ? tickets.length : "—"} />
        <StatisticCard label="Open" value={ticketsQuery.isSuccess ? countStatus("OPEN") : "—"} />
        <StatisticCard label="In progress" value={ticketsQuery.isSuccess ? countStatus("IN_PROGRESS") : "—"} />
        <StatisticCard label="Resolved" value={ticketsQuery.isSuccess ? countStatus("RESOLVED") : "—"} />
        <StatisticCard label="Closed" value={ticketsQuery.isSuccess ? countStatus("CLOSED") : "—"} />
        <StatisticCard label="Customers" value={customersQuery.isSuccess ? customers.length : "—"} />
        <StatisticCard label="Agents" value={agentsQuery.isSuccess ? agents.length : "—"} />
      </div></section>
      <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_16px_rgba(29,37,70,0.04)]"><h2 className="font-semibold text-slate-900">Ticket status overview</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{ticketStatuses.map((status) => <div className="rounded-xl bg-slate-50 p-4" key={status}><p className="text-xs text-slate-500">{status.replaceAll("_", " ")}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{ticketsQuery.isSuccess ? countStatus(status) : "—"}</p></div>)}</div></section>
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_rgba(29,37,70,0.04)]"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Recent tickets</h2><p className="mt-1 text-sm text-slate-500">Latest support requests in the system</p></div>{ticketsQuery.isPending ? <ContentState tone="loading">Loading tickets…</ContentState> : recentTickets.length === 0 ? <ContentState>No tickets have been created.</ContentState> : <ul className="divide-y divide-slate-100">{recentTickets.map((ticket) => <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" key={ticket.id}><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">#{ticket.id} · {ticket.title}</span><span className="text-xs text-slate-500">{customerById.get(ticket.createdById)?.name ?? `Customer #${ticket.createdById}`}</span></span><StatusBadge status={ticket.status} /></li>)}</ul>}</section></div>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_16px_rgba(29,37,70,0.04)]"><h2 className="font-semibold text-slate-900">Agent workload</h2>{agentsQuery.isPending || ticketsQuery.isPending ? <p className="mt-3 text-sm text-slate-500">Loading workload…</p> : agents.length === 0 ? <p className="mt-3 text-sm text-slate-500">No agents are registered.</p> : <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{agents.map((agent) => <li className="rounded-xl bg-slate-50 p-4" key={agent.id}><p className="font-semibold text-slate-800">{agent.name}</p><p className="mt-1 text-xs text-slate-500">{tickets.filter((ticket) => ticket.assigneeId === agent.id).length} assigned · {activeCount(agent.id)} active</p></li>)}</ul>}</section>
    </div>}
    {tab === "tickets" && (
      <section aria-label="All support tickets" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_rgba(29,37,70,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-semibold text-slate-900">All tickets</h2>
            <p className="mt-1 text-sm text-slate-500">Review, update and assign support requests</p>
          </div>
          <span className="text-xs font-semibold text-slate-600">{filteredTickets.length} of {tickets.length}</span>
        </div>
        <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
          <nav aria-label="Filter all tickets by status" className="flex max-w-full gap-2 overflow-x-auto pb-1">
            <Button aria-pressed={statusFilter === "ALL"} className="shrink-0 px-3 py-2 text-xs" onClick={() => setStatusFilter("ALL")} type="button" variant={statusFilter === "ALL" ? "primary" : "secondary"}>
              All ({tickets.length})
            </Button>
            {ticketStatuses.map((status) => (
              <Button aria-pressed={statusFilter === status} className="shrink-0 px-3 py-2 text-xs" key={status} onClick={() => setStatusFilter(status)} type="button" variant={statusFilter === status ? "primary" : "secondary"}>
                {status.replaceAll("_", " ")} ({countStatus(status)})
              </Button>
            ))}
          </nav>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <label>
              <span className="sr-only">Search tickets</span>
              <input className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100" onChange={(event) => setSearch(event.target.value)} placeholder="Search ticket, title, category" value={search} />
            </label>
            <label>
              <span className="sr-only">Filter by priority</span>
              <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100" onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}>
                <option value="ALL">All priorities</option>
                {ticketPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
          </div>
        </div>
        {ticketsQuery.isPending && <ContentState tone="loading">Loading tickets…</ContentState>}
        {ticketsQuery.isSuccess && tickets.length === 0 && <ContentState>No tickets have been created.</ContentState>}
        {ticketsQuery.isSuccess && tickets.length > 0 && filteredTickets.length === 0 && <ContentState>No tickets match these filters.</ContentState>}
        {ticketsQuery.isSuccess && filteredTickets.length > 0 && (
          <ResponsiveTable ariaLabel="Admin ticket management" className="min-w-[1080px]">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-600">
              <tr>
                <th className="px-4 py-3" scope="col">Ticket</th>
                <th className="px-4 py-3" scope="col">Status &amp; priority</th>
                <th className="px-4 py-3" scope="col">Assigned agent</th>
                <th className="px-4 py-3" scope="col">Current status</th>
                <th className="px-4 py-3" scope="col">Action</th>
              </tr>
            </thead>
            <tbody>{filteredTickets.map((ticket) => <AdminTicketRow agent={ticket.assigneeId ? agentById.get(ticket.assigneeId) : undefined} agents={agents} customer={customerById.get(ticket.createdById)} key={ticket.id} ticket={ticket} token={token} />)}</tbody>
          </ResponsiveTable>
        )}
      </section>
    )}
    {tab === "customers" && <section><div className="mb-4"><h2 className="text-lg font-semibold text-slate-950">Customer management</h2><p className="mt-1 text-sm text-slate-500">Customer account information available to administrators.</p></div>{customersQuery.isPending ? <ContentState tone="loading">Loading customers…</ContentState> : <UserList label="Customers" users={customers} />}</section>}
    {tab === "agents" && <section><div className="mb-4"><h2 className="text-lg font-semibold text-slate-950">Agent management</h2><p className="mt-1 text-sm text-slate-500">Agent directory and assigned ticket workload.</p></div>{agentsQuery.isPending ? <ContentState tone="loading">Loading agents…</ContentState> : <UserList label="Agents" users={agents} workload={(agentId) => tickets.filter((ticket) => ticket.assigneeId === agentId).length} />}</section>}
    {tab === "reports" && <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_16px_rgba(29,37,70,0.04)]"><h2 className="font-semibold text-slate-900">Tickets by priority</h2><ul className="mt-4 space-y-3">{ticketPriorities.map((priority) => <li className="flex items-center justify-between text-sm" key={priority}><PriorityBadge priority={priority} /><span className="font-semibold text-slate-700">{ticketsQuery.isSuccess ? tickets.filter((ticket) => ticket.priority === priority).length : "—"}</span></li>)}</ul></article><article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_16px_rgba(29,37,70,0.04)]"><h2 className="font-semibold text-slate-900">Workload by agent</h2>{agents.length === 0 ? <p className="mt-4 text-sm text-slate-500">No agent workload to report.</p> : <ul className="mt-4 space-y-3">{agents.map((agent) => <li className="flex items-center justify-between gap-4 text-sm" key={agent.id}><span className="truncate text-slate-700">{agent.name}</span><span className="shrink-0 font-semibold text-slate-900">{ticketsQuery.isSuccess ? `${tickets.filter((ticket) => ticket.assigneeId === agent.id).length} assigned · ${activeCount(agent.id)} active` : "—"}</span></li>)}</ul>}</article><article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_16px_rgba(29,37,70,0.04)] lg:col-span-2"><h2 className="font-semibold text-slate-900">Status distribution</h2><div className="mt-4 flex flex-wrap gap-3">{ticketStatuses.map((status) => <div className="flex min-w-40 items-center justify-between gap-4 rounded-xl bg-slate-50 p-3" key={status}><StatusBadge status={status} /><span className="font-semibold">{ticketsQuery.isSuccess ? countStatus(status) : "—"}</span></div>)}</div></article></section>}
    {tab === "reports" && (ticketsQuery.isPending || agentsQuery.isPending) ? <ContentState tone="loading">Loading report data…</ContentState> : tab === "reports" && <section aria-label="Support reports charts" className="grid gap-5 lg:grid-cols-2"><DonutChart segments={statusSegments} title="Ticket status distribution" /><BarChart segments={prioritySegments} title="Ticket priority distribution" /><BarChart segments={workloadSegments} title="Ticket workload by agent" /><LineChart points={monthlyPoints} title="Tickets created by month" /></section>}
  </div>;
}
