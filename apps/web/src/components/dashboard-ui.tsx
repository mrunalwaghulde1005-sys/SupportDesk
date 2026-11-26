import type { ReactElement, ReactNode } from "react";
import type { TicketPriority, TicketStatus } from "../features/tickets/api/tickets-api";

const statusColors: Record<TicketStatus, string> = {
  OPEN: "bg-indigo-50 text-indigo-700",
  IN_PROGRESS: "bg-sky-50 text-sky-700",
  WAITING_ON_CUSTOMER: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-600",
};

const priorityColors: Record<TicketPriority, string> = {
  P1: "bg-rose-50 text-rose-700 ring-rose-600/10",
  P2: "bg-orange-50 text-orange-700 ring-orange-600/10",
  P3: "bg-violet-50 text-violet-700 ring-violet-600/10",
  P4: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

export function DashboardHero({ eyebrow, title, description, action }: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}): ReactElement {
  return <section className="relative overflow-hidden rounded-3xl bg-[#211b4b] px-5 py-7 text-white shadow-[0_20px_50px_rgba(38,28,91,0.16)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
    <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 size-80 rounded-full border border-white/10" />
    <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-200">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/80 sm:text-base">{description}</p>
    </div>{action}</div>
  </section>;
}

export function StatisticCard({ label, value, hint }: { label: string; value: number | string; hint?: string }): ReactElement {
  return <article className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(29,37,70,0.035)] sm:p-6">
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-indigo-500" />
    <p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
  </article>;
}

export function StatusBadge({ status }: { status: TicketStatus }): ReactElement {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[status]}`}>{status.replaceAll("_", " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }): ReactElement {
  return <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ring-1 ring-inset ${priorityColors[priority]}`}>{priority}</span>;
}

export function ContentState({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" | "loading" }): ReactElement {
  const toneClass = tone === "error" ? "text-rose-700" : tone === "loading" ? "text-slate-500" : "text-slate-600";
  return <div className={`px-5 py-12 text-center text-sm ${toneClass}`} role={tone === "error" ? "alert" : tone === "loading" ? "status" : undefined}>{children}</div>;
}
