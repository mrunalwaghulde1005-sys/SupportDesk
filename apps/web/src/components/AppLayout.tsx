import { useState, type ReactElement } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";

type NavigationIconName = "overview" | "tickets" | "create" | "reports" | "comments";

function NavigationIcon({ name }: { name: NavigationIconName }): ReactElement {
  const paths: Record<NavigationIconName, ReactElement> = {
    overview: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
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
    reports: (
      <>
        <path d="M4 19.5h16M6.5 16V10m5 6V5.5m5 10.5v-8" />
      </>
    ),
    comments: (
      <>
        <path d="M5 5.5h14v10H9l-4 3v-13Z" />
        <path d="M8.5 9h7M8.5 12h5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

function BrandMark(): ReactElement {
  return (
    <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-[14px] bg-indigo-700 text-xl shadow-lg shadow-indigo-900/15">
      🎧
    </span>
  );
}

function getInitials(name: string | undefined): string {
  if (!name) return "SD";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function AppLayout(): ReactElement {
  const { session, logout } = useAuthentication();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const onDashboard = location.pathname === "/app";
  const role = session?.user.role ?? "CUSTOMER";
  const basePath = role === "ADMIN" ? "/admin" : role === "AGENT" ? "/agent" : "/customer";
  const createActive = location.pathname === "/app/tickets/new";
  const reportsActive = location.pathname === "/app/reports";
  const commentsActive = location.pathname.endsWith("/comments");
  const ticketsActive =
    location.pathname === "/app/tickets" ||
    (location.pathname.startsWith("/app/tickets/") && !createActive);

  const customerNavigationItems = [
    { label: "Overview", to: "/app", icon: "overview", active: onDashboard || location.pathname === "/customer/dashboard" },
    {
      label: "Tickets",
      to: "/app/tickets",
      icon: "tickets",
      active: ticketsActive,
    },
    {
      label: "Create ticket",
      to: "/app/tickets/new",
      icon: "create",
      active: createActive,
    },
    {
      label: "Reports",
      to: "/app/reports",
      icon: "reports",
      active: reportsActive,
    },
    { label: "Comments", to: "/app/comments", icon: "comments", active: commentsActive },
  ] as const;
  const navigationItems = role === "CUSTOMER"
    ? customerNavigationItems
    : role === "AGENT"
      ? [
          { label: "Overview", to: `${basePath}/dashboard`, icon: "overview", active: location.pathname === `${basePath}/dashboard` && !location.hash },
          { label: "Assigned tickets", to: `${basePath}/dashboard#assigned-tickets`, icon: "tickets", active: location.pathname.includes("tickets") || location.hash === "#assigned-tickets" },
          { label: "Comments", to: `${basePath}/comments`, icon: "comments", active: commentsActive },
        ] as const
      : [
          { label: "Overview", to: `${basePath}/dashboard`, icon: "overview", active: location.pathname === `${basePath}/dashboard` && !location.search },
          { label: "Tickets", to: `${basePath}/dashboard?tab=tickets`, icon: "tickets", active: location.search === "?tab=tickets" },
          { label: "Customers", to: `${basePath}/dashboard?tab=customers`, icon: "create", active: location.search === "?tab=customers" },
          { label: "Agents", to: `${basePath}/dashboard?tab=agents`, icon: "overview", active: location.search === "?tab=agents" },
          { label: "Comments", to: `${basePath}/comments`, icon: "comments", active: commentsActive },
        ] as const;
  const pageTitle = navigationItems.find((item) => item.active)?.label
    ?? (role === "ADMIN" && location.search === "?tab=reports" ? "Reports & Analytics" : "Overview");

  const navigationClass = (active: boolean, compact: boolean): string =>
    [
      "flex shrink-0 items-center gap-3 rounded-xl text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
      compact ? "px-3 py-2.5" : "px-3 py-3",
      active
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
    ].join(" ");

  const signOut = (): void => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200/80 bg-white px-5 py-7 lg:flex">
        <Link className="flex items-center gap-3 rounded-lg" to={role === "CUSTOMER" ? "/customer/dashboard" : `${basePath}/dashboard`}>
          <BrandMark />
          <span>
            <span className="block text-[15px] font-bold tracking-tight text-slate-950">
              SupportDesk
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {role === "ADMIN" ? "Administration workspace" : role === "AGENT" ? "Agent workspace" : "Customer care workspace"}
            </span>
          </span>
        </Link>

        <div className="mb-3 mt-12 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </div>
        <nav aria-label="Main navigation" className="space-y-1">
          {navigationItems.map((item) => (
            <Link
              aria-current={item.active ? "page" : undefined}
              className={navigationClass(item.active, false)}
              key={item.label}
              to={item.to}
            >
              <NavigationIcon name={item.icon} />
              {item.label}
              {item.active && (
                <span className="ml-auto size-1.5 rounded-full bg-indigo-600" />
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
              {getInitials(session?.user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {session?.user.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {session?.user.email}
              </p>
            </div>
          </div>
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={signOut}
            type="button"
          >
            <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
              <path d="M8 3.5H4.5v13H8M11 6l4 4-4 4m4-4H7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-9">
          <div className="flex min-h-10 items-center justify-between gap-4">
            <Link className="flex items-center gap-2.5 lg:hidden" to={role === "CUSTOMER" ? "/customer/dashboard" : `${basePath}/dashboard`}>
              <BrandMark />
              <span className="text-sm font-bold tracking-tight text-slate-950">
                SupportDesk
              </span>
            </Link>
            <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 lg:flex">
              <span aria-hidden="true" className="text-base">🎧</span>
              <span>SupportDesk</span><span className="text-slate-300">/</span><span>{pageTitle}</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-1.5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600">
                  <span className="hidden text-right sm:block"><span className="block text-sm font-semibold text-slate-800">{session?.user.name}</span><span className="block text-[11px] text-slate-500">{session?.user.role}</span></span>
                  <span className="flex size-9 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-xs font-bold text-indigo-700 sm:hidden">{getInitials(session?.user.name)}</span>
                </summary>
                <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="truncate text-sm font-semibold text-slate-900">{session?.user.name}</p><p className="mt-1 truncate text-xs text-slate-500">{session?.user.email}</p><p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">{session?.user.role}</p>
                  <button className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700" onClick={signOut} type="button">Sign out</button>
                </div>
              </details>
              <button
                aria-expanded={mobileNavOpen}
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 lg:hidden"
                onClick={() => setMobileNavOpen((open) => !open)}
                type="button"
              >
                <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                  {mobileNavOpen ? <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /> : <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />}
                </svg>
              </button>
            </div>
          </div>
          {mobileNavOpen && (
            <nav aria-label="Main navigation" className="mt-3 grid gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg lg:hidden">
              {navigationItems.map((item) => (
                <Link aria-current={item.active ? "page" : undefined} className={navigationClass(item.active, true)} key={item.label} onClick={() => setMobileNavOpen(false)} to={item.to}>
                  <NavigationIcon name={item.icon} />{item.label}
                </Link>
              ))}
            </nav>
          )}
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 lg:px-9 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
