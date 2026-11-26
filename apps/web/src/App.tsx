import { useState, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { AuthenticationProvider, useAuthentication } from "./features/auth/auth-context";
import type { UserRole } from "./features/auth/api/auth-api";
import { dashboardPath } from "./lib/role-routes";
import DashboardPage from "./pages/DashboardPage";
import TicketsPage from "./pages/TicketsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CreateTicketPage from "./pages/CreateTicketPage";
import TicketDetailsPage from "./pages/TicketDetailsPage";
import AgentDashboardPage from "./pages/AgentDashboardPage";
import AgentTicketDetailsPage from "./pages/AgentTicketDetailsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CustomerReportsPage from "./pages/CustomerReportsPage";
import CommentsPage from "./pages/CommentsPage";
import AdminTicketDetailsPage from "./pages/AdminTicketDetailsPage";

function RoleProtected({ role, children }: { role: UserRole; children: ReactElement }): ReactElement {
  const { session } = useAuthentication();
  if (!session) return <Navigate to="/login" replace />;
  return session.user.role === role ? children : <Navigate to={dashboardPath(session.user.role)} replace />;
}

function ProtectedRoutes(): ReactElement {
  const { session } = useAuthentication();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const CustomerDashboard = () => session.user.role === "CUSTOMER"
    ? <DashboardPage />
    : <Navigate to={dashboardPath(session.user.role)} replace />;
  const CustomerArea = () => session.user.role === "CUSTOMER"
    ? <AppLayout />
    : <Navigate to={dashboardPath(session.user.role)} replace />;
  const AgentArea = () => session.user.role === "AGENT"
    ? <AppLayout />
    : <Navigate to={dashboardPath(session.user.role)} replace />;
  const AdminArea = () => session.user.role === "ADMIN"
    ? <AppLayout />
    : <Navigate to={dashboardPath(session.user.role)} replace />;

  return (
    <Routes>
      <Route element={<CustomerArea />} path="/app">
        <Route element={<CustomerDashboard />} index />
        <Route element={<TicketsPage />} path="tickets" />
        <Route element={<CreateTicketPage />} path="tickets/new" />
        <Route element={<CustomerReportsPage />} path="reports" />
        <Route element={<CommentsPage />} path="comments" />
        <Route element={<TicketDetailsPage />} path="tickets/:id" />
      </Route>
      <Route element={<AgentArea />} path="/agent">
        <Route element={<RoleProtected role="AGENT"><AgentDashboardPage /></RoleProtected>} path="dashboard" />
        <Route element={<RoleProtected role="AGENT"><AgentTicketDetailsPage /></RoleProtected>} path="tickets/:id" />
        <Route element={<RoleProtected role="AGENT"><CommentsPage /></RoleProtected>} path="comments" />
      </Route>
      <Route element={<AdminArea />} path="/admin">
        <Route element={<RoleProtected role="ADMIN"><AdminDashboardPage /></RoleProtected>} path="dashboard" />
        <Route element={<RoleProtected role="ADMIN"><CommentsPage /></RoleProtected>} path="comments" />
        <Route element={<RoleProtected role="ADMIN"><AdminTicketDetailsPage /></RoleProtected>} path="tickets/:id" />
      </Route>
      <Route element={<CustomerArea />} path="/customer">
        <Route element={<CustomerDashboard />} path="dashboard" />
      </Route>
      <Route element={<Navigate to={dashboardPath(session.user.role)} replace />} path="*" />
    </Routes>
  );
}

function ApplicationRoutes(): ReactElement {
  const { session, isAuthenticated } = useAuthentication();

  return (
    <Routes>
      <Route
        element={
          <Navigate to={isAuthenticated ? dashboardPath(session!.user.role) : "/login"} replace />
        }
        path="/"
      />
      <Route
        element={
          isAuthenticated ? <Navigate to={dashboardPath(session!.user.role)} replace /> : <LoginPage />
        }
        path="/login"
      />
      <Route element={<RegisterPage />} path="/register" />
      <Route element={<ProtectedRoutes />} path="/*" />
    </Routes>
  );
}

export default function App(): ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthenticationProvider>
        <BrowserRouter>
          <ApplicationRoutes />
        </BrowserRouter>
      </AuthenticationProvider>
    </QueryClientProvider>
  );
}
