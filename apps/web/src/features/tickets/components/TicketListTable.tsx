import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Ticket } from "../api/tickets-api";
import { PriorityBadge, StatusBadge } from "../../../components/dashboard-ui";
import { ResponsiveTable } from "../../../components/ui-components";
import { formatTicketDate } from "../../../lib/format-ticket-date";

interface Props {
  tickets: Ticket[];
  hrefForTicket: (ticket: Ticket) => string;
  dateLabel: "Created" | "Updated";
  dateValueForTicket: (ticket: Ticket) => string | null;
  ariaLabel: string;
}

export function TicketListTable({
  tickets,
  hrefForTicket,
  dateLabel,
  dateValueForTicket,
  ariaLabel,
}: Props): ReactElement {
  return (
    <ResponsiveTable ariaLabel={ariaLabel} className="min-w-[760px]">
      <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
        <tr>
          <th className="px-5 py-3" scope="col">Ticket</th>
          <th className="px-4 py-3" scope="col">Category</th>
          <th className="px-4 py-3" scope="col">Priority</th>
          <th className="px-4 py-3" scope="col">Status</th>
          <th className="px-4 py-3" scope="col">{dateLabel}</th>
          <th className="px-5 py-3 text-right" scope="col">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {tickets.map((ticket) => (
          <tr className="align-middle hover:bg-indigo-50/30" key={ticket.id}>
            <th className="px-5 py-4 text-left font-normal" scope="row">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Ticket #{ticket.id}
              </span>
              <span className="mt-1 block max-w-[18rem] truncate text-sm font-semibold text-slate-900">
                {ticket.title}
              </span>
            </th>
            <td className="px-4 py-4 text-sm text-slate-600">{ticket.category}</td>
            <td className="px-4 py-4"><PriorityBadge priority={ticket.priority} /></td>
            <td className="px-4 py-4"><StatusBadge status={ticket.status} /></td>
            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
              {formatTicketDate(dateValueForTicket(ticket))}
            </td>
            <td className="px-5 py-4 text-right">
              <Link
                aria-label={`Open ticket #${ticket.id}: ${ticket.title}`}
                className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
                to={hrefForTicket(ticket)}
              >
                Open
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </ResponsiveTable>
  );
}
