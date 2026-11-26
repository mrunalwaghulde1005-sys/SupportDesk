import type { ReactElement } from "react";

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

export const statusChartColors: Record<string, string> = {
  OPEN: "#4f46e5",
  IN_PROGRESS: "#0284c7",
  WAITING_ON_CUSTOMER: "#d97706",
  RESOLVED: "#059669",
  CLOSED: "#64748b",
};

export const priorityChartColors: Record<string, string> = {
  P1: "#e11d48",
  P2: "#ea580c",
  P3: "#7c3aed",
  P4: "#64748b",
};

export function DonutChart({ title, segments }: { title: string; segments: ChartSegment[] }): ReactElement {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const positiveSegments = segments.filter((segment) => segment.value > 0);

  return <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_16px_rgba(29,37,70,0.04)]">
    <h2 className="font-semibold text-slate-900">{title}</h2>
    {total === 0 ? <p className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No ticket data to display yet.</p> : <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg aria-label={`${title}, ${total} tickets`} className="size-40 shrink-0" role="img" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" r={radius} stroke="#eef2f7" strokeWidth="16" />
        {positiveSegments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const currentOffset = offset;
          offset += length;
          return <circle key={segment.label} cx="60" cy="60" fill="none" r={radius} stroke={segment.color} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-currentOffset} strokeWidth="16" transform="rotate(-90 60 60)"><title>{`${segment.label}: ${segment.value} (${Math.round((segment.value / total) * 100)}%)`}</title></circle>;
        })}
        <text fill="#0f172a" fontSize="20" fontWeight="700" textAnchor="middle" x="60" y="59">{total}</text><text fill="#64748b" fontSize="7" textAnchor="middle" x="60" y="72">tickets</text>
      </svg>
      <ul className="grid w-full gap-x-5 gap-y-3 sm:grid-cols-2">{segments.map((segment) => <li className="flex min-w-0 items-center gap-2 text-xs" key={segment.label}><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} /><span className="min-w-0 flex-1 truncate text-slate-600">{segment.label}</span><span className="font-semibold tabular-nums text-slate-900">{segment.value}</span></li>)}</ul>
    </div>}
  </section>;
}

export function BarChart({ title, segments }: { title: string; segments: ChartSegment[] }): ReactElement {
  const maxValue = Math.max(0, ...segments.map((segment) => segment.value));
  return <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_16px_rgba(29,37,70,0.04)]">
    <h2 className="font-semibold text-slate-900">{title}</h2>
    {maxValue === 0 ? <p className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No ticket data to display yet.</p> : <ul className="mt-5 space-y-4">{segments.map((segment) => <li key={segment.label} title={`${segment.label}: ${segment.value}`}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-600">{segment.label}</span><span className="font-semibold tabular-nums text-slate-900">{segment.value}</span></div><div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-[width]" style={{ backgroundColor: segment.color, width: `${(segment.value / maxValue) * 100}%` }} /></div></li>)}</ul>}
  </section>;
}

export function LineChart({ title, points }: { title: string; points: { label: string; value: number }[] }): ReactElement {
  const maxValue = Math.max(0, ...points.map((point) => point.value));
  const plotPoints = points.map((point, index) => {
    const x = points.length <= 1 ? 150 : 12 + (index / (points.length - 1)) * 276;
    const y = 94 - (maxValue === 0 ? 0 : (point.value / maxValue) * 78);
    return { ...point, x, y };
  });
  return <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_16px_rgba(29,37,70,0.04)]">
    <h2 className="font-semibold text-slate-900">{title}</h2>
    {points.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Ticket creation dates are not available yet.</p> : <><svg aria-label={title} className="mt-4 h-36 w-full overflow-visible" preserveAspectRatio="none" role="img" viewBox="0 0 300 110"><path d="M12 94H288" fill="none" stroke="#e2e8f0" strokeWidth="1" /><polyline fill="none" points={plotPoints.map((point) => `${point.x},${point.y}`).join(" ")} stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />{plotPoints.map((point) => <circle cx={point.x} cy={point.y} fill="#fff" key={point.label} r="4" stroke="#4f46e5" strokeWidth="2"><title>{`${point.label}: ${point.value} tickets`}</title></circle>)}</svg><div className="mt-2 flex justify-between gap-2 text-[10px] text-slate-500"><span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span></div></>}
  </section>;
}
