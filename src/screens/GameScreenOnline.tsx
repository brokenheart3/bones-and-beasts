import React, { useEffect, useRef, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Theme, useTheme } from "../theme";
import { useBeastsRoom } from "../net/useBeastsRoom";
import { PlayStackParamList } from "../navigation/types";
import GridBoard from "../components/GridBoard";
import ReferenceColumn, { ReferenceTotals } from "../components/ReferenceColumn";
import DiceFace from "../components/DiceFace";
import PlayerHUD from "../components/PlayerHUD";
import BonusFoundOverlay from "../components/BonusFoundOverlay";
import GameResultOverlay from "../components/GameResultOverlay";
import GameTimer from "../components/GameTimer";
import EndScreen from "./EndScreen";
import {
  BONUS_BIG_EMOJI,
  BONUS_SMALL_EMOJI,
  CardModel,
  CardType,
  FaceId,
  FACE_NAMES,
  Player,
  SetCompletion,
} from "../types";
import { OnlineCard, OnlineCompletion, OnlinePlayer, OnlineSnapshot } from "../types/online";

type Props = NativeStackScreenProps<PlayStackParamList, "OnlineGame">;

// Fixed by BeastsRoom.ts's buildDeck() (not randomized), so these are safe
// to hardcode here rather than sync over the wire.
const ONLINE_SKULL_TOTAL = 3;
const ONLINE_BONUS_SMALL_TOTAL = 2;
const ONLINE_BONUS_BIG_TOTAL = 1;

function toTotals(snapshot: OnlineSnapshot): ReferenceTotals {
  const faces: Partial<Record<FaceId, number>> = {};
  (Object.keys(snapshot.faceTotals) as string[]).forEach((k) => {
    faces[Number(k) as FaceId] = snapshot.faceTotals[k];
  });
  return {
    skull: ONLINE_SKULL_TOTAL,
    bonusSmall: ONLINE_BONUS_SMALL_TOTAL,
    bonusBig: ONLINE_BONUS_BIG_TOTAL,
    faces,
  };
}

function toCompletion(c: OnlineCompletion): SetCompletion {
  return { faceId: c.faceId as FaceId, playerId: c.playerId, order: c.order };
}

function toCardModel(c: OnlineCard): CardModel {
  return {
    id: c.id,
    type: c.revealed ? (c.cardType as CardType) : "face",
    faceId: c.revealed && c.cardType === "face" ? (c.faceId as FaceId) : undefined,
    revealed: c.revealed,
  };
}

// The ported-as-is online server uses a shared, per-turn target rather than
// this app's local per-player fixed target, so there's no per-player
// targetFaceId to carry over — left null (PlayerHUD's target chip just
// renders blank for online games, a known gap from porting the rules as-is).
function toPlayer(p: OnlinePlayer): Player {
  const collected: Record<FaceId, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  (Object.keys(p.collected) as string[]).forEach((k) => {
    collected[Number(k) as FaceId] = p.collected[k];
  });
  return {
    id: p.id,
    name: p.name + (p.connected ? "" : " (left)"),
    color: p.color,
    targetFaceId: null,
    collected,
    completedSets: p.completedSets as FaceId[],
    skipNextTurn: p.skipNextTurn,
  };
}

export default function GameScreenOnline({ route, navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { room } = route.params;
  const snapshot = useBeastsRoom(room);

  // Online tiles hide their true type until revealed (fog of war), so unlike
  // local play we can't know a bonus was found until the server's synced
  // update arrives — detected here by diffing which card IDs just became
  // revealed. Gated on `isMyTurn` so only the player who actually flipped it
  // sees "You found X" (a bonus never changes whose turn it is, so this
  // reliably identifies the flipper, not a passive watcher).
  const [bonusPopup, setBonusPopup] = useState<{ emoji: string; label: string } | null>(null);
  const prevRevealedIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!snapshot) return;
    const newlyRevealed = snapshot.board.filter(
      (c) => c.revealed && !prevRevealedIds.current.has(c.id)
    );
    prevRevealedIds.current = new Set(snapshot.board.filter((c) => c.revealed).map((c) => c.id));

    const isMyTurnNow = snapshot.turnOrder[snapshot.currentPlayerIndex] === room.sessionId;
    const bonus = newlyRevealed.find(
      (c) => c.cardType === "bonusSmall" || c.cardType === "bonusBig"
    );
    if (bonus && isMyTurnNow) {
      setBonusPopup(
        bonus.cardType === "bonusSmall"
          ? { emoji: BONUS_SMALL_EMOJI, label: "a Bonus Gem" }
          : { emoji: BONUS_BIG_EMOJI, label: "an Ancient Idol" }
      );
    }
  }, [snapshot, room.sessionId]);

  const exitToHome = () => {
    room.leave();
    navigation.getParent()?.navigate("Home");
  };

  // Held "you won/lost" beat before the ranking screen, same as Solo — a
  // fresh room/component instance is created per game (see LobbyScreen's
  // `navigation.replace`), so a plain mount-scoped flag is enough here,
  // unlike Solo's PlayScreen which persists across games and needs a
  // gameId-keyed reset.
  const [resultAnnounced, setResultAnnounced] = useState(false);

  // Same delayed-reveal treatment as Solo: let the player see the final
  // flipped card (and any bonus popup it triggered) before the win/loss
  // overlay covers the board.
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    if (snapshot?.phase === "gameOver" && !resultAnnounced && !bonusPopup) {
      const timer = setTimeout(() => setShowResult(true), 900);
      return () => clearTimeout(timer);
    }
    if (snapshot?.phase !== "gameOver") setShowResult(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.phase, resultAnnounced, bonusPopup]);

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.wrap}>
        <Text style={styles.message}>Connecting...</Text>
      </SafeAreaView>
    );
  }

  // Group has no shared win/lose binary (the game ends once all 6 sets are
  // done by anyone), so "did I personally win" is judged from my own
  // completion entry, if any — mirrors Solo's framing from each player's
  // own point of view.
  const myCompletion = snapshot.completions.find((c) => c.playerId === room.sessionId);
  const elapsedMs =
    snapshot.startedAt !== null ? (snapshot.endedAt ?? Date.now()) - snapshot.startedAt : undefined;

  if (snapshot.phase === "gameOver" && resultAnnounced) {
    return (
      <EndScreen
        players={snapshot.turnOrder
          .map((id) => snapshot.players.find((p) => p.id === id))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map(toPlayer)}
        completions={snapshot.completions.map(toCompletion)}
        elapsedMs={elapsedMs}
        onPlayAgain={exitToHome}
      />
    );
  }

  const orderedPlayers = snapshot.turnOrder
    .map((id) => snapshot.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map(toPlayer);

  const board = snapshot.board.map(toCardModel);
  const isMyTurn = snapshot.turnOrder[snapshot.currentPlayerIndex] === room.sessionId;
  const canRoll = isMyTurn && snapshot.phase === "rolling";

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.content}>
        <View style={styles.hudRow}>
          <View style={styles.hudPlayers}>
            <PlayerHUD players={orderedPlayers} currentPlayerIndex={snapshot.currentPlayerIndex} />
          </View>
          <GameTimer startedAt={snapshot.startedAt} endedAt={snapshot.endedAt} />
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.message}>{snapshot.message}</Text>
          {!isMyTurn && <Text style={styles.waitingNote}>Waiting for their move...</Text>}
        </View>

        <View style={styles.diceRow}>
          <Pressable
            style={[styles.diceBtn, !canRoll && styles.diceBtnDisabled]}
            disabled={!canRoll}
            onPress={() => room.send("rollDice")}
          >
            <DiceFace value={snapshot.diceValue ? (snapshot.diceValue as FaceId) : 1} size={48} />
            <Text style={styles.diceLabel}>{canRoll ? "Roll" : "Rolled"}</Text>
          </Pressable>
        </View>

        <View style={styles.mainRow}>
          <ReferenceColumn
            board={board}
            targetFaceId={snapshot.targetFaceId ? (snapshot.targetFaceId as FaceId) : null}
            totals={toTotals(snapshot)}
            collected={orderedPlayers[snapshot.currentPlayerIndex]?.collected}
          />
          <View style={styles.boardWrap}>
            <GridBoard
              board={board}
              disabled={!isMyTurn || snapshot.phase !== "flipping"}
              onFlip={(id) => room.send("flipCard", { cardId: id })}
            />
          </View>
        </View>
      </View>

      {bonusPopup && (
        <BonusFoundOverlay
          emoji={bonusPopup.emoji}
          label={bonusPopup.label}
          onDone={() => setBonusPopup(null)}
        />
      )}

      {snapshot.phase === "gameOver" && !resultAnnounced && showResult && (
        <GameResultOverlay
          won={!!myCompletion}
          cardName={myCompletion ? FACE_NAMES[myCompletion.faceId as FaceId] : undefined}
          cardCount={myCompletion ? snapshot.faceTotals[String(myCompletion.faceId)] : undefined}
          elapsedMs={elapsedMs}
          onDone={() => setResultAnnounced(true)}
        />
      )}
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      width: "100%",
      maxWidth: 820,
      alignSelf: "center",
      padding: 12,
    },
    hudRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
    },
    hudPlayers: {
      flex: 1,
    },
    messageBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.sm,
      padding: 10,
      marginBottom: 10,
    },
    message: {
      color: theme.colors.textLight,
      fontSize: 13,
      textAlign: "center",
    },
    waitingNote: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: "center",
      marginTop: 4,
      fontStyle: "italic",
    },
    diceRow: {
      alignItems: "center",
      marginBottom: 10,
    },
    diceBtn: {
      alignItems: "center",
    },
    diceBtnDisabled: {
      opacity: 0.6,
    },
    diceLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.goldSoft,
      marginTop: 6,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    mainRow: {
      flex: 1,
      flexDirection: "row",
    },
    boardWrap: {
      flex: 1,
    },
  });
}
