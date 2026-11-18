import type { ReactElement } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";

export default function AppLayout(): ReactElement {
  const { session } = useAuthentication();
  const { logout } = useAuthentication();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 md:flex">
        <Link className="flex items-center gap-3 rounded-lg text-slate-950" to="/app">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-700 font-bold text-white">
            SD
          </span>
          <span className="text-lg font-semibold tracking-tight">
            SupportDesk
          </span>
        </Link>
        <p className="mt-10 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>
        <nav className="mt-3" aria-label="Main navigation">
          <NavLink
            className={({ isActive }) =>
              `block rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-100"}`
            }
            to="/app"
            end
          >
            Overview
          </NavLink>
          <NavLink className={({ isActive }) => `mt-1 block rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-100"}`} to="/app/tickets/new">Create ticket</NavLink>
        </nav>
        <div className="mt-auto rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Signed in as</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">
            {session?.user.name}
          </p>
          <p className="truncate text-xs text-slate-500">
            {session?.user.email}
          </p>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-700 text-sm font-bold text-white">
              SD
            </span>
            <span className="font-semibold">SupportDesk</span>
          </div>
          <p className="hidden text-sm font-medium text-slate-600 md:block">
            Support workspace
          </p>
          <div className="flex items-center gap-3"><p className="max-w-[55%] truncate text-sm text-slate-600">{session?.user.name}</p><button className="text-sm font-semibold text-indigo-700 hover:underline" onClick={() => { logout(); navigate("/login", { replace: true }); }}>Sign out</button></div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
