"use client";

import { useEffect, useState } from "react";

import {
  subscribeToast,
  type ToastPayload,
  type ToastType,
} from "../lib/toast";

function toastStyles(type: ToastType): string {
  if (type === "success") return "bg-success text-white";
  if (type === "error") return "bg-danger text-white";
  return "bg-text text-surface";
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    return subscribeToast((t) => {
      setToast(t);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[calc(100%-2rem)] justify-end sm:w-auto"
      role={toast.type === "error" ? "alert" : "status"}
    >
      <div
        className={[
          "pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg",
          "translate-y-0 opacity-100",
          "transition-[transform,opacity] duration-base",
          toastStyles(toast.type),
        ].join(" ")}
      >
        {toast.message}
      </div>
    </div>
  );
}
