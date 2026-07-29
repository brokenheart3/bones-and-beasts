import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";
import {
  BONUS_BIG_EMOJI,
  BONUS_SMALL_EMOJI,
  CardModel,
  FACE_EMOJIS,
  SKULL_EMOJI,
} from "../types";

interface Props {
  card: CardModel;
  number: number;
  width: number;
  height: number;
  disabled: boolean;
  onPress: (id: string) => void;
}

export default function Card({ card, number, width, height, disabled, onPress }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const flip = useRef(new Animated.Value(card.revealed ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(flip, {
      toValue: card.revealed ? 1 : 0,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [card.revealed]);

  const frontRotate = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const frontOpacity = flip.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flip.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const glyph =
    card.type === "skull"
      ? SKULL_EMOJI
      : card.type === "bonusSmall"
      ? BONUS_SMALL_EMOJI
      : card.type === "bonusBig"
      ? BONUS_BIG_EMOJI
      : FACE_EMOJIS[card.faceId!];
  const isBonus = card.type === "bonusSmall" || card.type === "bonusBig";
  const glyphSize = Math.min(width, height) * 0.6;
  const numberSize = Math.min(width, height) * 0.32;

  return (
    <Pressable
      testID={`card-${card.id}`}
      style={[styles.wrap, { width, height }]}
      disabled={disabled || card.revealed}
      onPress={() => onPress(card.id)}
    >
      <Animated.View
        style={[
          styles.face,
          styles.back,
          { opacity: frontOpacity, transform: [{ rotateY: frontRotate }] },
        ]}
      >
        <Text style={[styles.number, { fontSize: numberSize }]}>{number}</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.face,
          styles.front,
          card.type === "skull" && styles.frontDanger,
          isBonus && styles.frontBonus,
          { opacity: backOpacity, transform: [{ rotateY: backRotate }] },
        ]}
      >
        <Text style={{ fontSize: glyphSize }}>{glyph}</Text>
      </Animated.View>
    </Pressable>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      margin: 3,
    },
    face: {
      position: "absolute",
      width: "100%",
      height: "100%",
      borderRadius: theme.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backfaceVisibility: "hidden",
    },
    back: {
      backgroundColor: theme.colors.stoneBack,
      borderWidth: 1,
      borderColor: theme.colors.stoneBackBorder,
    },
    front: {
      backgroundColor: theme.colors.stone,
      borderWidth: 1,
      borderColor: theme.colors.stoneShadow,
    },
    frontDanger: {
      backgroundColor: theme.colors.dangerTileBg,
      borderColor: theme.colors.danger,
    },
    frontBonus: {
      backgroundColor: theme.colors.bonusTileBg,
      borderColor: theme.colors.gold,
    },
    number: {
      fontWeight: "700",
      color: theme.colors.moss,
    },
  });
}
