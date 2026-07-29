import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";
import { useStatsStore } from "../store/useStatsStore";
import { useProfileStore } from "../store/useProfileStore";
import { formatElapsed } from "../utils/time";

export default function StatsScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const history = useStatsStore((s) => s.history);
  const username = useProfileStore((s) => s.username);

  const gamesPlayed = history.length;
  const wins = history.filter((g) => g.winnerName === username).length;
  const totalSets = history.reduce((sum, g) => sum + g.setsCompleted, 0);
  const avgSets = gamesPlayed > 0 ? (totalSets / gamesPlayed).toFixed(1) : "0";

  const soloWinTimes = history
    .filter((g) => g.mode === "solo" && g.winnerName === username && g.durationMs != null)
    .map((g) => g.durationMs as number);
  const bestSoloTime = soloWinTimes.length > 0 ? Math.min(...soloWinTimes) : null;

  const recent = [...history].reverse().slice(0, 10);

  return (
    <SafeAreaView style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <Text style={styles.title}>Stats</Text>

          <View style={styles.statRow}>
            <StatTile styles={styles} label="Games played" value={String(gamesPlayed)} />
            <StatTile styles={styles} label="Your wins" value={String(wins)} />
          </View>
          <View style={styles.statRow}>
            <StatTile styles={styles} label="Sets completed" value={String(totalSets)} />
            <StatTile styles={styles} label="Avg sets / game" value={avgSets} />
          </View>
          <View style={styles.statRow}>
            <StatTile
              styles={styles}
              label="Best solo time"
              value={bestSoloTime !== null ? formatElapsed(bestSoloTime) : "–"}
            />
          </View>

          <Text style={styles.sectionLabel}>Recent games</Text>
          {recent.length === 0 ? (
            <Text style={styles.empty}>No games played yet — go start one!</Text>
          ) : (
            <View style={styles.section}>
              {recent.map((g, i) => (
                <View key={i} style={styles.gameRow}>
                  <Text style={styles.gameMode}>{g.mode === "solo" ? "Solo" : `Group (${g.playerCount})`}</Text>
                  <Text style={styles.gameWinner}>
                    {g.winnerName ? `🏆 ${g.winnerName}` : "No winner"}
                  </Text>
                  <View>
                    <Text style={styles.gameDate}>
                      {new Date(g.date).toLocaleDateString()}
                    </Text>
                    {g.durationMs != null && (
                      <Text style={styles.gameDuration}>⏱ {formatElapsed(g.durationMs)}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof getStyles>;

function StatTile({ styles, label, value }: { styles: Styles; label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
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
    inner: {
      width: "100%",
      maxWidth: 560,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.colors.gold,
      marginBottom: 16,
    },
    statRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 10,
    },
    tile: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingVertical: 16,
      alignItems: "center",
    },
    tileValue: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.goldSoft,
    },
    tileLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 20,
      marginBottom: 10,
    },
    empty: {
      color: theme.colors.textMuted,
      fontSize: 14,
    },
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    gameRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceAlt,
    },
    gameMode: {
      flex: 1,
      color: theme.colors.textLight,
      fontSize: 13,
      fontWeight: "600",
    },
    gameWinner: {
      flex: 1,
      color: theme.colors.textLight,
      fontSize: 13,
      textAlign: "center",
    },
    gameDate: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: "right",
    },
    gameDuration: {
      color: theme.colors.goldSoft,
      fontSize: 11,
      textAlign: "right",
      marginTop: 2,
    },
  });
}
