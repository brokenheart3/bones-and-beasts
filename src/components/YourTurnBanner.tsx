import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

interface Props {
  onDone: () => void;
}

const HOLD_MS = 1500;

// Same non-blocking top-banner pattern as PlayerFinishedBanner, but shown
// only to the one player whose turn just started — easy to miss that it
// became your turn if you were watching someone else's longer turn play
// out (a chain of matches/a bonus) rather than the message box text.
export default function YourTurnBanner({ onDone }: Props) {
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDone);
    }, HOLD_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <Text style={styles.text}>{t("yourTurn.banner")}</Text>
    </Animated.View>
  );
}

// Fixed literals, matching the other always-dark toast/overlay components.
const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    // Sits below PlayerFinishedBanner's position — the two can legitimately
    // fire together, since a player completing their set often means it's
    // immediately the next player's turn.
    top: 56,
    alignSelf: "center",
    backgroundColor: "#C9A227",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    zIndex: 5,
  },
  text: {
    color: "#16241F",
    fontSize: 15,
    fontWeight: "800",
  },
});
