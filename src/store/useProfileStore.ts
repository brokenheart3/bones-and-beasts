import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProfileState {
  username: string | null;
  hasHydrated: boolean;
  setUsername: (name: string) => void;
  setHasHydrated: (value: boolean) => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      username: null,
      hasHydrated: false,
      setUsername: (name: string) => set({ username: name.trim() }),
      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),
      // Clears the saved username, sending the app back to the onboarding
      // screen (App.tsx gates on `!username`).
      resetProfile: () => set({ username: null }),
    }),
    {
      name: "bones-and-beasts/profile",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ username: state.username }),
    }
  )
);
