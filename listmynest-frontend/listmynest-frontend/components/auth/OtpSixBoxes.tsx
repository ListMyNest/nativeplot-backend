"use client";

import { useRef } from "react";

type OtpSixBoxesProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

export function OtpSixBoxes({ value, onChange, disabled }: OtpSixBoxesProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const clean = value.replace(/\D/g, "").slice(0, 6);

  return (
    <div
      className="flex justify-center gap-2"
      onPaste={(e) => {
        e.preventDefault();
        const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        onChange(t);
        const last = Math.min(Math.max(t.length - 1, 0), 5);
        refs.current[last]?.focus();
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={clean[i] ?? ""}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            const before = clean.slice(0, i);
            const after = clean.slice(i + 1);
            const next = (before + d + after).slice(0, 6);
            onChange(next);
            if (d && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              if (clean[i]) {
                onChange(clean.slice(0, i) + clean.slice(i + 1));
              } else if (i > 0) {
                refs.current[i - 1]?.focus();
              }
            }
          }}
          className="size-12 rounded-xl border border-lmn-border bg-white text-center text-xl font-bold text-lmn-dark outline-none focus:border-lmn-primary focus:ring-2 focus:ring-lmn-primary/20 disabled:opacity-50"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
