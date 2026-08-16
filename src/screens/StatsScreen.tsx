import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../theme";
import { useStatsStore } from "../store/useStatsStore";
import { ordinal } from "../utils/gameSetup";
import { formatElapsed } from "../utils/time";

export default function StatsScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const history = useStatsStore((s) => s.history);

  const gamesPlayed = history.length;
  // Each device's history only ever records this player's own games, so
  // "wins" is just how many of those this player personally finished 1st —
  // no need to match against a stored name (which also broke if you renamed
  // yourself later).
  const wins = history.filter((g) => g.myRank === 1).length;
  const totalSets = history.reduce((sum, g) => sum + g.setsCompleted, 0);
  const avgSets = gamesPlayed > 0 ? (totalSets / gamesPlayed).toFixed(1) : "0";

  const soloWinTimes = history
    .filter((g) => g.mode === "solo" && g.myRank === 1 && g.myFinishMs != null)
    .map((g) => g.myFinishMs as number);
  const bestSoloTime = soloWinTimes.length > 0 ? Math.min(...soloWinTimes) : null;

  const recent = [...history].reverse().slice(0, 10);

  return (
    <SafeAreaView style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <Text style={styles.title}>{t("stats.title")}</Text>

          <View style={styles.statRow}>
            <StatTile styles={styles} label={t("stats.gamesPlayed")} value={String(gamesPlayed)} />
            <StatTile styles={styles} label={t("stats.yourWins")} value={String(wins)} />
          </View>
          <View style={styles.statRow}>
            <StatTile styles={styles} label={t("stats.setsCompleted")} value={String(totalSets)} />
            <StatTile styles={styles} label={t("stats.avgSetsPerGame")} value={avgSets} />
          </View>
          <View style={styles.statRow}>
            <StatTile
              styles={styles}
              label={t("stats.bestSoloTime")}
              value={bestSoloTime !== null ? formatElapsed(bestSoloTime) : t("stats.noBestTime")}
            />
          </View>

          <Text style={styles.sectionLabel}>{t("stats.recentGames")}</Text>
          {recent.length === 0 ? (
            <Text style={styles.empty}>{t("stats.noGamesYet")}</Text>
          ) : (
            <View style={styles.section}>
              {recent.map((g, i) => (
                <View key={i} style={styles.gameRow}>
                  <Text style={styles.gameMode}>
                    {g.mode === "solo" ? t("stats.modeSolo") : t("stats.modeGroup", { count: g.playerCount })}
                  </Text>
                  <Text style={styles.gameWinner}>
                    {g.myRank != null
                      ? t(g.myRank === 1 ? "stats.placeWin" : "stats.place", { place: ordinal(g.myRank) })
                      : t("common.didNotFinish")}
                  </Text>
                  <View>
                    <Text style={styles.gameDate}>
                      {new Date(g.date).toLocaleDateString()}
                    </Text>
                    {g.myFinishMs != null && (
                      <Text style={styles.gameDuration}>⏱ {formatElapsed(g.myFinishMs)}</Text>
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
