import { useState, type ReactElement } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiClientError } from "../lib/api-client";
import { useAuthentication } from "../features/auth/auth-context";
import type { LoginCredentials } from "../features/auth/api/auth-api";
import { dashboardPath } from "../lib/role-routes";

function getErrorMessage(error: Error): string {
  if (!(error instanceof ApiClientError)) {
    return "Sign-in could not be completed. Please try again.";
  }

  if (error.code === "INVALID_CREDENTIALS") {
    return "Email or password is incorrect.";
  }

  if (error.code === "NETWORK_ERROR") {
    return "Unable to reach SupportDesk. Check your connection and try again.";
  }

  if (error.status !== null && error.status >= 500) {
    return "SupportDesk is temporarily unavailable. Please try again shortly.";
  }

  return "Sign-in could not be completed. Please check your details and try again.";
}

export default function LoginPage(): ReactElement {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const { session, isAuthenticated, isLoggingIn, login, loginError } =
    useAuthentication();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginCredentials>();
  if (isAuthenticated) {
    return <Navigate to={dashboardPath(session!.user.role)} replace />;
  }

  const onSubmit: SubmitHandler<LoginCredentials> = (credentials) => {
    login(credentials, (session) => navigate(dashboardPath(session.user.role), { replace: true }));
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/25 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-indigo-700 p-10 text-white lg:flex xl:p-14">
          <div>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-white/15 text-2xl">
                🎧
              </span>
              <span className="text-xl font-semibold tracking-tight">
                SupportDesk
              </span>
            </div>
            <div className="mt-24 max-w-md">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Customer support, made clear
              </p>
              <h2 className="mt-5 text-4xl font-semibold leading-tight xl:text-5xl">
                A calmer way to help every customer.
              </h2>
              <p className="mt-5 text-base leading-7 text-indigo-100">
                Sign in to continue to your SupportDesk workspace.
              </p>
            </div>
          </div>
          <p className="text-sm text-indigo-200">
            A reliable place for every conversation.
          </p>
        </section>

        <section className="px-6 py-10 sm:px-12 sm:py-14 lg:px-12 xl:px-16">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-indigo-700 text-xl text-white">
              🎧
            </span>
            <span className="text-lg font-semibold text-slate-900">
              SupportDesk
            </span>
          </div>

          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">
              Welcome back
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Sign in to your account
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Enter the email and password associated with your account.
            </p>

            <form
              className="mt-8 space-y-5"
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              aria-busy={isLoggingIn}
            >
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-800"
                  htmlFor="email"
                >
                  Email address
                </label>
                <input
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                  id="email"
                  type="email"
                  {...register("email", {
                    setValueAs: (value: unknown) =>
                      typeof value === "string" ? value.trim() : value,
                    required: "Email is required.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address.",
                    },
                  })}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={isLoggingIn}
                />
                {errors.email && (
                  <p
                    className="mt-2 text-sm text-red-700"
                    id="email-error"
                    role="alert"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-800"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-16 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    id="password"
                    type={passwordVisible ? "text" : "password"}
                    {...register("password", {
                      required: "Password is required.",
                    })}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    disabled={isLoggingIn}
                  />
                  <button
                    aria-label={
                      passwordVisible ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-3 my-auto h-fit rounded px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
                    disabled={isLoggingIn}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    type="button"
                  >
                    {passwordVisible ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && (
                  <p
                    className="mt-2 text-sm text-red-700"
                    id="password-error"
                    role="alert"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              {loginError && (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {getErrorMessage(loginError)}
                </p>
              )}

              <button
                className="flex w-full items-center justify-center rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">New to SupportDesk? <Link className="font-semibold text-indigo-700 hover:underline" to="/register">Create an account</Link></p>

            <p className="mt-8 text-center text-xs leading-5 text-slate-500">
              Your credentials are sent to the SupportDesk API and are never
              saved in this browser.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
