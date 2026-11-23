import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Ticket } from "../api/tickets-api";
import { formatTicketDate } from "../../../lib/format-ticket-date";
import { PriorityBadge, StatusBadge } from "../../../components/dashboard-ui";

interface TicketRowProps {
  ticket: Ticket;
  to?: string;
  ariaLabel?: string;
  dateLabel?: string;
  dateValue?: string | null;
}

export default function TicketRow({
  ticket,
  to = `/app/tickets/${ticket.id}`,
  ariaLabel = `View ticket #${ticket.id}: ${ticket.title}`,
  dateLabel = "Last updated",
  dateValue = ticket.updatedAt,
}: TicketRowProps): ReactElement {
  return (
    <Link
      aria-label={ariaLabel}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b border-slate-100 px-4 py-4 transition-colors last:border-b-0 hover:bg-indigo-50/40 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-indigo-500 sm:px-5 lg:grid-cols-[minmax(10rem,2fr)_minmax(6rem,.9fr)_minmax(6rem,1fr)_minmax(3.75rem,.65fr)_minmax(7rem,1.1fr)] lg:gap-4 lg:px-5 lg:py-4"
      to={to}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          Ticket #{ticket.id}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
          {ticket.title}
        </p>
      </div>

      <div className="col-start-2 row-start-1 justify-self-end lg:col-auto lg:row-auto lg:justify-self-start">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 lg:hidden">Status</p>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="col-start-1 row-start-2 min-w-0 lg:col-auto lg:row-auto">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 lg:hidden">
          Category
        </p>
        <p className="truncate text-xs font-medium text-slate-600">
          {ticket.category}
        </p>
      </div>

      <div className="col-start-2 row-start-2 justify-self-end lg:col-auto lg:row-auto lg:justify-self-start">
        <p className="mb-1 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-600 lg:hidden">
          Priority
        </p>
        <PriorityBadge priority={ticket.priority} />
      </div>

      <div className="col-span-2 row-start-3 lg:col-auto lg:row-auto">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 lg:hidden">
          {dateLabel}
        </p>
        <p className="text-xs text-slate-500">
          {formatTicketDate(dateValue)}
        </p>
      </div>
    </Link>
  );
}
