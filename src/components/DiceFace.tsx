import React from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../theme";
import { FaceId } from "../types";

interface Props {
  value: FaceId;
  size: number;
}

// Each pip is a [col, row] position on a 3x3 grid (0 = start, 1 = middle, 2 = end).
const PIP_POSITIONS: Record<FaceId, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

const GRID_FRACTIONS = [0.22, 0.5, 0.78];

export default function DiceFace({ value, size }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const dotSize = size * 0.16;

  return (
    <View
      style={[
        styles.face,
        {
          width: size,
          height: size,
          borderRadius: size * 0.18,
        },
      ]}
    >
      {PIP_POSITIONS[value].map(([col, row], i) => (
        <View
          key={i}
          style={[
            styles.pip,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              left: size * GRID_FRACTIONS[col] - dotSize / 2,
              top: size * GRID_FRACTIONS[row] - dotSize / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

function getStyles(theme: Theme) {
  // A physical die always looks the same bone-white with dark pips,
  // regardless of the surrounding light/dark theme — so this uses the
  // constant "game piece" tokens (stone/textDark), not the invertible
  // page-text ones.
  return StyleSheet.create({
    face: {
      backgroundColor: theme.colors.stone,
      borderWidth: 2,
      borderColor: theme.colors.stoneShadow,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 6,
    },
    pip: {
      position: "absolute",
      backgroundColor: theme.colors.textDark,
    },
  });
}
