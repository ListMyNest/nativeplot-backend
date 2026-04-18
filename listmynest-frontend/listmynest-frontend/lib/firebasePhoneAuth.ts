import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

import { getFirebaseAuth } from "./firebaseClient";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    recaptchaContainerId?: string;
  }
}

export type StartPhoneOtpResult = {
  confirmation: ConfirmationResult;
};

export function startPhoneOtp(
  phoneE164: string,
  recaptchaContainerId: string
): Promise<StartPhoneOtpResult> {
  const auth = getFirebaseAuth();

  if (typeof window === "undefined") {
    throw new Error("Phone auth is only available in the browser.");
  }

  const container = document.getElementById(recaptchaContainerId);
  if (!container) {
    throw new Error("reCAPTCHA container not found. Please reload and try again.");
  }

  // Create once per page + reuse to avoid "already been rendered" errors.
  if (!window.recaptchaVerifier || window.recaptchaContainerId !== recaptchaContainerId) {
    try {
      window.recaptchaVerifier?.clear();
    } catch {
      // ignore
    }
    container.innerHTML = "";
    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: "invisible",
    });
    window.recaptchaContainerId = recaptchaContainerId;
  }

  return signInWithPhoneNumber(auth, phoneE164, window.recaptchaVerifier).then(
    (confirmation) => ({ confirmation })
  );
}

export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  otp: string
): Promise<string> {
  const cred = await confirmation.confirm(otp);
  return await cred.user.getIdToken();
}

