import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

interface Props {
  emoji: string;
  label: string;
  onDone: () => void;
}

const HOLD_MS = 1400;

export default function BonusFoundOverlay({ emoji, label, onDone }: Props) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 0.8, friction: 3, tension: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1.3, friction: 3, tension: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(onDone);
    }, HOLD_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <Animated.View style={{ transform: [{ scale }], alignItems: "center" }}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{t("bonus.found", { label })}</Text>
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
    backgroundColor: "rgba(22, 36, 31, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#E4C665",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
