import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "dark" | "light";

// "system" defers to the device's own locale (see src/i18n/index.ts) — any
// other value is an explicit player override that persists across launches.
export type LanguageSetting = "system" | string;

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  language: LanguageSetting;
  setLanguage: (language: LanguageSetting) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: "dark",
      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
      language: "system",
      setLanguage: (language: LanguageSetting) => set({ language }),
    }),
    {
      name: "bones-and-beasts/settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
