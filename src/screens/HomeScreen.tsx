import React, { useState } from "react";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../theme";
import { useGameStore } from "../store/useGameStore";
import { useProfileStore } from "../store/useProfileStore";
import { useAuthStore } from "../store/useAuthStore";
import { usePurchasesStore } from "../store/usePurchasesStore";
import { getCreationTime, isWithinTrial, trialDaysRemaining } from "../utils/trial";
import { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const username = useProfileStore((s) => s.username);
  const initGame = useGameStore((s) => s.initGame);
  const user = useAuthStore((s) => s.user);
  const isPro = usePurchasesStore((s) => s.isPro);
  // Picked once per mount so the prompt doesn't change on every re-render,
  // but resolved through t() on each render (not cached as text) so a
  // language switch while this screen is mounted still updates it.
  const [promptKey] = useState(() =>
    Math.random() < 0.5 ? "home.promptReady" : "home.promptWanna"
  );
  const prompt = t(promptKey);

  // Solo is free forever (it's local, no server cost) — Group play runs on
  // a paid server, so it's what the subscription actually gates, after a
  // no-signup-required trial window tied to the account's own age.
  const creationTime = getCreationTime(user);
  const trialActive = isWithinTrial(creationTime);
  const canPlayGroup = isPro || trialActive;
  const daysLeft = trialDaysRemaining(creationTime);

  const playSolo = () => {
    initGame([username ?? t("common.you")]);
    navigation.navigate("Play", { screen: "PlayHome" });
  };

  const findGroup = () => {
    if (!canPlayGroup) {
      navigation.navigate("Play", { screen: "Paywall" });
      return;
    }
    navigation.navigate("Play", {
      screen: "Lobby",
      params: { playerName: username ?? t("common.you") },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.welcome}>{t("home.welcome", { username: username ?? t("common.explorer") })}</Text>
        <Text style={styles.prompt}>{prompt}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.soloTitle")}</Text>
          <Text style={styles.sectionText}>{t("home.soloBody")}</Text>
          <Pressable style={styles.btn} onPress={playSolo}>
            <Text style={styles.btnText}>{t("home.playSolo")}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.groupTitle")}</Text>
          <Text style={styles.sectionText}>{t("home.groupBody")}</Text>
          {!isPro && (
            <Text style={styles.trialNote}>
              {trialActive ? t("home.trialActive", { count: daysLeft }) : t("home.trialEnded")}
            </Text>
          )}
          <Pressable style={[styles.btn, styles.btnGold]} onPress={findGroup}>
            <Text style={styles.btnGoldText}>{t("home.findGroup")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    wrap: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    welcome: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.gold,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    prompt: {
      fontSize: 15,
      color: theme.colors.textMuted,
      marginBottom: 32,
    },
    section: {
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 20,
      marginBottom: 16,
      alignItems: "center",
    },
    sectionTitle: {
      color: theme.colors.textLight,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 10,
    },
    sectionText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      marginBottom: 18,
    },
    trialNote: {
      color: theme.colors.goldSoft,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 14,
      textAlign: "center",
    },
    btn: {
      backgroundColor: theme.colors.moss,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: theme.radius.md,
    },
    btnText: {
      color: theme.colors.textOnAccent,
      fontSize: 16,
      fontWeight: "700",
    },
    btnGold: {
      backgroundColor: theme.colors.gold,
    },
    btnGoldText: {
      color: theme.colors.textDark,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
