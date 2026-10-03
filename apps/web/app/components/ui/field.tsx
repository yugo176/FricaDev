import { forwardRef } from 'react';
import { cn } from './cn';

interface FieldProps {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Libellé + champ + aide + erreur, toujours dans le même ordre et le même espacement. */
export function Field({ label, htmlFor, hint, error, optional, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-stone-800 dark:text-stone-200">
        {label}
        {optional && <span className="ml-1 font-normal text-stone-400">(facultatif)</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn('input', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('input leading-relaxed', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn('input appearance-auto pr-8', className)} {...props} />;
  },
);

/** Message d'erreur général d'un formulaire. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
    >
      {children}
    </div>
  );
}

/** Confirmation discrète après un enregistrement. */
export function FormSuccess({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800 dark:border-brand-800/60 dark:bg-brand-800/20 dark:text-brand-100"
    >
      {children}
    </div>
  );
}
