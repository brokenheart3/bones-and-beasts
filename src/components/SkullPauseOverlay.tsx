import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SKULL_EMOJI } from "../types";

interface Props {
  seconds: number;
  onDone: () => void;
}

export default function SkullPauseOverlay({ seconds, onDone }: Props) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    let current = seconds;
    setRemaining(current);
    const interval = setInterval(() => {
      current -= 1;
      setRemaining(current);
      if (current <= 0) {
        clearInterval(interval);
        onDone();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.overlay}>
      <Text style={styles.skull}>{SKULL_EMOJI}</Text>
      <Text style={styles.title}>{t("skullPause.title")}</Text>
      <Text style={styles.count}>{Math.max(remaining, 0)}</Text>
    </View>
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
    zIndex: 2,
  },
  skull: {
    fontSize: 44,
    marginBottom: 8,
  },
  title: {
    color: "#C97A7A",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  count: {
    fontSize: 64,
    fontWeight: "800",
    color: "#F4EFDE",
  },
});
