import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useTheme } from "../theme";
import { MainTabParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import PlayStack from "./PlayStack";
import StatsScreen from "../screens/StatsScreen";
import SettingsStack from "./SettingsStack";

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Home: "🏠",
  Play: "🎲",
  Stats: "📊",
  SettingsTab: "⚙️",
};

export default function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.gold,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceAlt,
          width: "100%",
          maxWidth: 820,
          alignSelf: "center",
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>
            {TAB_ICONS[route.name as keyof MainTabParamList]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Play" component={PlayStack} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}
