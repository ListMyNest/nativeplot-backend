"use client";

import { useEffect, useState } from "react";

import {
  subscribeToast,
  type ToastPayload,
  type ToastType,
} from "../lib/toast";

function toastStyles(type: ToastType): string {
  if (type === "success") return "bg-lmn-verified text-white";
  if (type === "error") return "bg-lmn-primary text-white";
  return "bg-lmn-dark text-white";
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
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-20 left-0 right-0 z-[100] flex justify-center px-4 sm:bottom-8"
      role="status"
    >
      <div
        className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-lg ${toastStyles(toast.type)}`}
      >
        {toast.message}
      </div>
    </div>
  );
}
