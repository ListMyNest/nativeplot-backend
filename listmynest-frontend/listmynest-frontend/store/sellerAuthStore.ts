import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SellerAuthState = {
  accessToken: string | null;
  role: string | null;
  userId: string | null;
  setSellerAuth: (accessToken: string, role: string, userId: string) => void;
  clearSellerAuth: () => void;
};

export const useSellerAuthStore = create<SellerAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      role: null,
      userId: null,
      setSellerAuth: (accessToken, role, userId) =>
        set({ accessToken, role, userId }),
      clearSellerAuth: () =>
        set({ accessToken: null, role: null, userId: null }),
    }),
    {
      name: "listmynest-seller-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        accessToken: s.accessToken,
        role: s.role,
        userId: s.userId,
      }),
    }
  )
);
