import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Card from "./Card";
import { CardModel } from "../types";

interface Props {
  board: CardModel[];
  disabled: boolean;
  onFlip: (id: string) => void;
}

const COLUMNS = 6;
const CARD_ASPECT_RATIO = 0.78; // width / height
const CARD_MARGIN = 3;

export default function GridBoard({ board, disabled, onFlip }: Props) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const rowCount = Math.ceil(board.length / COLUMNS);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };

  // Fit COLUMNS x rowCount cells (at CARD_ASPECT_RATIO) into the measured
  // box, whichever dimension is tighter, so the whole board fits without scrolling.
  const cellOuterW = box.width / COLUMNS;
  const cellOuterH = box.height / rowCount;
  let cardWidth = cellOuterW - CARD_MARGIN * 2;
  let cardHeight = cardWidth / CARD_ASPECT_RATIO;
  if (cardHeight > cellOuterH - CARD_MARGIN * 2) {
    cardHeight = cellOuterH - CARD_MARGIN * 2;
    cardWidth = cardHeight * CARD_ASPECT_RATIO;
  }

  const rows: CardModel[][] = [];
  for (let i = 0; i < board.length; i += COLUMNS) {
    rows.push(board.slice(i, i + COLUMNS));
  }

  return (
    <View style={styles.grid} onLayout={onLayout}>
      {box.width > 0 &&
        rows.map((row, rIdx) => (
          <View style={styles.row} key={`row-${rIdx}`}>
            {row.map((card, cIdx) => (
              <Card
                key={card.id}
                card={card}
                number={rIdx * COLUMNS + cIdx + 1}
                width={cardWidth}
                height={cardHeight}
                disabled={disabled}
                onPress={onFlip}
              />
            ))}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
