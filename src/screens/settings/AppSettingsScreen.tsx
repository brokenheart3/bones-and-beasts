import React, { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../../theme";
import { useSettingsStore, ThemeMode } from "../../store/useSettingsStore";
import { useStatsStore } from "../../store/useStatsStore";
import { useProfileStore } from "../../store/useProfileStore";

const THEME_OPTIONS: { mode: ThemeMode; label: string; emoji: string }[] = [
  { mode: "dark", label: "Dark", emoji: "🌙" },
  { mode: "light", label: "Light", emoji: "☀️" },
];

export default function AppSettingsScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const clearHistory = useStatsStore((s) => s.clearHistory);
  const resetProfile = useProfileStore((s) => s.resetProfile);

  const [confirmingReset, setConfirmingReset] = useState(false);

  const confirmReset = () => {
    clearHistory();
    resetProfile();
    setConfirmingReset(false);
    // resetProfile clears the username, which App.tsx's `!username` check
    // reads to send the player straight back to onboarding.
  };

  return (
    <SafeAreaView style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.mode}
              style={[styles.themeOption, themeMode === opt.mode && styles.themeOptionActive]}
              onPress={() => setThemeMode(opt.mode)}
            >
              <Text style={styles.themeEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.themeLabel,
                  themeMode === opt.mode && styles.themeLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.section}>
          <Text style={styles.sectionText}>
            Clears your Stats history and username from this device, and sends you back
            through onboarding. This can't be undone.
          </Text>
          <Pressable style={styles.dangerBtn} onPress={() => setConfirmingReset(true)}>
            <Text style={styles.dangerBtnText}>Reset local data</Text>
          </Pressable>
        </View>
      </ScrollView>

      {confirmingReset && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Reset local data?</Text>
            <Text style={styles.confirmBody}>
              This clears your Stats history and username on this device. You'll be asked
              for a new name next. This can't be undone.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmCancel]}
                onPress={() => setConfirmingReset(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, styles.confirmDanger]}
                onPress={confirmReset}
              >
                <Text style={styles.confirmDangerText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      alignItems: "center",
    },
    sectionLabel: {
      width: "100%",
      maxWidth: 480,
      color: theme.colors.textMuted,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 10,
      marginTop: 8,
    },
    themeRow: {
      width: "100%",
      maxWidth: 480,
      flexDirection: "row",
      gap: 10,
      marginBottom: 8,
    },
    themeOption: {
      flex: 1,
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.surfaceAlt,
      paddingVertical: 18,
    },
    themeOptionActive: {
      borderColor: theme.colors.gold,
      backgroundColor: theme.colors.accentTint,
    },
    themeEmoji: {
      fontSize: 26,
      marginBottom: 6,
    },
    themeLabel: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    themeLabelActive: {
      color: theme.colors.goldSoft,
    },
    section: {
      width: "100%",
      maxWidth: 480,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 16,
    },
    sectionText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 14,
    },
    dangerBtn: {
      backgroundColor: theme.colors.danger,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: theme.radius.md,
      alignItems: "center",
    },
    dangerBtnText: {
      color: theme.colors.textOnAccent,
      fontSize: 14,
      fontWeight: "700",
    },
    confirmOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    confirmCard: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 20,
    },
    confirmTitle: {
      color: theme.colors.textLight,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 10,
    },
    confirmBody: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 18,
    },
    confirmRow: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "flex-end",
    },
    confirmBtn: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: theme.radius.sm,
    },
    confirmCancel: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    confirmCancelText: {
      color: theme.colors.textLight,
      fontWeight: "600",
      fontSize: 13,
    },
    confirmDanger: {
      backgroundColor: theme.colors.danger,
    },
    confirmDangerText: {
      color: theme.colors.textOnAccent,
      fontWeight: "700",
      fontSize: 13,
    },
  });
}
