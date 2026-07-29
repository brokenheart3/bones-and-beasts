import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { useTheme } from "./src/theme";
import { useProfileStore } from "./src/store/useProfileStore";
import MainTabs from "./src/navigation/MainTabs";
import ProfileScreen from "./src/screens/settings/ProfileScreen";

export default function App() {
  const theme = useTheme();
  const hasHydrated = useProfileStore((s) => s.hasHydrated);
  const username = useProfileStore((s) => s.username);

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

  return (
    <>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      {!hasHydrated ? (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
      ) : !username ? (
        <ProfileScreen isOnboarding />
      ) : (
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      )}
    </>
  );
}
