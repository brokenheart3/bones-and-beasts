import React from "react";
import { NativeStackHeaderProps } from "@react-navigation/native-stack";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";

// A custom header, rather than native-stack's default full-bleed bar, so it
// can be capped at the same 820px max-width as the bottom tab bar
// (MainTabs.tsx) and rendered as a distinct rounded panel instead of an
// edge-to-edge strip.
export default function SettingsHeader({ navigation, options, back }: NativeStackHeaderProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bar}>
        {back ? (
          <Pressable onPress={navigation.goBack} style={styles.sideBtn} hitSlop={10}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.sideBtn} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {options.title ?? ""}
        </Text>
        <View style={styles.sideBtn} />
      </View>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    safe: {
      backgroundColor: theme.colors.background,
    },
    bar: {
      width: "100%",
      maxWidth: 820,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      marginHorizontal: 12,
      marginTop: 8,
      marginBottom: 8,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    sideBtn: {
      width: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    backArrow: {
      fontSize: 20,
      color: theme.colors.textLight,
    },
    title: {
      flex: 1,
      textAlign: "center",
      color: theme.colors.textLight,
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });
}
