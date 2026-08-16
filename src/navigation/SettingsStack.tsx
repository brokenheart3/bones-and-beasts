import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme";
import { SettingsStackParamList } from "./types";
import SettingsHomeScreen from "../screens/settings/SettingsHomeScreen";
import ProfileScreen from "../screens/settings/ProfileScreen";
import AvatarScreen from "../screens/settings/AvatarScreen";
import PrivacyPolicyScreen from "../screens/settings/PrivacyPolicyScreen";
import TermsOfServiceScreen from "../screens/settings/TermsOfServiceScreen";
import AboutScreen from "../screens/settings/AboutScreen";
import AppSettingsScreen from "../screens/settings/AppSettingsScreen";
import SettingsHeader from "./SettingsHeader";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  const theme = useTheme();
  const { t } = useTranslation();
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
        options={{ title: t("settingsNav.settings") }}
      />
      <Stack.Screen name="Profile" options={{ title: t("settingsNav.profile") }}>
        {({ navigation }) => (
          <ProfileScreen
            onDone={() => navigation.goBack()}
            onUpgrade={() => navigation.getParent()?.navigate("Play", { screen: "Paywall" })}
            onEditAvatar={() => navigation.navigate("Avatar")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Avatar" options={{ title: t("avatar.pageTitle") }}>
        {({ navigation }) => <AvatarScreen onDone={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen
        name="AppSettings"
        component={AppSettingsScreen}
        options={{ title: t("settingsNav.appSettings") }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: t("settingsNav.privacyPolicy") }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ title: t("settingsNav.termsOfService") }}
      />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: t("settingsNav.about") }} />
    </Stack.Navigator>
  );
}
