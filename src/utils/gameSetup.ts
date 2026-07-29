import { CardModel, FACE_IDS, FaceId } from "../types";

const SKULL_COUNT = 3;
const BONUS_SMALL_COUNT = 2; // each worth +1
const BONUS_BIG_COUNT = 1; // worth +3 — a single, rare jackpot tile
const COPIES_PER_FACE = 6;

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Builds the full 42-card deck: 3 skulls + 2 small bonus + 1 big bonus tile
// (6 special tiles — same count as the original 6 skulls) + 36 face tiles
// (6 faces x 6 copies each), then shuffles the whole thing into board order.
export function buildDeck(): CardModel[] {
  const cards: CardModel[] = [];

  FACE_IDS.forEach((faceId: FaceId) => {
    for (let copy = 0; copy < COPIES_PER_FACE; copy++) {
      cards.push({
        id: `face-${faceId}-${copy}`,
        type: "face",
        faceId,
        revealed: false,
      });
    }
  });

  for (let i = 0; i < SKULL_COUNT; i++) {
    cards.push({ id: `skull-${i}`, type: "skull", revealed: false });
  }
  for (let i = 0; i < BONUS_SMALL_COUNT; i++) {
    cards.push({ id: `bonusSmall-${i}`, type: "bonusSmall", revealed: false });
  }
  for (let i = 0; i < BONUS_BIG_COUNT; i++) {
    cards.push({ id: `bonusBig-${i}`, type: "bonusBig", revealed: false });
  }

  return shuffle(cards);
}

// How many total copies of this face exist on the board — always 6 today,
// but kept as a real count (not a hardcoded constant) in case the
// composition changes again later.
export function totalCopiesForFace(board: CardModel[], faceId: FaceId): number {
  return board.filter((c) => c.type === "face" && c.faceId === faceId).length;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
