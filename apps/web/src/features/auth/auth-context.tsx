import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  login as loginRequest,
  register as registerRequest,
  type AuthSession,
  type LoginCredentials,
  type RegistrationDetails,
} from "./api/auth-api";
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from "../../lib/authentication";
import { setUnauthorizedHandler } from "../../lib/api-client";

interface AuthenticationContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  loginError: Error | null;
  login: (credentials: LoginCredentials, onSuccess: (session: AuthSession) => void) => void;
  register: (details: RegistrationDetails, onSuccess: () => void) => void;
  isRegistering: boolean;
  registrationError: Error | null;
  logout: () => void;
}

const AuthenticationContext =
  createContext<AuthenticationContextValue | null>(null);

export function AuthenticationProvider({
  children,
}: PropsWithChildren): ReactElement {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);
  const activateSession = useCallback((nextSession: AuthSession) => {
    if (
      session !== null &&
      (session.user.id !== nextSession.user.id || session.user.role !== nextSession.user.role)
    ) {
      queryClient.removeQueries();
    }
    storeSession(nextSession);
    setSession(nextSession);
  }, [queryClient, session]);
  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: activateSession,
  });
  const registrationMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: activateSession,
  });

  const clearAuthentication = useCallback(() => {
    clearStoredSession();
    queryClient.clear();
    setSession(null);
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(clearAuthentication);
    return () => setUnauthorizedHandler(() => undefined);
  }, [clearAuthentication]);

  const login = useCallback(
    (credentials: LoginCredentials, onSuccess: (session: AuthSession) => void) => {
      loginMutation.mutate(credentials, { onSuccess });
    },
    [loginMutation],
  );
  const register = useCallback(
    (details: RegistrationDetails, onSuccess: () => void) => {
      registrationMutation.mutate(details, { onSuccess });
    },
    [registrationMutation],
  );

  const value: AuthenticationContextValue = {
    session,
    isAuthenticated: session !== null,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    login,
    register,
    isRegistering: registrationMutation.isPending,
    registrationError: registrationMutation.error,
    logout: clearAuthentication,
  };

  return (
    <AuthenticationContext.Provider value={value}>
      {children}
    </AuthenticationContext.Provider>
  );
}

export function useAuthentication(): AuthenticationContextValue {
  const context = useContext(AuthenticationContext);
  if (!context) {
    throw new Error(
      "useAuthentication must be used inside AuthenticationProvider.",
    );
  }

  return context;
}
