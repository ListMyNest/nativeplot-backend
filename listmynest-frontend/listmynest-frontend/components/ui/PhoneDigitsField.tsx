"use client";

type PhoneDigitsFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  /** Shown inside the 10-digit area */
  placeholder?: string;
};

/**
 * Indian mobile: fixed +91 prefix, buyer enters 10 digits only (same pattern as seller/agent login).
 */
export function PhoneDigitsField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder = "9876543210",
}: PhoneDigitsFieldProps) {
  return (
    <label className="block text-xs font-semibold text-lmn-muted" htmlFor={id}>
      {label}
      <div className="mt-2 flex min-h-[48px] overflow-hidden rounded-xl border border-lmn-border bg-white">
        <span className="flex shrink-0 items-center border-r border-lmn-border bg-lmn-card px-3 text-sm font-semibold text-lmn-dark sm:px-4">
          +91
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-[48px] w-0 min-w-0 flex-1 border-0 px-3 text-base text-lmn-dark outline-none focus:ring-0 disabled:opacity-60 sm:px-4 sm:text-lg"
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
        />
      </div>
    </label>
  );
}
