import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import TicketRow from "../features/tickets/components/TicketRow";
import { useTickets } from "../features/tickets/hooks/use-tickets";

type MetricIconName = "tickets" | "create";

function MetricIcon({ name }: { name: MetricIconName }): ReactElement {
  const shapes: Record<MetricIconName, ReactElement> = {
    tickets: (
      <>
        <rect x="4" y="3.5" width="16" height="17" rx="3" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    create: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {shapes[name]}
    </svg>
  );
}

interface MetricCardProps {
  label: string;
  value: number | null;
  hint: string;
  icon: MetricIconName;
  accent: string;
  iconColor: string;
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  accent,
  iconColor,
}: MetricCardProps): ReactElement {
  const displayedValue = value === null ? "—" : value.toLocaleString();

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(29,37,70,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_12px_28px_rgba(29,37,70,0.08)] sm:p-6">
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p
            aria-label={`${label}: ${displayedValue}`}
            className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.1rem]"
          >
            {displayedValue}
          </p>
        </div>
        <span className={`flex size-11 items-center justify-center rounded-xl ${iconColor}`}>
          <MetricIcon name={icon} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{hint}</p>
    </article>
  );
}

export default function DashboardPage(): ReactElement {
  const { session } = useAuthentication();
  const query = useTickets();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const tickets = query.data ?? [];
  const recentTickets = [...tickets]
    .sort((left, right) => {
      const leftUpdatedAt = Date.parse(left.updatedAt ?? "") || 0;
      const rightUpdatedAt = Date.parse(right.updatedAt ?? "") || 0;
      return rightUpdatedAt - leftUpdatedAt;
    })
    .slice(0, 5);
  const categories = [...new Set(recentTickets.map((ticket) => ticket.category))].sort(
    (left, right) => left.localeCompare(right),
  );
  const visibleTickets =
    selectedCategory === "all"
      ? recentTickets
      : recentTickets.filter((ticket) => ticket.category === selectedCategory);
  const metrics = [
    {
      label: "Total Tickets",
      value: tickets.length,
      hint: "All support requests",
      icon: "tickets",
      accent: "bg-indigo-500",
      iconColor: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Open Tickets",
      value: tickets.filter((ticket) => ticket.status === "OPEN").length,
      hint: "Waiting for support",
      icon: "tickets",
      accent: "bg-sky-500",
      iconColor: "bg-sky-50 text-sky-700",
    },
    {
      label: "In Progress",
      value: tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length,
      hint: "Being handled by the team",
      icon: "tickets",
      accent: "bg-violet-500",
      iconColor: "bg-violet-50 text-violet-700",
    },
    {
      label: "Resolved",
      value: tickets.filter((ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED").length,
      hint: "Resolved or closed requests",
      icon: "tickets",
      accent: "bg-emerald-500",
      iconColor: "bg-emerald-50 text-emerald-700",
    },
  ] as const;

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-[#211b4b] px-5 py-7 text-white shadow-[0_20px_50px_rgba(38,28,91,0.16)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 size-80 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-16 size-56 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-40 size-40 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-200">
              Workspace overview
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back, {session?.user.name ?? "there"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/80 sm:text-base">
              Here’s the latest activity across your support requests. Keep every
              customer conversation moving forward.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-950 shadow-sm transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            to="/app/tickets/new"
          >
            <MetricIcon name="create" />
            Create ticket
            <svg aria-hidden="true" className="ml-1 size-4" fill="none" viewBox="0 0 20 20">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
            </svg>
          </Link>
        </div>
      </section>

      <section aria-labelledby="ticket-analytics-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950" id="ticket-analytics-heading">
              Ticket analytics
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A quick view of your current support queue
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {query.isSuccess ? "Updated from your ticket list" : "Live ticket summary"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              accent={metric.accent}
              hint={metric.hint}
              icon={metric.icon}
              iconColor={metric.iconColor}
              key={metric.label}
              label={metric.label}
              value={query.isSuccess ? metric.value : null}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="recent-tickets-heading"
        className="scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_rgba(29,37,70,0.04)]"
        id="recent-tickets"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-950" id="recent-tickets-heading">
              Recent tickets
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your latest support requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-lg px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              to="/app/tickets"
            >
              View all
            </Link>
            {query.isSuccess && tickets.length > 0 && (
              <div className="relative">
                <label className="sr-only" htmlFor="category-filter">
                  Filter tickets by category
                </label>
                <select
                  className="min-h-9 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition hover:border-indigo-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  id="category-filter"
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  value={selectedCategory}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                </svg>
              </div>
            )}
            <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
              {query.isSuccess
                ? `Showing ${visibleTickets.length} of ${recentTickets.length}`
                : "Ticket list"}
            </span>
          </div>
        </div>

        {query.isSuccess && visibleTickets.length > 0 && (
          <div className="hidden grid-cols-[minmax(10rem,2fr)_minmax(6rem,.9fr)_minmax(6rem,1fr)_minmax(3.75rem,.65fr)_minmax(7rem,1.1fr)] gap-4 bg-slate-50/70 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 lg:grid">
            <span>Ticket</span>
            <span>Status</span>
            <span>Category</span>
            <span>Priority</span>
            <span>Last updated</span>
          </div>
        )}

        {query.isPending && (
          <div className="px-5 py-14 text-center sm:py-16">
            <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <svg aria-hidden="true" className="size-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-80" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
              </svg>
            </span>
            <p className="mt-3 text-sm font-medium text-slate-600" role="status">
              Loading your tickets…
            </p>
          </div>
        )}

        {query.isError && (
          <div className="px-5 py-12 text-center sm:py-14">
            <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
              </svg>
            </span>
            <p className="mt-3 text-sm font-medium text-rose-700" role="alert">
              {query.error instanceof Error
                ? query.error.message
                : "Tickets could not be loaded."}
            </p>
            <button
              className="mt-4 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => void query.refetch()}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {query.isSuccess && tickets.length === 0 && (
          <div className="px-5 py-14 text-center sm:py-16">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <MetricIcon name="tickets" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No tickets yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
              Your support requests will appear here. Create a ticket to start a
              conversation with the team.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              to="/app/tickets/new"
            >
              Create your first ticket
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {query.isSuccess && tickets.length > 0 && visibleTickets.length === 0 && (
          <div className="px-5 py-12 text-center sm:py-14">
            <h3 className="text-sm font-semibold text-slate-900">
              No tickets in this category
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              Choose another category or view all tickets.
            </p>
            <button
              className="mt-4 rounded-lg px-3.5 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setSelectedCategory("all")}
              type="button"
            >
              Clear category filter
            </button>
          </div>
        )}

        {query.isSuccess && visibleTickets.length > 0 && (
          <div>
            {visibleTickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
