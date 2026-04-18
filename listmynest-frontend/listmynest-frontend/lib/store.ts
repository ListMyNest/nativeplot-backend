import { create } from "zustand";

import { getSessionHash } from "./session";

const LS_TOKEN = "lmn_token";
const LS_ROLE = "lmn_role";
const LS_USER_ID = "lmn_user_id";
const LS_USER_NAME = "lmn_user_name";
const SS_BUYER_TOKEN = "lmn_buyer_token";
const SS_BUYER_ID = "lmn_buyer_id";

function readLs(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function readSs(key: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(key);
}

export interface AuthStore {
  token: string | null;
  role: string | null;
  userId: string | null;
  userName: string | null;
  setAuth: (token: string, role: string, userId: string, name: string) => void;
  logout: () => void;

  buyerToken: string | null;
  buyerId: string | null;
  setBuyer: (token: string, id: string) => void;
  clearBuyer: () => void;

  sessionHash: string;
  syncSessionHash: () => void;

  /** Hydrate token/role/buyer from storage (client-only). */
  hydrateFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  role: null,
  userId: null,
  userName: null,

  buyerToken: null,
  buyerId: null,

  sessionHash: "",

  setAuth: (token, role, userId, name) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_ROLE, role);
      localStorage.setItem(LS_USER_ID, userId);
      localStorage.setItem(LS_USER_NAME, name);
    }
    set({
      token,
      role,
      userId,
      userName: name,
    });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_ROLE);
      localStorage.removeItem(LS_USER_ID);
      localStorage.removeItem(LS_USER_NAME);
      localStorage.removeItem("listmynest-seller-auth");
      sessionStorage.removeItem(SS_BUYER_TOKEN);
      sessionStorage.removeItem(SS_BUYER_ID);
    }
    set({
      token: null,
      role: null,
      userId: null,
      userName: null,
      buyerToken: null,
      buyerId: null,
    });
  },

  setBuyer: (buyerToken, buyerId) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SS_BUYER_TOKEN, buyerToken);
      sessionStorage.setItem(SS_BUYER_ID, buyerId);
    }
    set({ buyerToken, buyerId });
  },

  clearBuyer: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SS_BUYER_TOKEN);
      sessionStorage.removeItem(SS_BUYER_ID);
    }
    set({ buyerToken: null, buyerId: null });
  },

  syncSessionHash: () => set({ sessionHash: getSessionHash() }),

  hydrateFromStorage: () => {
    set({
      token: readLs(LS_TOKEN),
      role: readLs(LS_ROLE),
      userId: readLs(LS_USER_ID),
      userName: readLs(LS_USER_NAME),
      buyerToken: readSs(SS_BUYER_TOKEN),
      buyerId: readSs(SS_BUYER_ID),
      sessionHash: getSessionHash(),
    });
  },
}));
