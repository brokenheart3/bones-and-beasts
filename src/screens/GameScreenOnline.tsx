import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../theme";
import i18n, { getFaceName } from "../i18n";
import { useBeastsRoom } from "../net/useBeastsRoom";
import { useStatsStore } from "../store/useStatsStore";
import { PlayStackParamList } from "../navigation/types";
import GridBoard from "../components/GridBoard";
import ReferenceColumn, { ReferenceTotals } from "../components/ReferenceColumn";
import SpecialTilesRow from "../components/SpecialTilesRow";
import DiceFace from "../components/DiceFace";
import OnlineDiceRollStage from "../components/OnlineDiceRollStage";
import PlayerHUD from "../components/PlayerHUD";
import BonusFoundOverlay from "../components/BonusFoundOverlay";
import SkullPauseOverlay from "../components/SkullPauseOverlay";
import PlayerFinishedBanner from "../components/PlayerFinishedBanner";
import YourTurnBanner from "../components/YourTurnBanner";
import GameTimer from "../components/GameTimer";
import EndScreen from "./EndScreen";
import {
  BONUS_BIG_EMOJI,
  BONUS_SMALL_EMOJI,
  CardModel,
  CardType,
  FaceId,
  FACE_EMOJIS,
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
  return { faceId: c.faceId as FaceId, playerId: c.playerId, order: c.order, finishedAt: c.finishedAt };
}

function toCardModel(c: OnlineCard): CardModel {
  return {
    id: c.id,
    type: c.revealed ? (c.cardType as CardType) : "face",
    faceId: c.revealed && c.cardType === "face" ? (c.faceId as FaceId) : undefined,
    revealed: c.revealed,
  };
}

function toPlayer(p: OnlinePlayer): Player {
  const collected: Record<FaceId, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  (Object.keys(p.collected) as string[]).forEach((k) => {
    collected[Number(k) as FaceId] = p.collected[k];
  });
  return {
    id: p.id,
    name: p.connected ? p.name : i18n.t("gameOnline.disconnectedName", { name: p.name }),
    color: p.color,
    targetFaceId: p.targetFaceId ? (p.targetFaceId as FaceId) : null,
    collected,
    completedSets: p.completedSets as FaceId[],
    skipNextTurn: p.skipNextTurn,
  };
}

export default function GameScreenOnline({ route, navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { room } = route.params;
  const snapshot = useBeastsRoom(room);

  // The server assigns this player's target AND advances currentPlayerIndex
  // to the next roller in the very same update — so `isMyTurn` already flips
  // false the instant the roll resolves, before the reveal animation has
  // even started. `rollingInProgress` tracks "I'm mid-animation" independent
  // of whose turn it currently is, so the dice stage stays mounted (rather
  // than getting yanked to "Waiting") until the animation actually finishes,
  // at which point `rollAnimDone` switches it over to the static result text.
  const [rollingInProgress, setRollingInProgress] = useState(false);
  const [rollAnimDone, setRollAnimDone] = useState(false);

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
          ? { emoji: BONUS_SMALL_EMOJI, label: t("bonus.small") }
          : { emoji: BONUS_BIG_EMOJI, label: t("bonus.big") }
      );
    }
  }, [snapshot, room.sessionId]);

  // Once someone finishes, they stop taking turns for the rest of the game
  // — obvious in hindsight from the message log, but easy to miss live,
  // which then makes the remaining player(s) correctly playing every turn
  // afterward look like a turn-order bug. This surfaces it as an
  // unmissable banner for everyone the instant it happens, regardless of
  // whose turn it currently is.
  const [finishBanner, setFinishBanner] = useState<{
    name: string;
    faceName: string;
    place: number;
    remaining: number;
  } | null>(null);
  const prevCompletionsCount = useRef(0);
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.completions.length > prevCompletionsCount.current) {
      const latest = snapshot.completions[snapshot.completions.length - 1];
      const finisher = snapshot.players.find((p) => p.id === latest.playerId);
      const remaining = snapshot.turnOrder.length - snapshot.completions.length;
      setFinishBanner({
        name: finisher?.name ?? t("gameOnline.aPlayer"),
        faceName: getFaceName(latest.faceId as FaceId),
        place: latest.order,
        remaining,
      });
    }
    prevCompletionsCount.current = snapshot.completions.length;
  }, [snapshot]);

  // Personal cue for whoever's turn just started — easy to miss that it
  // became your turn if you were watching someone else's longer turn play
  // out (a chain of matches) rather than reading the message box text.
  const [showYourTurn, setShowYourTurn] = useState(false);
  const prevIsMyTurnRef = useRef(false);
  useEffect(() => {
    if (!snapshot) return;
    const isMyTurnNow =
      snapshot.phase === "flipping" && snapshot.turnOrder[snapshot.currentPlayerIndex] === room.sessionId;
    if (isMyTurnNow && !prevIsMyTurnRef.current) {
      setShowYourTurn(true);
    }
    prevIsMyTurnRef.current = isMyTurnNow;
  }, [snapshot, room.sessionId]);

  // Record the game to this device's local Stats history the moment it
  // ends — every client in the room does this independently (each seeing
  // the same synced completions/players), the same way Solo already logs
  // to useStatsStore. Guarded by a ref rather than resultAnnounced so it
  // fires once immediately on gameOver, not gated behind the win/loss
  // banner the player has to watch first.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!snapshot || snapshot.phase !== "gameOver" || recordedRef.current) return;
    recordedRef.current = true;
    const players = snapshot.turnOrder
      .map((id) => snapshot.players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map(toPlayer);
    const completions = snapshot.completions.map(toCompletion);
    useStatsStore
      .getState()
      .recordGame(players, completions, room.sessionId, snapshot.startedAt, snapshot.endedAt);
  }, [snapshot]);

  const exitToHome = () => {
    room.leave();
    navigation.getParent()?.navigate("Home");
  };

  // A fresh room/component instance is created per game (see LobbyScreen's
  // `navigation.replace`), so a plain mount-scoped flag is enough here,
  // unlike Solo's PlayScreen which persists across games and needs a
  // gameId-keyed reset.
  //
  // Unlike Solo, Group doesn't show a "You found all 6 X cards!" win banner
  // first — with several players finishing at different times, a personal
  // win banner read as a whole-game announcement it wasn't. Still holds a
  // short beat after the deciding flip (and any bonus popup it triggered)
  // before switching to the ranking screen, so that flip stays visible.
  const [resultAnnounced, setResultAnnounced] = useState(false);
  useEffect(() => {
    if (snapshot?.phase === "gameOver" && !resultAnnounced && !bonusPopup) {
      const timer = setTimeout(() => setResultAnnounced(true), 900);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.phase, resultAnnounced, bonusPopup]);

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.wrap}>
        <Text style={styles.message}>{t("gameOnline.connecting")}</Text>
      </SafeAreaView>
    );
  }

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
        startedAt={snapshot.startedAt}
        onPlayAgain={exitToHome}
      />
    );
  }

  const orderedPlayers = snapshot.turnOrder
    .map((id) => snapshot.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map(toPlayer);

  const myPlayer = orderedPlayers.find((p) => p.id === room.sessionId);
  const isMyTurn = snapshot.turnOrder[snapshot.currentPlayerIndex] === room.sessionId;

  // Everyone rolls once at the start to lock in a fixed personal target
  // (like Solo) — a separate stage from the main board, with no dice
  // visible again for the rest of the game once everyone's rolled.
  //
  // Also stay on this stage while `rollingInProgress` even after the server
  // has already moved on to "flipping": when the LAST player rolls, the
  // very same update that assigns their target also flips the whole game's
  // phase to "flipping" — without this, that player's own roll animation
  // would get unmounted mid-spin the instant their result arrives, since
  // the phase check below would already be false.
  if (snapshot.phase === "rolling" || rollingInProgress) {
    return (
      <SafeAreaView style={styles.wrap}>
        <View style={styles.content}>
          <PlayerHUD players={orderedPlayers} currentPlayerIndex={snapshot.currentPlayerIndex} />

          <View style={styles.messageBox}>
            <Text style={styles.message}>{snapshot.message}</Text>
          </View>

          <View style={styles.rollingCenter}>
            {myPlayer?.targetFaceId && rollAnimDone ? (
              <Text style={styles.rollingLabel}>
                {t("gameOnline.huntingFor", {
                  emoji: FACE_EMOJIS[myPlayer.targetFaceId],
                  faceName: getFaceName(myPlayer.targetFaceId),
                })}
              </Text>
            ) : rollingInProgress || isMyTurn ? (
              <OnlineDiceRollStage
                playerName={myPlayer?.name ?? t("common.you")}
                onRoll={() => {
                  setRollingInProgress(true);
                  room.send("rollDice");
                }}
                resultFace={myPlayer?.targetFaceId ? (myPlayer.targetFaceId as FaceId) : null}
                onFinished={() => {
                  setRollingInProgress(false);
                  setRollAnimDone(true);
                }}
              />
            ) : (
              <View style={styles.diceBtn}>
                <DiceFace value={1} size={96} />
                <Text style={styles.diceLabel}>{t("gameOnline.waiting")}</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const board = snapshot.board.map(toCardModel);

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
          {!isMyTurn && <Text style={styles.waitingNote}>{t("gameOnline.waitingForMove")}</Text>}
        </View>

        <SpecialTilesRow board={board} totals={toTotals(snapshot)} />

        <View style={styles.mainRow}>
          <ReferenceColumn
            board={board}
            targetFaceId={myPlayer?.targetFaceId ?? null}
            totals={toTotals(snapshot)}
            collected={myPlayer?.collected}
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

      {finishBanner && (
        <PlayerFinishedBanner
          playerName={finishBanner.name}
          faceName={finishBanner.faceName}
          place={finishBanner.place}
          remaining={finishBanner.remaining}
          onDone={() => setFinishBanner(null)}
        />
      )}

      {showYourTurn && <YourTurnBanner onDone={() => setShowYourTurn(false)} />}

      {snapshot.phase === "skullPause" && (
        <SkullPauseOverlay seconds={5} onDone={() => {}} />
      )}

      {bonusPopup && (
        <BonusFoundOverlay
          emoji={bonusPopup.emoji}
          label={bonusPopup.label}
          onDone={() => setBonusPopup(null)}
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
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
    },
    waitingNote: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: "center",
      marginTop: 4,
      fontStyle: "italic",
    },
    rollingCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    rollingLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textLight,
      textAlign: "center",
      paddingHorizontal: 24,
    },
    diceBtn: {
      alignItems: "center",
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
