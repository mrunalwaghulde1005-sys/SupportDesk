import type { ReactElement } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuthentication } from "../features/auth/auth-context";
import type { RegistrationDetails } from "../features/auth/api/auth-api";
import { ApiClientError } from "../lib/api-client";

export default function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated, isRegistering, registrationError, register } = useAuthentication();
  const { register: field, handleSubmit, formState: { errors } } = useForm<RegistrationDetails>();
  if (isAuthenticated) return <Navigate to="/app" replace />;
  const submit: SubmitHandler<RegistrationDetails> = (details) => register(details, () => navigate("/app", { replace: true }));
  const serverError = registrationError instanceof ApiClientError
    ? registrationError.code === "EMAIL_ALREADY_EXISTS" ? "An account with this email already exists." : registrationError.details[0]?.message ?? "Registration could not be completed. Check your details and try again."
    : registrationError ? "Registration could not be completed. Please try again." : null;
  const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100";
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
    <section className="w-full max-w-xl rounded-3xl bg-white px-6 py-10 shadow-2xl sm:px-12">
      <Link to="/login" className="text-sm font-semibold text-indigo-700">← SupportDesk</Link>
      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-indigo-700">Create account</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">Join SupportDesk</h1>
      <p className="mt-2 text-sm text-slate-600">Create an account to manage your support tickets.</p>
      <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(submit)} aria-busy={isRegistering}>
        {([ ["name", "Full name", "text"], ["email", "Email address", "email"], ["password", "Password", "password"] ] as const).map(([name, label, type]) => <div key={name}>
          <label className="mb-2 block text-sm font-medium" htmlFor={name}>{label}</label>
          <input id={name} className={inputClass} type={type} autoComplete={name === "password" ? "new-password" : name === "name" ? "name" : "email"} disabled={isRegistering} aria-invalid={Boolean(errors[name])}
            {...field(name, name === "name" ? { setValueAs: (value: unknown) => typeof value === "string" ? value.trim() : value, required: "Name is required." } : name === "email" ? { setValueAs: (value: unknown) => typeof value === "string" ? value.trim() : value, required: "Email is required.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address." } } : { required: "Password is required.", minLength: { value: 8, message: "Password must be at least 8 characters." } })} />
          {errors[name] && <p className="mt-2 text-sm text-red-700" role="alert">{errors[name]?.message}</p>}
        </div>)}
        {serverError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{serverError}</p>}
        <button className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800 disabled:opacity-60" disabled={isRegistering}>{isRegistering ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-600">Already have an account? <Link className="font-semibold text-indigo-700 hover:underline" to="/login">Sign in</Link></p>
    </section>
  </main>;
}
