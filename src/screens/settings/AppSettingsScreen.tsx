import React, { useState } from "react";
import { FlatList, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../../theme";
import { useSettingsStore, ThemeMode, LanguageSetting } from "../../store/useSettingsStore";
import { useStatsStore } from "../../store/useStatsStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useAuthStore } from "../../store/useAuthStore";
import { SUPPORTED_LANGUAGES } from "../../i18n";

type LanguageOption = { code: LanguageSetting; label: string };

export default function AppSettingsScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const THEME_OPTIONS: { mode: ThemeMode; label: string; emoji: string }[] = [
    { mode: "dark", label: t("appSettings.themeDark"), emoji: "🌙" },
    { mode: "light", label: t("appSettings.themeLight"), emoji: "☀️" },
  ];
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const clearHistory = useStatsStore((s) => s.clearHistory);
  const resetProfile = useProfileStore((s) => s.resetProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const LANGUAGE_OPTIONS: LanguageOption[] = [
    { code: "system", label: t("appSettings.languageSystem") },
    ...SUPPORTED_LANGUAGES.map((l) => ({ code: l.code as LanguageSetting, label: l.label })),
  ];
  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((opt) => opt.code === language)?.label ?? t("appSettings.languageSystem");

  const [confirmingReset, setConfirmingReset] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<LanguageSetting>(language);

  const openLanguagePicker = () => {
    setPendingLanguage(language);
    setLanguagePickerOpen(true);
  };

  const saveLanguage = () => {
    setLanguage(pendingLanguage);
    setLanguagePickerOpen(false);
  };

  const confirmReset = async () => {
    clearHistory();
    resetProfile();
    setConfirmingReset(false);
    // Signing out is what actually sends the player back to the sign-in
    // screen — App.tsx gates on auth state, not the local username.
    await signOut();
  };

  return (
    <SafeAreaView style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>{t("appSettings.theme")}</Text>
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

        <Text style={styles.sectionLabel}>{t("appSettings.language")}</Text>
        <View style={styles.section}>
          <Pressable style={styles.languagePickerRow} onPress={openLanguagePicker}>
            <Text style={styles.languageLabel}>{currentLanguageLabel}</Text>
            <Text style={styles.languageChevron}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>{t("appSettings.data")}</Text>
        <View style={styles.section}>
          <Text style={styles.sectionText}>{t("appSettings.dataBody")}</Text>
          <Pressable style={styles.dangerBtn} onPress={() => setConfirmingReset(true)}>
            <Text style={styles.dangerBtnText}>{t("appSettings.signOutReset")}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {confirmingReset && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t("appSettings.confirmResetTitle")}</Text>
            <Text style={styles.confirmBody}>{t("appSettings.confirmResetBody")}</Text>
            <View style={styles.confirmRow}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmCancel]}
                onPress={() => setConfirmingReset(false)}
              >
                <Text style={styles.confirmCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, styles.confirmDanger]}
                onPress={confirmReset}
              >
                <Text style={styles.confirmDangerText}>{t("appSettings.reset")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={languagePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLanguagePickerOpen(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>{t("appSettings.language")}</Text>
            <FlatList
              style={styles.pickerList}
              data={LANGUAGE_OPTIONS}
              keyExtractor={(opt) => opt.code}
              renderItem={({ item }) => {
                const selected = pendingLanguage === item.code;
                return (
                  <Pressable
                    style={styles.pickerRow}
                    onPress={() => setPendingLanguage(item.code)}
                  >
                    <Text style={styles.languageLabel}>{item.label}</Text>
                    {selected && <Text style={styles.languageCheck}>✓</Text>}
                  </Pressable>
                );
              }}
            />
            <View style={styles.confirmRow}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmCancel]}
                onPress={() => setLanguagePickerOpen(false)}
              >
                <Text style={styles.confirmCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, styles.saveBtn]} onPress={saveLanguage}>
                <Text style={styles.saveBtnText}>{t("common.save")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    languagePickerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    languageChevron: {
      color: theme.colors.textMuted,
      fontSize: 20,
    },
    languageLabel: {
      color: theme.colors.textLight,
      fontSize: 14,
      fontWeight: "600",
    },
    languageCheck: {
      color: theme.colors.gold,
      fontSize: 16,
      fontWeight: "700",
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
    saveBtn: {
      backgroundColor: theme.colors.gold,
    },
    saveBtnText: {
      color: theme.colors.textOnAccent,
      fontWeight: "700",
      fontSize: 13,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      justifyContent: "flex-end",
    },
    pickerCard: {
      width: "100%",
      maxHeight: "75%",
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.md,
      borderTopRightRadius: theme.radius.md,
      padding: 20,
      alignSelf: "center",
      maxWidth: 520,
    },
    pickerTitle: {
      color: theme.colors.textLight,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 10,
    },
    pickerList: {
      marginBottom: 14,
    },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceAlt,
    },
  });
}
