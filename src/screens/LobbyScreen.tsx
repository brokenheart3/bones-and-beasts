import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Room } from "colyseus.js";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../theme";
import { joinBeastsRoom } from "../net/colyseusClient";
import { useBeastsRoom } from "../net/useBeastsRoom";
import { PlayStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<PlayStackParamList, "Lobby">;

export default function LobbyScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { playerName } = route.params;
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handedOff = useRef(false);
  const snapshot = useBeastsRoom(room);

  useEffect(() => {
    let cancelled = false;
    joinBeastsRoom(playerName)
      .then((r) => {
        if (cancelled) {
          r.leave();
          return;
        }
        setRoom(r);
      })
      .catch((err) => setError(err?.message ?? t("lobby.couldNotReachServer")));

    return () => {
      cancelled = true;
    };
  }, [playerName]);

  useEffect(() => {
    if (!room || !snapshot || handedOff.current) return;
    if (snapshot.phase !== "waiting" && snapshot.phase !== "countdown") {
      handedOff.current = true;
      navigation.replace("OnlineGame", { room });
    }
  }, [room, snapshot, navigation]);

  const leave = () => {
    room?.leave();
    navigation.goBack();
  };

  if (error) {
    return (
      <SafeAreaView style={styles.wrap}>
        <Text style={styles.title}>{t("lobby.couldntConnect")}</Text>
        <Text style={styles.subtitle}>{error}</Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>{t("common.back")}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <Text style={styles.title}>{t("lobby.findingGroup")}</Text>

      {!snapshot ? (
        <ActivityIndicator color={theme.colors.gold} size="large" />
      ) : (
        <>
          <Text style={styles.subtitle}>{snapshot.message}</Text>

          {snapshot.phase === "countdown" && snapshot.countdown >= 0 && (
            <Text style={styles.countdown}>{snapshot.countdown}</Text>
          )}

          <View style={styles.playerList}>
            {snapshot.players.map((p) => (
              <View key={p.id} style={styles.playerRow}>
                <View style={[styles.dot, { backgroundColor: p.color }]} />
                <Text style={styles.playerName}>{p.name}</Text>
                {p.id === room?.sessionId && <Text style={styles.you}>{t("lobby.you")}</Text>}
              </View>
            ))}
            {Array.from({ length: Math.max(0, 2 - snapshot.players.length) }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.playerRow}>
                <View style={[styles.dot, styles.dotEmpty]} />
                <Text style={styles.waitingText}>{t("lobby.waitingForPlayer")}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Pressable style={styles.cancelBtn} onPress={leave}>
        <Text style={styles.cancelText}>{t("lobby.cancel")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.gold,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginBottom: 20,
    },
    countdown: {
      fontSize: 56,
      fontWeight: "800",
      color: theme.colors.gold,
      marginBottom: 20,
    },
    playerList: {
      width: "100%",
      maxWidth: 400,
      alignSelf: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 16,
      marginBottom: 28,
    },
    playerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
    },
    dotEmpty: {
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.textMuted,
    },
    playerName: {
      color: theme.colors.textLight,
      fontWeight: "600",
      fontSize: 14,
    },
    you: {
      color: theme.colors.gold,
      fontSize: 12,
      marginLeft: 6,
    },
    waitingText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontStyle: "italic",
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    cancelText: {
      color: theme.colors.dangerSoft,
      fontSize: 14,
      fontWeight: "600",
    },
    btn: {
      backgroundColor: theme.colors.moss,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: theme.radius.md,
      marginTop: 16,
    },
    btnText: {
      color: theme.colors.textOnAccent,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
