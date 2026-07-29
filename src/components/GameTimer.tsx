import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";
import { formatElapsed } from "../utils/time";

interface Props {
  startedAt: number | null;
  endedAt: number | null;
}

export default function GameTimer({ startedAt, endedAt }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (startedAt === null || endedAt !== null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt, endedAt]);

  if (startedAt === null) return null;

  return (
    <View style={styles.chip}>
      <Text style={styles.text}>⏱ {formatElapsed((endedAt ?? now) - startedAt)}</Text>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    chip: {
      borderWidth: 1.5,
      borderColor: theme.colors.goldSoft,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: "flex-start",
    },
    text: {
      color: theme.colors.goldSoft,
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
