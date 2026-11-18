import type { ReactElement } from "react";

export default function TicketWorkspacePlaceholder(): ReactElement {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-slate-900">
        Your ticket workspace is ready
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Ticket views will appear here when the ticket screens are added.
      </p>
    </section>
  );
}
