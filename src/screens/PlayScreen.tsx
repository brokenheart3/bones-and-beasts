import React, { useEffect, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../theme";
import { getFaceName } from "../i18n";
import { useGameStore } from "../store/useGameStore";
import { PlayStackParamList } from "../navigation/types";
import GridBoard from "../components/GridBoard";
import ReferenceColumn from "../components/ReferenceColumn";
import SpecialTilesRow from "../components/SpecialTilesRow";
import DiceRollStage from "../components/DiceRollStage";
import SkullPauseOverlay from "../components/SkullPauseOverlay";
import BonusFoundOverlay from "../components/BonusFoundOverlay";
import GameResultOverlay from "../components/GameResultOverlay";
import GameTimer from "../components/GameTimer";
import PlayerHUD from "../components/PlayerHUD";
import EndScreen from "./EndScreen";
import { BONUS_BIG_EMOJI, BONUS_SMALL_EMOJI } from "../types";
import { totalCopiesForFace } from "../utils/gameSetup";

type Props = NativeStackScreenProps<PlayStackParamList, "PlayHome">;

export default function PlayScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const {
    gameId,
    board,
    players,
    currentPlayerIndex,
    targetFaceId,
    phase,
    completions,
    message,
    didLose,
    startedAt,
    endedAt,
    rollForCurrentPlayer,
    flipCard,
    endSkullPause,
    resetGame,
  } = useGameStore();

  // Local play is solo-only (group play is online now), so there's always
  // exactly one roll. The store's phase still flips to "flipping" the
  // instant that roll is registered, but the reveal animation needs to play
  // out first — so "has the roll animation finished" is tracked locally,
  // independent of the store's already-advanced phase. Resetting this when
  // a new game starts (`gameId` bumped only by initGame) is done
  // synchronously during render — the React-endorsed way to reset state in
  // response to a prop/derived change without a flash of stale state.
  const [hasRolled, setHasRolled] = useState(false);
  const [gameIdForRoller, setGameIdForRoller] = useState(gameId);
  if (gameId !== gameIdForRoller) {
    setGameIdForRoller(gameId);
    setHasRolled(false);
  }
  const inRollingStage = players.length > 0 && !hasRolled;

  // The store flips straight to "gameOver" the instant the deciding flip
  // lands, but the player should get a clear, held "you won/lost" beat
  // before the ranking screen replaces the board — so that announcement is
  // gated locally here, same reset-on-new-game pattern as `hasRolled` above.
  const [resultAnnounced, setResultAnnounced] = useState(false);
  const [gameIdForResult, setGameIdForResult] = useState(gameId);
  if (gameId !== gameIdForResult) {
    setGameIdForResult(gameId);
    setResultAnnounced(false);
  }

  // Local play always has the full board's true types available client-side
  // (no fog-of-war needed for a single device), so a bonus tile can be
  // detected right when it's tapped, before even calling flipCard.
  const [bonusPopup, setBonusPopup] = useState<{ emoji: string; label: string } | null>(null);
  const handleFlip = (cardId: string) => {
    const card = board.find((c) => c.id === cardId);
    flipCard(cardId);
    if (card?.type === "bonusSmall") {
      setBonusPopup({ emoji: BONUS_SMALL_EMOJI, label: t("bonus.small") });
    } else if (card?.type === "bonusBig") {
      setBonusPopup({ emoji: BONUS_BIG_EMOJI, label: t("bonus.big") });
    }
  };

  // The win/loss overlay itself shouldn't pop up the instant the board
  // updates, either — the player should get a beat to actually see their
  // last flipped card (and any bonus popup it triggered) first. So it waits
  // for the bonus popup (if any) to clear, then a short pause, before
  // showing.
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    if (phase === "gameOver" && !resultAnnounced && !bonusPopup) {
      const timer = setTimeout(() => setShowResult(true), 900);
      return () => clearTimeout(timer);
    }
    if (phase !== "gameOver") setShowResult(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, resultAnnounced, bonusPopup]);

  if (players.length === 0) {
    return (
      <SafeAreaView style={styles.wrap}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{t("playScreen.noGame")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (inRollingStage) {
    const roller = players[0];
    return (
      <SafeAreaView style={styles.wrap}>
        <DiceRollStage
          key={roller.id}
          playerName={roller.name}
          onRoll={rollForCurrentPlayer}
          onFinished={() => setHasRolled(true)}
        />
      </SafeAreaView>
    );
  }

  const elapsedMs = startedAt !== null ? (endedAt ?? Date.now()) - startedAt : undefined;

  if (phase === "gameOver" && resultAnnounced) {
    return (
      <EndScreen
        players={players}
        completions={completions}
        didLose={didLose}
        elapsedMs={elapsedMs}
        startedAt={startedAt}
        onPlayAgain={() => {
          resetGame();
          navigation.getParent()?.navigate("Home");
        }}
      />
    );
  }

  // Solo has exactly one player, so a completion in the list can only be
  // theirs — its presence is the win signal (didLose and the "board cleared
  // without finishing" fallback both leave completions empty).
  const won = completions.length > 0;
  const wonFaceId = won ? completions[0].faceId : null;

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.content}>
        <View style={styles.hudRow}>
          <View style={styles.hudPlayers}>
            <PlayerHUD players={players} currentPlayerIndex={currentPlayerIndex} />
          </View>
          <GameTimer startedAt={startedAt} endedAt={endedAt} />
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.message}>{message}</Text>
        </View>

        <SpecialTilesRow board={board} />

        <View style={styles.mainRow}>
          <ReferenceColumn
            board={board}
            targetFaceId={targetFaceId}
            collected={players[currentPlayerIndex]?.collected}
          />
          <View style={styles.boardWrap}>
            <GridBoard
              board={board}
              disabled={phase === "skullPause" || phase === "gameOver"}
              onFlip={handleFlip}
            />
          </View>
        </View>
      </View>

      {phase === "skullPause" && (
        <SkullPauseOverlay seconds={5} onDone={endSkullPause} />
      )}

      {bonusPopup && (
        <BonusFoundOverlay
          emoji={bonusPopup.emoji}
          label={bonusPopup.label}
          onDone={() => setBonusPopup(null)}
        />
      )}

      {phase === "gameOver" && !resultAnnounced && showResult && (
        <GameResultOverlay
          won={won}
          cardName={wonFaceId ? getFaceName(wonFaceId) : undefined}
          cardCount={wonFaceId ? totalCopiesForFace(board, wonFaceId) : undefined}
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
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 15,
      textAlign: "center",
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
    mainRow: {
      flex: 1,
      flexDirection: "row",
    },
    boardWrap: {
      flex: 1,
    },
  });
}
