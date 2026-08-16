import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

interface Props {
  playerName: string;
  faceName: string;
  place: number;
  remaining: number;
  onDone: () => void;
}

const HOLD_MS = 2600;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// A non-blocking banner (unlike BonusFoundOverlay/SkullPauseOverlay, which
// dim and cover the whole board) — this can fire for ANY player's
// completion at any moment, including while someone else is mid-turn, so it
// shouldn't interrupt board interaction underneath it.
export default function PlayerFinishedBanner({ playerName, faceName, place, remaining, onDone }: Props) {
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(onDone);
    }, HOLD_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, { opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.text}>
        {t("playerFinished.banner", {
          playerName,
          place: ordinal(place),
          status:
            remaining > 0
              ? t("playerFinished.othersRemaining", { count: remaining })
              : t("playerFinished.everyoneDone"),
        })}
      </Text>
    </Animated.View>
  );
}

// Fixed dark/gold literals rather than theme tokens, matching the other
// always-dark overlays (BonusFoundOverlay, SkullPauseOverlay) — this reads
// as a temporary toast over the board, not part of the invertible page chrome.
const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    backgroundColor: "rgba(22, 36, 31, 0.95)",
    borderWidth: 1,
    borderColor: "#E4C665",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 4,
  },
  text: {
    color: "#F4EFDE",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
