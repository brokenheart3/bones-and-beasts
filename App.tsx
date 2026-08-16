import "./src/i18n";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "./src/theme";
import { useAuthStore } from "./src/store/useAuthStore";
import { useProfileStore } from "./src/store/useProfileStore";
import MainTabs from "./src/navigation/MainTabs";
import ProfileScreen from "./src/screens/settings/ProfileScreen";

export default function App() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isAuthReady = useAuthStore((s) => s.isReady);
  const user = useAuthStore((s) => s.user);
  const setUsername = useProfileStore((s) => s.setUsername);

  useEffect(() => {
    // The web page's own background defaults to white; without this, any
    // area outside our width-capped content (e.g. beside the centered tab
    // bar on a wide browser window) shows through as a white gap instead
    // of matching the current theme.
    if (Platform.OS === "web") {
      document.documentElement.style.backgroundColor = theme.colors.background;
      document.body.style.backgroundColor = theme.colors.background;
    }
  }, [theme.colors.background]);

  // The rest of the app (HUD names, Stats, online lobbies, etc.) reads the
  // player's display name from useProfileStore rather than the Firebase
  // user object directly — keep it in sync with whichever account is
  // currently signed in.
  useEffect(() => {
    if (user) {
      setUsername(user.displayName || user.email?.split("@")[0] || t("common.explorer"));
    }
  }, [user, setUsername]);

  return (
    <>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      {!isAuthReady ? (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
      ) : !user ? (
        <ProfileScreen isOnboarding />
      ) : (
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      )}
    </>
  );
}
