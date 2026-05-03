"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { passwordLogin } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import { showToast } from "../../../lib/toast";

export default function AgentLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  const [digits, setDigits] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const phoneE164 = `+91${digits.replace(/\D/g, "").slice(0, 10)}`;
  const tenOk = digits.replace(/\D/g, "").length === 10;

  const onLogin = async () => {
    if (!tenOk) {
      showToast("Enter a valid 10-digit mobile number.", "error");
      return;
    }
    if (password.trim().length < 6) {
      showToast("Enter your password.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await passwordLogin(phoneE164, password, "AGENT");
      const role = String(res.role).toUpperCase();
      if (role !== "AGENT") {
        showToast("This login is for agents only.", "error");
        return;
      }
      setAuth(res.token, res.role, res.userId, res.name);
      showToast("Welcome!", "success");
      router.replace("/agent/dashboard");
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Invalid OTP.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-lmn-card px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border-2 border-lmn-border bg-white p-6 shadow-lg">
        <Link
          href="/"
          className="mb-6 inline-flex min-h-[48px] items-center gap-2 text-sm font-semibold text-lmn-primary"
        >
          <span aria-hidden>←</span> Home
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-lmn-primary text-2xl text-white">
            🏠
          </span>
          <div>
            <p className="text-xs font-semibold text-lmn-muted">ListMyNest</p>
            <h1 className="text-xl font-extrabold text-lmn-dark">
              Agent Login
            </h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-lmn-muted">
        Enter your phone number and password to continue
        </p>

        <div className="space-y-4">
          <label className="block text-xs font-semibold text-lmn-muted">
            Mobile number
            <div className="mt-2 flex min-h-[48px] overflow-hidden rounded-xl border border-lmn-border bg-white">
              <span className="flex items-center border-r border-lmn-border bg-lmn-card px-4 text-sm font-semibold text-lmn-dark">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="9876543210"
                className="min-h-[48px] flex-1 border-0 px-4 text-lg text-lmn-dark outline-none focus:ring-0"
                value={digits}
                onChange={(e) =>
                  setDigits(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
              />
            </div>
          </label>
        <label className="block text-xs font-semibold text-lmn-muted">
          Password
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="min-h-[48px] w-full rounded-xl border border-lmn-border py-3 pl-4 pr-14 text-lmn-dark outline-none focus:border-lmn-primary focus:ring-2 focus:ring-lmn-primary/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 min-h-[40px] -translate-y-1/2 rounded-lg px-2 text-xs font-semibold text-lmn-primary"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
          <button
            type="button"
          disabled={busy || !tenOk || password.trim().length < 6}
          onClick={() => void onLogin()}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary text-base font-semibold text-white disabled:opacity-50"
          >
          {busy ? "Signing in…" : "Login"}
          </button>
        </div>
      </div>
    </main>
  );
}
