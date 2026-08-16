import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../theme";
import { BONUS_BIG_EMOJI, BONUS_SMALL_EMOJI, CardModel, SKULL_EMOJI } from "../types";

// Same skull/bonus totals shape as ReferenceColumn.ReferenceTotals — kept as
// a separate, narrower type here since this row only ever needs these three
// fields, not the per-face totals too.
export interface SpecialTilesTotals {
  skull: number;
  bonusSmall: number;
  bonusBig: number;
}

interface Props {
  board: CardModel[];
  totals?: SpecialTilesTotals;
}

function countOf(board: CardModel[], type: CardModel["type"]) {
  return board.filter((c) => c.type === type).length;
}

// A horizontal strip above the board for the skull/bonus counters — split
// out of ReferenceColumn (which now only holds the per-face target list) so
// it can sit above or below the grid instead of competing for space in the
// narrow side column.
export default function SpecialTilesRow({ board, totals }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const foundSkulls = board.filter((c) => c.type === "skull" && c.revealed).length;
  const totalSkulls = totals?.skull ?? countOf(board, "skull");
  const foundBonusSmall = board.filter((c) => c.type === "bonusSmall" && c.revealed).length;
  const totalBonusSmall = totals?.bonusSmall ?? countOf(board, "bonusSmall");
  const foundBonusBig = board.filter((c) => c.type === "bonusBig" && c.revealed).length;
  const totalBonusBig = totals?.bonusBig ?? countOf(board, "bonusBig");

  return (
    <View style={styles.row}>
      <View style={styles.dangerBox}>
        <Text style={styles.glyph}>{SKULL_EMOJI}</Text>
        <Text style={styles.dangerLabel}>
          {t("specialTiles.traps", { found: foundSkulls, total: totalSkulls })}
        </Text>
      </View>

      <View style={styles.bonusBox}>
        <Text style={styles.glyph}>{BONUS_SMALL_EMOJI}</Text>
        <Text style={styles.bonusLabel}>
          {t("specialTiles.gems", { found: foundBonusSmall, total: totalBonusSmall })}
        </Text>
      </View>

      <View style={styles.bonusBox}>
        <Text style={styles.glyph}>{BONUS_BIG_EMOJI}</Text>
        <Text style={styles.bonusLabel}>
          {t("specialTiles.idols", { found: foundBonusBig, total: totalBonusBig })}
        </Text>
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },
    dangerBox: {
      flex: 1,
      alignItems: "center",
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.sm,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.danger,
    },
    bonusBox: {
      flex: 1,
      alignItems: "center",
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.sm,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.gold,
    },
    glyph: { fontSize: 18 },
    dangerLabel: {
      fontSize: 10,
      color: theme.colors.dangerSoft,
      marginTop: 2,
      textAlign: "center",
    },
    bonusLabel: {
      fontSize: 10,
      color: theme.colors.goldSoft,
      marginTop: 2,
      textAlign: "center",
    },
  });
}
