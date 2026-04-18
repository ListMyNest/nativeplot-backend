import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SessionStore = {
  viewedPropertyIds: string[];
  contactActionTaken: boolean;
  notifyMeShown: boolean;
  addViewedProperty: (id: string) => void;
  setContactActionTaken: (value: boolean) => void;
  setNotifyMeShown: (value: boolean) => void;
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      viewedPropertyIds: [],
      contactActionTaken: false,
      notifyMeShown: false,
      addViewedProperty: (id) => {
        if (get().viewedPropertyIds.includes(id)) return;
        set((s) => ({ viewedPropertyIds: [...s.viewedPropertyIds, id] }));
      },
      setContactActionTaken: (contactActionTaken) => set({ contactActionTaken }),
      setNotifyMeShown: (notifyMeShown) => set({ notifyMeShown }),
    }),
    {
      name: "listmynest-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        viewedPropertyIds: state.viewedPropertyIds,
        contactActionTaken: state.contactActionTaken,
        notifyMeShown: state.notifyMeShown,
      }),
    }
  )
);
