"use client";

import { useEffect } from "react";

import { ensureSessionHash } from "../lib/session";
import { useAuthStore } from "../lib/store";

/**
 * Initializes session hash + hydrates auth from storage on the client.
 */
export function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);
  const syncSessionHash = useAuthStore((s) => s.syncSessionHash);

  useEffect(() => {
    hydrateFromStorage();
    void ensureSessionHash().then(() => syncSessionHash());
  }, [hydrateFromStorage, syncSessionHash]);

  return <>{children}</>;
}
