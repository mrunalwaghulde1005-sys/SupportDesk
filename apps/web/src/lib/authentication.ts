import type { AuthSession, AuthUser } from "../features/auth/api/auth-api";

const storageKey = "supportdesk.auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.role === "string"
  );
}

function tokenIsUnexpired(token: string): boolean {
  const payloadSegment = token.split(".")[1];
  if (!payloadSegment) {
    return false;
  }

  try {
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload: unknown = JSON.parse(atob(paddedBase64));

    return (
      isRecord(payload) &&
      typeof payload.exp === "number" &&
      payload.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}

export function readStoredSession(): AuthSession | null {
  const storedValue = sessionStorage.getItem(storageKey);
  if (!storedValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(storedValue);
    if (
      isRecord(parsed) &&
      typeof parsed.token === "string" &&
      isAuthUser(parsed.user) &&
      tokenIsUnexpired(parsed.token)
    ) {
      return {
        token: parsed.token,
        user: parsed.user,
      };
    }
  } catch {
    sessionStorage.removeItem(storageKey);
    return null;
  }

  sessionStorage.removeItem(storageKey);
  return null;
}

export function storeSession(session: AuthSession): void {
  sessionStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearStoredSession(): void {
  sessionStorage.removeItem(storageKey);
}
