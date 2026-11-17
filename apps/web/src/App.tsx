import { useState, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { AuthenticationProvider, useAuthentication } from "./features/auth/auth-context";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CreateTicketPage from "./pages/CreateTicketPage";
import TicketDetailsPage from "./pages/TicketDetailsPage";

function ProtectedRoutes(): ReactElement {
  const { isAuthenticated } = useAuthentication();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />} path="/app">
        <Route element={<DashboardPage />} index />
        <Route element={<CreateTicketPage />} path="tickets/new" />
        <Route element={<TicketDetailsPage />} path="tickets/:id" />
      </Route>
      <Route element={<Navigate to="/app" replace />} path="*" />
    </Routes>
  );
}

function ApplicationRoutes(): ReactElement {
  const { isAuthenticated } = useAuthentication();

  return (
    <Routes>
      <Route
        element={
          isAuthenticated ? <Navigate to="/app" replace /> : <LoginPage />
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
