import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../theme";
import { FaceId, FACE_EMOJIS, FACE_NAMES } from "../types";
import DiceFace from "./DiceFace";

interface Props {
  playerName: string;
  onRoll: () => FaceId;
  onFinished: () => void;
}

type Stage = "idle" | "rolling" | "revealing";

const IDLE_DICE_SIZE = 56;
const BIG_DICE_SIZE = 150;
const BIG_DICE_START_SCALE = IDLE_DICE_SIZE / BIG_DICE_SIZE;

const SPIN_MS = 1000;
const REVEAL_HOLD_MS = 1000;

export default function DiceRollStage({ playerName, onRoll, onFinished }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [stage, setStage] = useState<Stage>("idle");
  const [displayFace, setDisplayFace] = useState<FaceId>(1);
  const [resultFace, setResultFace] = useState<FaceId | null>(null);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const diceScale = useRef(new Animated.Value(BIG_DICE_START_SCALE)).current;
  const diceRotate = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimer.current) clearInterval(spinTimer.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const handleRoll = () => {
    if (stage !== "idle") return;
    setStage("rolling");
    overlayOpacity.setValue(0);
    diceScale.setValue(BIG_DICE_START_SCALE);
    diceRotate.setValue(0);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(diceScale, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
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
      setDisplayFace(((Math.floor(Math.random() * 6) + 1) as FaceId));
    }, 80);

    settleTimer.current = setTimeout(() => {
      diceRotate.stopAnimation();
      if (spinTimer.current) clearInterval(spinTimer.current);

      const value = onRoll();
      setResultFace(value);
      setDisplayFace(value);
      diceRotate.setValue(0);

      Animated.spring(diceScale, {
        toValue: 1.15,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }).start(() => setStage("revealing"));
    }, SPIN_MS);
  };

  useEffect(() => {
    if (stage !== "revealing" || resultFace === null) return;

    cardScale.setValue(0.3);
    cardOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(cardOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 0.7, friction: 3, tension: 100, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1.25, friction: 3, tension: 90, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();

    dismissTimer.current = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setStage("idle");
        setResultFace(null);
        onFinished();
      });
    }, REVEAL_HOLD_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const rotateDeg = diceRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.turnLabel}>{playerName}, roll to find your card!</Text>
      <Pressable style={styles.idleDice} onPress={handleRoll} disabled={stage !== "idle"}>
        <DiceFace value={1} size={IDLE_DICE_SIZE} />
        <Text style={styles.idleLabel}>Roll</Text>
      </Pressable>

      {stage !== "idle" && (
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
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

          {stage === "revealing" && resultFace !== null && (
            <Animated.View
              style={[
                styles.resultCard,
                { opacity: cardOpacity, transform: [{ scale: cardScale }] },
              ]}
            >
              <Text style={styles.resultText}>
                Your card is {FACE_EMOJIS[resultFace]}
              </Text>
              <Text style={styles.resultName}>{FACE_NAMES[resultFace]}</Text>
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
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    turnLabel: {
      color: theme.colors.textLight,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 24,
      textAlign: "center",
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
    // of the surrounding theme, so its own text below uses fixed literal
    // colors rather than the invertible theme tokens.
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(22, 36, 31, 0.92)",
      alignItems: "center",
      justifyContent: "center",
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
