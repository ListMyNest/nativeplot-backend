import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "whatsapp" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: "bg-lmn-primary text-white hover:opacity-95",
  secondary: "bg-gray-200 text-lmn-dark hover:bg-gray-300",
  whatsapp: "bg-lmn-whatsapp text-white hover:opacity-95",
  outline: "border-2 border-lmn-primary bg-white text-lmn-primary hover:bg-red-50",
  danger: "bg-red-800 text-white hover:bg-red-900",
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-[44px] px-3 text-sm",
  md: "min-h-[48px] px-4 text-base",
  lg: "min-h-[52px] px-6 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-opacity disabled:opacity-50 ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
