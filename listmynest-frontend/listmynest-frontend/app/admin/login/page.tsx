"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { adminLogin, adminRegister } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import { showToast } from "../../../lib/toast";

type Mode = "login" | "register";

export default function AdminLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteSecret, setInviteSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setBusy(true);
    try {
      const res = await adminLogin(email.trim(), password);
      setAuth(res.token, "ADMIN", res.userId, res.name);
      showToast("Signed in.", "success");
      router.replace("/admin/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Login failed.";
      setLoginError(msg);
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (password.length < 8) {
      showToast("Password must be at least 8 characters.", "error");
      return;
    }
    setBusy(true);
    try {
      const phone =
        phoneDigits.replace(/\D/g, "").length === 10
          ? `+91${phoneDigits.replace(/\D/g, "")}`
          : undefined;
      const res = await adminRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        phone,
        inviteSecret: inviteSecret.trim() || undefined,
      });
      setAuth(res.token, "ADMIN", res.userId, res.name);
      showToast("Account created. Welcome!", "success");
      router.replace("/admin/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not create account.";
      if (msg.includes("ADMIN_REGISTRATION_DISABLED")) {
        showToast(
          "Self-signup is off. Use an invite code or set ADMIN_INVITE_SECRET on the server.",
          "error"
        );
      } else if (msg.includes("INVALID_INVITE")) {
        showToast("Invalid invite code.", "error");
      } else if (msg.includes("EMAIL_ALREADY") || msg.includes("409")) {
        showToast("An account with this email already exists.", "error");
      } else if (msg.includes("FORBIDDEN")) {
        showToast(
          "Registration requires an existing admin when the first account already exists.",
          "error"
        );
      } else {
        showToast(msg, "error");
      }
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
            <h1 className="text-xl font-extrabold text-lmn-primary">
              Admin Portal
            </h1>
          </div>
        </div>

        <div className="mb-6 flex rounded-xl bg-lmn-card p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setLoginError(null);
            }}
            className={
              mode === "login"
                ? "flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-lmn-dark shadow-sm"
                : "flex-1 rounded-lg py-2.5 text-sm font-medium text-lmn-muted"
            }
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={
              mode === "register"
                ? "flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-lmn-dark shadow-sm"
                : "flex-1 rounded-lg py-2.5 text-sm font-medium text-lmn-muted"
            }
          >
            Create Account
          </button>
        </div>

        {mode === "login" ? (
          <form className="space-y-4" onSubmit={(e) => void onLogin(e)}>
            <label className="block text-xs font-semibold text-lmn-muted">
              <span className="flex items-center gap-1">
                <span aria-hidden>✉️</span> Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4 text-lmn-dark outline-none focus:border-lmn-primary focus:ring-2 focus:ring-lmn-primary/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
            {loginError ? (
              <p className="text-sm text-lmn-primary" role="alert">
                {loginError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary text-base font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Login"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={(e) => void onRegister(e)}>
            <label className="block text-xs font-semibold text-lmn-muted">
              Full name
              <input
                type="text"
                required
                autoComplete="name"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4 text-lmn-dark outline-none focus:border-lmn-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-lmn-muted">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4 text-lmn-dark outline-none focus:border-lmn-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-lmn-muted">
              Phone <span className="font-normal">(optional)</span>
              <div className="mt-2 flex min-h-[48px] overflow-hidden rounded-xl border border-lmn-border bg-white">
                <span className="flex items-center border-r border-lmn-border bg-lmn-card px-3 text-sm font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10 digits"
                  className="min-h-[48px] flex-1 border-0 px-3 text-lmn-dark outline-none"
                  value={phoneDigits}
                  onChange={(e) =>
                    setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              </div>
            </label>
            <label className="block text-xs font-semibold text-lmn-muted">
              Password (min 8 characters)
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4 text-lmn-dark outline-none focus:border-lmn-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-lmn-muted">
              Confirm password
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4 text-lmn-dark outline-none focus:border-lmn-primary"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-lmn-muted">
              Invite code{" "}
              <span className="font-normal">(for additional admins)</span>
              <input
                type="password"
                autoComplete="off"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-lmn-border px-4 text-lmn-dark outline-none focus:border-lmn-primary"
                value={inviteSecret}
                onChange={(e) => setInviteSecret(e.target.value)}
                placeholder="Optional for first admin"
              />
            </label>
            <p className="text-xs leading-relaxed text-lmn-muted">
              First admin on an empty database can register without an invite.
              Further admins need{" "}
              <code className="rounded bg-lmn-card px-1">ADMIN_INVITE_SECRET</code>.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-lmn-primary text-base font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
