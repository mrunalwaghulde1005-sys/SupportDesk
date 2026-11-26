import { useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import TicketRow from "../features/tickets/components/TicketRow";
import { TicketListTable } from "../features/tickets/components/TicketListTable";
import { useTicketPage } from "../features/tickets/hooks/use-ticket-page";
import type { TicketPriority, TicketStatus } from "../features/tickets/api/tickets-api";
import { Button } from "../components/ui-components";

const statuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];
const statusFilters: { value: TicketStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  ...statuses.map((value) => ({ value, label: value.replaceAll("_", " ") })),
];
const pageSize = 20;

export default function TicketsPage(): ReactElement {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loadCategoryOptions, setLoadCategoryOptions] = useState(false);
  const { pageQuery, categoryQuery } = useTicketPage(
    { page, limit: pageSize, ...(status ? { status } : {}), ...(priority ? { priority } : {}) },
    selectedCategory,
    loadCategoryOptions,
  );
  const categoryMode = selectedCategory !== "all";
  const allFilteredTickets = categoryQuery.data;
  const categoryMatches = allFilteredTickets?.filter((ticket) => ticket.category === selectedCategory);
  const categoryTotalPages = categoryMatches ? Math.ceil(categoryMatches.length / pageSize) : 0;
  const categoryPage = categoryMatches?.slice((page - 1) * pageSize, page * pageSize);
  const tickets = categoryMode ? categoryPage ?? [] : pageQuery.data?.data ?? [];
  const total = categoryMode ? categoryMatches?.length ?? 0 : pageQuery.data?.meta.total ?? 0;
  const totalPages = categoryMode ? categoryTotalPages : pageQuery.data?.meta.totalPages ?? 0;
  const isPending = categoryMode ? categoryQuery.isPending : pageQuery.isPending;
  const isError = categoryMode ? categoryQuery.isError : pageQuery.isError;
  const error = categoryMode ? categoryQuery.error : pageQuery.error;
  const isSuccess = categoryMode ? categoryQuery.isSuccess : pageQuery.isSuccess;
  const isPlaceholderData = !categoryMode && pageQuery.isPlaceholderData;
  const refetch = categoryMode ? categoryQuery.refetch : pageQuery.refetch;
  const categories = [...new Set((allFilteredTickets ?? pageQuery.data?.data ?? []).map((ticket) => ticket.category))].sort(
    (left, right) => left.localeCompare(right),
  );
  const hasFilters = Boolean(status || priority || categoryMode);

  return (
    <div className="space-y-7 sm:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
            Ticket management
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            All tickets
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Browse your complete support request history and open any ticket to
            review its details.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:self-auto"
          to="/app/tickets/new"
        >
          <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
          Create ticket
        </Link>
      </section>

      <nav aria-label="Filter tickets by status" className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {statusFilters.map((filter) => (
          <Button
            aria-pressed={status === filter.value}
            className="shrink-0 px-3 py-2 text-xs"
            key={filter.value || "all"}
            onClick={() => { setStatus(filter.value); setPage(1); }}
            type="button"
            variant={status === filter.value ? "primary" : "secondary"}
          >
            {filter.label}
          </Button>
        ))}
      </nav>

      <section
        aria-labelledby="ticket-directory-heading"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_16px_rgba(29,37,70,0.04)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              className="text-base font-semibold tracking-tight text-slate-950"
              id="ticket-directory-heading"
            >
              Ticket directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              All support requests available to your account
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="directory-priority-filter">Filter tickets by priority</label>
            <select className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-100" id="directory-priority-filter" value={priority} onChange={(event) => { setPriority(event.target.value as TicketPriority | ""); setPage(1); }}>
              <option value="">All priorities</option>{priorities.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            {(pageQuery.isSuccess || categoryQuery.isSuccess) && (tickets.length > 0 || (allFilteredTickets?.length ?? 0) > 0) && (
              <div className="relative">
                <label className="sr-only" htmlFor="directory-category-filter">
                  Filter tickets by category
                </label>
                <select
                  className="min-h-10 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition hover:border-indigo-200 focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100"
                  id="directory-category-filter"
                  onFocus={() => setLoadCategoryOptions(true)}
                  onBlur={() => { if (!categoryMode) setLoadCategoryOptions(false); }}
                  onChange={(event) => { setSelectedCategory(event.target.value); setPage(1); }}
                  value={selectedCategory}
                >
                  <option value="all">All categories</option>
                  {categoryQuery.isFetching && <option disabled>Loading categories…</option>}
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
              {isSuccess ? `${total} ${total === 1 ? "ticket" : "tickets"}` : "Ticket list"}
            </span>
            {(status || priority || selectedCategory !== "all") && <Button className="px-3 text-xs" variant="secondary" onClick={() => { setStatus(""); setPriority(""); setSelectedCategory("all"); setPage(1); }}>Clear filters</Button>}
          </div>
        </div>

        {isPending && (
          <p className="px-5 py-14 text-center text-sm font-medium text-slate-500" role="status">
            Loading tickets…
          </p>
        )}

        {isError && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-rose-700" role="alert">
              {error instanceof Error
                ? error.message
                : "Tickets could not be loaded."}
            </p>
            <button
              className="mt-4 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => void refetch()}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {isSuccess && total === 0 && !hasFilters && (
          <div className="px-5 py-14 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No tickets yet
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              Create a ticket and it will appear in this directory.
            </p>
            <Link
              className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900"
              to="/app/tickets/new"
            >
              Create your first ticket
            </Link>
          </div>
        )}

        {isSuccess && total === 0 && hasFilters && (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No tickets match these filters
            </h3>
            <button
              className="mt-3 rounded-lg px-3.5 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => { setStatus(""); setPriority(""); setSelectedCategory("all"); setPage(1); }}
              type="button"
            >
              Clear all filters
            </button>
          </div>
        )}

        {isSuccess && tickets.length > 0 && (
          <>
            <div className="lg:hidden">
              {tickets.map((ticket) => (
                <TicketRow dateLabel="Created" dateValue={ticket.createdAt} key={ticket.id} ticket={ticket} />
              ))}
            </div>
            <div className="hidden lg:block">
              <TicketListTable
                ariaLabel="Customer tickets"
                dateLabel="Created"
                dateValueForTicket={(ticket) => ticket.createdAt}
                hrefForTicket={(ticket) => `/app/tickets/${ticket.id}`}
                tickets={tickets}
              />
            </div>
          </>
        )}
        {isSuccess && totalPages > 1 && (
          <nav aria-label="Ticket list pages" className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" type="button" disabled={page <= 1 || isPlaceholderData} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40" type="button" disabled={page >= totalPages || isPlaceholderData} onClick={() => setPage((current) => current + 1)}>Next</button>
          </nav>
        )}
      </section>
    </div>
  );
}
