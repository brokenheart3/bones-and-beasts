import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../theme";
import { SettingsStackParamList } from "./types";
import SettingsHomeScreen from "../screens/settings/SettingsHomeScreen";
import ProfileScreen from "../screens/settings/ProfileScreen";
import PrivacyPolicyScreen from "../screens/settings/PrivacyPolicyScreen";
import TermsOfServiceScreen from "../screens/settings/TermsOfServiceScreen";
import AboutScreen from "../screens/settings/AboutScreen";
import AppSettingsScreen from "../screens/settings/AppSettingsScreen";
import SettingsHeader from "./SettingsHeader";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        header: (props) => <SettingsHeader {...props} />,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="SettingsHome"
        component={SettingsHomeScreen}
        options={{ title: "Settings" }}
      />
      <Stack.Screen name="Profile" options={{ title: "Profile" }}>
        {({ navigation }) => (
          <ProfileScreen onDone={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="AppSettings"
        component={AppSettingsScreen}
        options={{ title: "App Settings" }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ title: "Terms of Service" }}
      />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: "About" }} />
    </Stack.Navigator>
  );
}
