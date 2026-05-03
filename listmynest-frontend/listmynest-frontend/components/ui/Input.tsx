import type { InputHTMLAttributes, ReactNode } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export function Input({
  label,
  error,
  success,
  helperText,
  prefix,
  suffix,
  className = "",
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <label
      className="block text-xs font-semibold text-muted"
      htmlFor={inputId}
    >
      {label}
      <div
        className={[
          "mt-2 flex min-h-[48px] overflow-hidden rounded-xl border bg-surface",
          "transition-[border-color,box-shadow] duration-fast",
          error
            ? "border-danger"
            : success
              ? "border-success"
              : "border-border",
          "focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-2 focus-within:ring-offset-bg",
        ].join(" ")}
      >
        {prefix ? (
          <span className="flex items-center border-r border-border bg-surface2 px-3 text-sm font-semibold text-text">
            {prefix}
          </span>
        ) : null}
        <input
          id={inputId}
          className={[
            "min-h-[48px] flex-1 border-0 bg-transparent px-4 text-text outline-none",
            "placeholder:text-muted",
            className,
          ].join(" ")}
          {...rest}
        />
        {suffix ? (
          <span className="flex items-center border-l border-border bg-surface2 px-3 text-sm font-semibold text-text">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <span className="mt-1 block text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
      {helperText && !error ? (
        <span className="mt-1 block text-xs font-normal text-muted">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
