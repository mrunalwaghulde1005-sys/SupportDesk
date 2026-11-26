import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactElement, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-indigo-700 text-white hover:bg-indigo-800 focus-visible:outline-indigo-700",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-indigo-700",
  danger: "bg-rose-700 text-white hover:bg-rose-800 focus-visible:outline-rose-700",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({
  children,
  className = "",
  disabled = false,
  loading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps): ReactElement {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", error, helperText, id, label, required, ...props },
  ref,
): ReactElement {
  const inputId = id ?? props.name;
  const helpId = inputId ? `${inputId}-help` : undefined;
  const errorId = inputId ? `${inputId}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-800" htmlFor={inputId}>{label}</label>
      <input
        {...props}
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={[helperText ? helpId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
        className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-100 ${error ? "border-rose-600" : ""} ${className}`}
      />
      {helperText && <p id={helpId} className="text-sm text-slate-600">{helperText}</p>}
      {error && <p id={errorId} className="text-sm text-rose-700" role="alert">{error}</p>}
    </div>
  );
});

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children, actions }: ModalProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `dialog-title-${useId()}`;
  const descriptionId = description ? `${titleId}-description` : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
      onCancel={(event) => { event.preventDefault(); onOpenChange(false); }}
      onClose={() => { if (open) onOpenChange(false); }}
    >
      <div className="p-6">
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        {description && <p id={descriptionId} className="mt-2 text-sm text-slate-600">{description}</p>}
        <div className="mt-5">{children}</div>
        {actions && <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div>}
      </div>
    </dialog>
  );
}

export function ResponsiveTable({ children, className = "", ariaLabel = "Scrollable table" }: { children: ReactNode; className?: string; ariaLabel?: string }): ReactElement {
  return <div className="overflow-x-auto" role="region" aria-label={ariaLabel} tabIndex={0}><table className={`w-full text-left text-sm ${className}`}>{children}</table></div>;
}
