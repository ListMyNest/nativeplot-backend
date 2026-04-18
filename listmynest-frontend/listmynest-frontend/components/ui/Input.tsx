import type { InputHTMLAttributes, ReactNode } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: ReactNode;
};

export function Input({
  label,
  error,
  helperText,
  prefix,
  className = "",
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <label className="block text-xs font-semibold text-lmn-muted" htmlFor={inputId}>
      {label}
      <div
        className={`mt-2 flex min-h-[48px] overflow-hidden rounded-xl border bg-white ${
          error ? "border-lmn-primary" : "border-lmn-border"
        }`}
      >
        {prefix ? (
          <span className="flex items-center border-r border-lmn-border bg-lmn-card px-3 text-sm font-semibold text-lmn-dark">
            {prefix}
          </span>
        ) : null}
        <input
          id={inputId}
          className={`min-h-[48px] flex-1 border-0 px-4 text-lmn-dark outline-none focus:ring-2 focus:ring-lmn-primary/25 ${prefix ? "" : ""} ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <span className="mt-1 block text-xs text-lmn-primary">{error}</span>
      ) : null}
      {helperText && !error ? (
        <span className="mt-1 block text-xs font-normal text-lmn-muted">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
