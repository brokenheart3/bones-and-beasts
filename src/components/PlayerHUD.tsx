import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";
import { FACE_EMOJIS, Player } from "../types";

interface Props {
  players: Player[];
  currentPlayerIndex: number;
}

export default function PlayerHUD({ players, currentPlayerIndex }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.row}>
      {players.map((p, i) => (
        <View
          key={p.id}
          style={[
            styles.chip,
            { borderColor: p.color },
            i === currentPlayerIndex && { backgroundColor: p.color + "33" },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: p.color }]} />
          <Text style={styles.name} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.target}>{FACE_EMOJIS[p.targetFaceId!]}</Text>
          <Text style={styles.sets}>{p.completedSets.length} 🏆</Text>
        </View>
      ))}
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 5,
    },
    name: {
      color: theme.colors.textLight,
      fontSize: 12,
      fontWeight: "600",
      marginRight: 6,
      maxWidth: 80,
    },
    target: {
      fontSize: 13,
      marginRight: 6,
    },
    sets: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
  });
}
