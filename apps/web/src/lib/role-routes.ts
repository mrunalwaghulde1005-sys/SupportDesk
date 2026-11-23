import type { UserRole } from "../features/auth/api/auth-api";

export function dashboardPath(role: UserRole): string {
  switch (role) {
    case "CUSTOMER": return "/customer/dashboard";
    case "AGENT": return "/agent/dashboard";
    case "ADMIN": return "/admin/dashboard";
  }
}
