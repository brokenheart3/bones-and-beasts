import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";
import { ordinal } from "../utils/gameSetup";
import { formatElapsed } from "../utils/time";
import { FACE_EMOJIS, FACE_NAMES, Player, SetCompletion } from "../types";

interface Props {
  players: Player[];
  completions: SetCompletion[];
  didLose?: boolean;
  elapsedMs?: number;
  onPlayAgain: () => void;
}

export default function EndScreen({ players, completions, didLose, elapsedMs, onPlayAgain }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const playerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "?";

  // Rank players by number of sets completed, tie-broken by earliest completion.
  const ranking = [...players]
    .map((p) => {
      const theirCompletions = completions.filter((c) => c.playerId === p.id);
      const bestOrder = theirCompletions.length
        ? Math.min(...theirCompletions.map((c) => c.order))
        : Infinity;
      return { player: p, count: theirCompletions.length, bestOrder };
    })
    .sort((a, b) => b.count - a.count || a.bestOrder - b.bestOrder);

  return (
    <SafeAreaView style={styles.wrap}>
      <Text style={[styles.title, didLose && styles.titleLoss]}>
        {didLose ? "Buried in the Temple!" : "Temple Cleared!"}
      </Text>
      {elapsedMs != null && <Text style={styles.time}>⏱ {formatElapsed(elapsedMs)}</Text>}

      {!didLose && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Final ranking</Text>
          {ranking.map((r, i) => (
            <View key={r.player.id} style={styles.rankRow}>
              <Text style={styles.rankPos}>{ordinal(i + 1)}</Text>
              <View style={[styles.dot, { backgroundColor: r.player.color }]} />
              <Text style={styles.rankName}>{r.player.name}</Text>
              <Text style={styles.rankCount}>{r.count} set(s)</Text>
            </View>
          ))}
        </View>
      )}

      {completions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Set completion order</Text>
          {completions
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <Text key={c.order} style={styles.completionRow}>
                {c.order}. {FACE_EMOJIS[c.faceId]} {FACE_NAMES[c.faceId]} —{" "}
                {playerName(c.playerId)}
              </Text>
            ))}
        </View>
      )}

      <Pressable style={styles.btn} onPress={onPlayAgain}>
        <Text style={styles.btnText}>Play Again</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.colors.gold,
      marginBottom: 8,
    },
    titleLoss: {
      color: theme.colors.dangerSoft,
    },
    time: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textMuted,
      marginBottom: 24,
    },
    section: {
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 16,
      marginBottom: 16,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 10,
    },
    rankRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    rankPos: {
      color: theme.colors.gold,
      fontWeight: "700",
      width: 40,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    rankName: {
      color: theme.colors.textLight,
      flex: 1,
      fontWeight: "600",
    },
    rankCount: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    completionRow: {
      color: theme.colors.textLight,
      fontSize: 13,
      marginBottom: 6,
    },
    btn: {
      backgroundColor: theme.colors.moss,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: theme.radius.md,
      marginTop: 8,
    },
    btnText: {
      color: theme.colors.textOnAccent,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
