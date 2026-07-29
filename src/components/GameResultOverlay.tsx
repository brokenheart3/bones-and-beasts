import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { formatElapsed } from "../utils/time";

interface Props {
  won: boolean;
  cardName?: string;
  cardCount?: number;
  elapsedMs?: number;
  onDone: () => void;
}

const HOLD_MS = 5000;

export default function GameResultOverlay({ won, cardName, cardCount, elapsedMs, onDone }: Props) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 0.8, friction: 3, tension: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1.2, friction: 3, tension: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(onDone);
    }, HOLD_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emoji = won ? "🏆" : "💀";
  const title = won
    ? `You found all ${cardCount ?? 6} ${cardName} cards!`
    : "You Lost!";

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <Animated.View style={{ transform: [{ scale }], alignItems: "center" }}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.title, !won && styles.titleLoss]}>{title}</Text>
        {elapsedMs != null && <Text style={styles.time}>⏱ {formatElapsed(elapsedMs)}</Text>}
      </Animated.View>
    </Animated.View>
  );
}

// This overlay always dims to the same night-temple backdrop regardless of
// the app's light/dark setting, so its colors are fixed literals rather
// than theme tokens (which would otherwise go dark-on-dark in light mode).
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(22, 36, 31, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#E4C665",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  titleLoss: {
    color: "#C97A7A",
  },
  time: {
    fontSize: 15,
    fontWeight: "600",
    color: "#B9C6BC",
    marginTop: 10,
  },
});
