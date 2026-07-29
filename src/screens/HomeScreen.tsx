import React, { useState } from "react";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";
import { useGameStore } from "../store/useGameStore";
import { useProfileStore } from "../store/useProfileStore";
import { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "Home">;

const PROMPTS = ["Are you ready to bet?", "Wanna play?"];

export default function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const username = useProfileStore((s) => s.username);
  const initGame = useGameStore((s) => s.initGame);
  const [prompt] = useState(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
  );

  const playSolo = () => {
    initGame([username ?? "You"]);
    navigation.navigate("Play", { screen: "PlayHome" });
  };

  const findGroup = () => {
    navigation.navigate("Play", {
      screen: "Lobby",
      params: { playerName: username ?? "You" },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.welcome}>Welcome, {username ?? "explorer"}!</Text>
        <Text style={styles.prompt}>{prompt}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solo</Text>
          <Text style={styles.sectionText}>
            Roll to find your card, then hunt the tablet for all six copies
            before some other beast's set gets completed first. Just you,
            your memory, and the skulls.
          </Text>
          <Pressable style={styles.btn} onPress={playSolo}>
            <Text style={styles.btnText}>Play Solo</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group</Text>
          <Text style={styles.sectionText}>
            Team up with 2-4 players and race to complete your own set
            first. Group play is online only — we'll match you with other
            players in a live lobby.
          </Text>
          <Pressable style={[styles.btn, styles.btnGold]} onPress={findGroup}>
            <Text style={styles.btnGoldText}>Find a Group</Text>
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
