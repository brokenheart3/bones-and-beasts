import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";
import { totalCopiesForFace } from "../utils/gameSetup";
import { CardModel, FACE_EMOJIS, FACE_IDS, FaceId } from "../types";

// Local play always has the full board client-side, so totals can be
// derived by counting it directly. Online play deliberately hides each
// unrevealed tile's true type from clients (fog of war — otherwise you
// could peek at what's under any tile before flipping it), so counting the
// board there would only see whatever's been revealed so far, not the real
// totals. `totals` lets a caller (GameScreenOnline) supply the real
// server-synced numbers instead of relying on board-derived counts.
export interface ReferenceTotals {
  skull: number;
  bonusSmall: number;
  bonusBig: number;
  faces: Partial<Record<FaceId, number>>;
}

interface Props {
  board: CardModel[];
  targetFaceId: FaceId | null;
  totals?: ReferenceTotals;
  // The current turn-holder's collected counts. Bonus tiles (and, in online
  // Group, banked wrong-face flips) credit a player without necessarily
  // revealing a matching real tile, so counting the board alone can under-
  // report progress — the displayed count is whichever is higher.
  collected?: Record<FaceId, number>;
}

export default function ReferenceColumn({ board, targetFaceId, totals, collected }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.wrap}>
      {FACE_IDS.map((faceId) => {
        const revealedCount = board.filter(
          (c) => c.type === "face" && c.faceId === faceId && c.revealed
        ).length;
        const foundCount = collected ? Math.max(revealedCount, collected[faceId] ?? 0) : revealedCount;
        const total = totals?.faces[faceId] ?? totalCopiesForFace(board, faceId);
        const isTarget = targetFaceId === faceId;
        return (
          <View
            key={faceId}
            style={[styles.item, isTarget && styles.itemActive]}
          >
            <Text style={styles.num}>{faceId}</Text>
            <Text style={styles.itemGlyph}>{FACE_EMOJIS[faceId]}</Text>
            <Text style={styles.count}>
              {foundCount}/{total}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      width: 64,
      justifyContent: "flex-start",
    },
    item: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.sm,
      paddingVertical: 6,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: theme.colors.surfaceAlt,
    },
    itemActive: {
      borderColor: theme.colors.gold,
      backgroundColor: theme.colors.accentTint,
    },
    num: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
    itemGlyph: {
      fontSize: 20,
      marginVertical: 1,
    },
    count: {
      fontSize: 9,
      color: theme.colors.textLight,
    },
  });
}
