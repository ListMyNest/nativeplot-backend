import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "whatsapp"
  | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-lmn-primary text-white shadow-sm hover:shadow-md hover:brightness-[0.98]",
  secondary:
    "bg-surface2 text-text shadow-sm hover:shadow-md hover:bg-surface2/80",
  outline:
    "border border-border bg-transparent text-text shadow-sm hover:bg-surface2",
  ghost: "bg-transparent text-text hover:bg-surface2",
  whatsapp:
    "bg-lmn-whatsapp text-white shadow-sm hover:shadow-md hover:brightness-[0.98]",
  danger:
    "bg-danger text-white shadow-sm hover:shadow-md hover:brightness-[0.98]",
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-[44px] px-3 text-sm",
  md: "min-h-[48px] px-4 text-sm sm:text-base",
  lg: "min-h-[52px] px-6 text-base sm:text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  className = "",
  disabled,
  children,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
        "transition-[transform,box-shadow,background-color,opacity] duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "active:scale-[0.98] hover:scale-[1.02]",
        "disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100",
        variantClass[variant],
        sizeClass[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <span
          className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
