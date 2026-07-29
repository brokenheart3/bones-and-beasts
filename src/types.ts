export type FaceId = 1 | 2 | 3 | 4 | 5 | 6;

export const FACE_IDS: FaceId[] = [1, 2, 3, 4, 5, 6];

export const FACE_EMOJIS: Record<FaceId, string> = {
  1: "🦁",
  2: "🐘",
  3: "🐒",
  4: "🐅",
  5: "🦒",
  6: "🦓",
};

export const FACE_NAMES: Record<FaceId, string> = {
  1: "Lion",
  2: "Elephant",
  3: "Monkey",
  4: "Tiger",
  5: "Giraffe",
  6: "Zebra",
};

export const SKULL_EMOJI = "💀";
export const BONUS_SMALL_EMOJI = "💎";
export const BONUS_BIG_EMOJI = "🏺";
export const BONUS_SMALL_AMOUNT = 1;
export const BONUS_BIG_AMOUNT = 3;

export type CardType = "face" | "skull" | "bonusSmall" | "bonusBig";

export interface CardModel {
  id: string;
  type: CardType;
  faceId?: FaceId; // present only when type === 'face'
  revealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  targetFaceId: FaceId | null; // null until this player rolls; fixed for the whole game after that
  collected: Record<FaceId, number>; // how many of each face this player has found
  completedSets: FaceId[]; // faces this player has fully completed
  skipNextTurn: boolean;
}

export interface SetCompletion {
  faceId: FaceId;
  playerId: string;
  order: number; // 1st, 2nd, 3rd... set completed in the whole game
}

// assigningTargets: each player rolls once, in turn, to lock in their target face.
// skullPause: solo mode only — a brief forced pause after hitting a skull
// (there's no other player to pass the turn to, so this replaces the penalty).
export type GamePhase = "assigningTargets" | "flipping" | "skullPause" | "gameOver";

export interface GameState {
  gameId: number; // bumped only by initGame — a stable "new game started" signal
  board: CardModel[];
  players: Player[];
  currentPlayerIndex: number;
  targetFaceId: FaceId | null; // current player's target (mirrors players[currentPlayerIndex].targetFaceId)
  phase: GamePhase;
  completions: SetCompletion[];
  message: string;
  // Solo-only: true if every copy of some other face got fully revealed
  // before the player finished their own target set.
  didLose: boolean;
  startedAt: number | null; // epoch ms, set once when the game begins
  endedAt: number | null; // epoch ms, set once when the game ends — null while still playing
}
