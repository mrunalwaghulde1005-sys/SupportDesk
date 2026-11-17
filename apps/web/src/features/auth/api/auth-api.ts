import { apiClient } from "../../../lib/api-client";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationDetails extends LoginCredentials {
  name: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;
  if (
    typeof session.token !== "string" ||
    typeof session.user !== "object" ||
    session.user === null
  ) {
    return false;
  }

  const user = session.user as Record<string, unknown>;
  return (
    typeof user.id === "number" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    typeof user.role === "string"
  );
}

export async function login(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await apiClient.post<unknown>("/auth/login", credentials);

  if (!isAuthSession(response)) {
    throw new Error("The login response did not match the expected format.");
  }

  return response;
}

export async function register(details: RegistrationDetails): Promise<AuthSession> {
  const response = await apiClient.post<unknown>("/auth/register", details);
  if (!isAuthSession(response)) {
    throw new Error("The registration response did not match the expected format.");
  }
  return response;
}
