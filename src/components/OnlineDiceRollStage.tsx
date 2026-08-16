import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme, useTheme } from "../theme";
import { getFaceName } from "../i18n";
import { FaceId, FACE_EMOJIS } from "../types";
import DiceFace from "./DiceFace";

// Same spin/settle/reveal animation as DiceRollStage (Solo), adapted for the
// online case: Solo's onRoll() returns the target face synchronously (it's
// computed locally), but here the real value only arrives later from the
// server over the network — so instead of a fixed-duration spin followed by
// an already-known result, this spins until BOTH a minimum time has passed
// (so it always reads as an intentional roll, not an instant snap) AND the
// server's real value has actually arrived via `resultFace`.
interface Props {
  playerName: string;
  onRoll: () => void;
  resultFace: FaceId | null;
  onFinished: () => void;
}

type Stage = "idle" | "rolling" | "revealing";

const IDLE_DICE_SIZE = 96;
const BIG_DICE_SIZE = 150;
const BIG_DICE_START_SCALE = IDLE_DICE_SIZE / BIG_DICE_SIZE;

const MIN_SPIN_MS = 1000;
const REVEAL_HOLD_MS = 1000;

export default function OnlineDiceRollStage({ playerName, onRoll, resultFace, onFinished }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("idle");
  const [displayFace, setDisplayFace] = useState<FaceId>(1);
  const [revealFace, setRevealFace] = useState<FaceId | null>(null);
  const [minSpinDone, setMinSpinDone] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const diceScale = useRef(new Animated.Value(BIG_DICE_START_SCALE)).current;
  const diceRotate = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const minSpinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimer.current) clearInterval(spinTimer.current);
      if (minSpinTimer.current) clearTimeout(minSpinTimer.current);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const handleRoll = () => {
    if (stage !== "idle") return;
    setStage("rolling");
    setMinSpinDone(false);
    overlayOpacity.setValue(0);
    diceScale.setValue(BIG_DICE_START_SCALE);
    diceRotate.setValue(0);

    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(diceScale, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(diceRotate, {
        toValue: 1,
        duration: 180,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    spinTimer.current = setInterval(() => {
      setDisplayFace((Math.floor(Math.random() * 6) + 1) as FaceId);
    }, 80);

    onRoll();
    minSpinTimer.current = setTimeout(() => setMinSpinDone(true), MIN_SPIN_MS);
  };

  // Settle onto the real, server-assigned value only once both the minimum
  // spin time has passed and the server has actually told us what it is —
  // whichever of the two takes longer.
  useEffect(() => {
    if (stage !== "rolling" || !minSpinDone || resultFace === null) return;

    diceRotate.stopAnimation();
    if (spinTimer.current) clearInterval(spinTimer.current);
    setDisplayFace(resultFace);
    setRevealFace(resultFace);
    diceRotate.setValue(0);

    Animated.spring(diceScale, {
      toValue: 1.15,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start(() => setStage("revealing"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, minSpinDone, resultFace]);

  useEffect(() => {
    if (stage !== "revealing" || revealFace === null) return;

    cardScale.setValue(0.3);
    cardOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(cardOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 0.7, friction: 3, tension: 100, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1.25, friction: 3, tension: 90, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();

    dismissTimer.current = setTimeout(() => {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setStage("idle");
        setRevealFace(null);
        onFinished();
      });
    }, REVEAL_HOLD_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const rotateDeg = diceRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.idleDice} onPress={handleRoll} disabled={stage !== "idle"}>
        <DiceFace value={1} size={IDLE_DICE_SIZE} />
        <Text style={styles.idleLabel}>{t("dice.roll")}</Text>
      </Pressable>

      {stage !== "idle" && (
        <Animated.View pointerEvents="none" style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Text style={styles.turnLabel}>{t("dice.rollingPrompt", { playerName })}</Text>
          <Animated.View
            style={{
              width: BIG_DICE_SIZE,
              height: BIG_DICE_SIZE,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: diceScale }, { rotate: rotateDeg }],
            }}
          >
            <DiceFace value={displayFace} size={BIG_DICE_SIZE} />
          </Animated.View>

          {stage === "revealing" && revealFace !== null && (
            <Animated.View
              style={[styles.resultCard, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}
            >
              <Text style={styles.resultText}>{t("dice.yourCardIs", { emoji: FACE_EMOJIS[revealFace] })}</Text>
              <Text style={styles.resultName}>{getFaceName(revealFace)}</Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center",
    },
    idleDice: {
      alignItems: "center",
      justifyContent: "center",
    },
    idleLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.goldSoft,
      marginTop: 8,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    // This overlay always dims to the same night-temple backdrop regardless
    // of the surrounding theme, matching DiceRollStage — its own text below
    // uses fixed literal colors rather than the invertible theme tokens.
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(22, 36, 31, 0.92)",
      alignItems: "center",
      justifyContent: "center",
    },
    turnLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "#F4EFDE",
      marginBottom: 24,
      textAlign: "center",
    },
    resultCard: {
      alignItems: "center",
      marginTop: 28,
    },
    resultText: {
      fontSize: 26,
      fontWeight: "800",
      color: "#F4EFDE",
      marginBottom: 4,
      textAlign: "center",
    },
    resultName: {
      fontSize: 15,
      color: "#E4C665",
      fontWeight: "600",
    },
  });
}
