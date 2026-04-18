"use client";

type Props = {
  devOtp?: string | null;
};

export function DevOtpNotice({ devOtp }: Props) {
  const isDev =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <p className="text-sm font-medium text-yellow-800">
          🔧 Dev Mode: Check the backend terminal for your OTP
        </p>
        <p className="mt-1 text-xs text-yellow-600">
          Look for: &quot;DEV MODE OTP for +91XXXXXXXXXX: 123456&quot;
        </p>
        {isDev ? (
          <p className="mt-2 text-xs text-yellow-700">
            Check the Cursor terminal tab where the backend is running for the
            OTP code.
          </p>
        ) : null}
      </div>
      {devOtp ? (
        <div className="rounded-lg border border-lmn-border bg-lmn-card p-3">
          <p className="text-xs font-semibold text-lmn-muted">
            OTP returned by API (dev only)
          </p>
          <p className="mt-1 font-mono text-lg font-bold tracking-widest text-lmn-dark">
            {devOtp}
          </p>
        </div>
      ) : null}
    </div>
  );
}
