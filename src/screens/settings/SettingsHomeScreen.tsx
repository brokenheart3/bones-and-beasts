import React from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../../theme";
import { SettingsStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsHome">;

const LINKS: { labelKey: string; screen: keyof SettingsStackParamList; icon: string }[] = [
  { labelKey: "settingsNav.profile", screen: "Profile", icon: "👤" },
  { labelKey: "settingsNav.appSettings", screen: "AppSettings", icon: "🎨" },
  { labelKey: "settingsNav.privacyPolicy", screen: "PrivacyPolicy", icon: "🔒" },
  { labelKey: "settingsNav.termsOfService", screen: "TermsOfService", icon: "📜" },
  { labelKey: "settingsNav.about", screen: "About", icon: "🏺" },
];

export default function SettingsHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <View style={styles.section}>
        {LINKS.map((link) => (
          <Pressable
            key={link.screen}
            style={styles.row}
            onPress={() => navigation.navigate(link.screen)}
          >
            <Text style={styles.icon}>{link.icon}</Text>
            <Text style={styles.rowLabel}>{t(link.labelKey)}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
    },
    section: {
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceAlt,
    },
    icon: {
      fontSize: 18,
      marginRight: 12,
    },
    rowLabel: {
      flex: 1,
      color: theme.colors.textLight,
      fontSize: 15,
      fontWeight: "600",
    },
    chevron: {
      color: theme.colors.textMuted,
      fontSize: 20,
    },
  });
}
