import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "dark" | "light";

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: "dark",
      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
    }),
    {
      name: "bones-and-beasts/settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
