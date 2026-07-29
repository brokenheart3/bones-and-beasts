import { create } from "zustand";
import { buildDeck, ordinal, totalCopiesForFace } from "../utils/gameSetup";
import { useStatsStore } from "./useStatsStore";
import {
  CardModel,
  FaceId,
  FACE_IDS,
  FACE_NAMES,
  FACE_EMOJIS,
  BONUS_SMALL_AMOUNT,
  BONUS_BIG_AMOUNT,
  BONUS_SMALL_EMOJI,
  BONUS_BIG_EMOJI,
  GamePhase,
  GameState,
  Player,
  SetCompletion,
} from "../types";

const PLAYER_COLORS = ["#C9A227", "#4C8B71", "#9C3B3B", "#6E8FB8"];

// Rolls a face, excluding any already claimed by another player this game —
// each player needs a different card to hunt for, so a roll that would
// duplicate an earlier player's target picks again from what's left instead.
function rollFace(excluding: FaceId[] = []): FaceId {
  const available = FACE_IDS.filter((f) => !excluding.includes(f));
  const pool = available.length > 0 ? available : FACE_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createPlayers(names: string[]): Player[] {
  return names.map((name, i) => ({
    id: `p${i}`,
    name,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    targetFaceId: null,
    collected: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    completedSets: [],
    skipNextTurn: false,
  }));
}

interface GameActions {
  initGame: (playerNames: string[]) => void;
  rollForCurrentPlayer: () => FaceId;
  flipCard: (cardId: string) => void;
  endSkullPause: () => void;
  resetGame: () => void;
}

type Store = GameState & GameActions;

// Advances currentPlayerIndex, honoring any pending skip-next-turn penalties.
// Mutates the passed-in players array in place (callers pass a fresh copy).
function advanceTurn(
  players: Player[],
  currentIndex: number
): { nextIndex: number } {
  const n = players.length;
  let idx = currentIndex;

  for (let attempts = 0; attempts < n; attempts++) {
    idx = (idx + 1) % n;
    if (players[idx].skipNextTurn) {
      players[idx].skipNextTurn = false; // penalty consumed
      if (n === 1) break; // solo play: nothing else to skip to
      continue;
    }
    break;
  }
  return { nextIndex: idx };
}

export const useGameStore = create<Store>((set, get) => ({
  gameId: 0,
  board: [],
  players: [],
  currentPlayerIndex: 0,
  targetFaceId: null,
  phase: "assigningTargets",
  completions: [],
  message: "",
  didLose: false,
  startedAt: null,
  endedAt: null,

  initGame: (playerNames: string[]) => {
    const players = createPlayers(playerNames);
    set({
      gameId: get().gameId + 1,
      board: buildDeck(),
      players,
      currentPlayerIndex: 0,
      targetFaceId: null,
      phase: "assigningTargets",
      completions: [],
      message: `${players[0].name}, roll to find your card!`,
      didLose: false,
      startedAt: Date.now(),
      endedAt: null,
    });
  },

  // Rolls once for players[currentPlayerIndex], locking in their target face.
  // Once everyone has rolled, hands off to the "flipping" stage starting
  // back at the first player. Returns the rolled value so the calling UI
  // can drive its own reveal animation without re-deriving it from state.
  rollForCurrentPlayer: () => {
    const state = get();
    if (state.phase !== "assigningTargets") return rollFace();

    const claimed = state.players
      .map((p) => p.targetFaceId)
      .filter((f): f is FaceId => f !== null);
    const value = rollFace(claimed);
    const players = state.players.map((p) => ({ ...p }));
    const roller = players[state.currentPlayerIndex];
    roller.targetFaceId = value;

    const isLastRoller = state.currentPlayerIndex === players.length - 1;
    if (isLastRoller) {
      const first = players[0];
      set({
        players,
        currentPlayerIndex: 0,
        targetFaceId: first.targetFaceId,
        phase: "flipping",
        message: `${first.name}'s turn — hunt for ${FACE_NAMES[first.targetFaceId!]} ${
          FACE_EMOJIS[first.targetFaceId!]
        }!`,
      });
    } else {
      const nextRoller = players[state.currentPlayerIndex + 1];
      set({
        players,
        currentPlayerIndex: state.currentPlayerIndex + 1,
        message: `${nextRoller.name}, roll to find your card!`,
      });
    }

    return value;
  },

  flipCard: (cardId: string) => {
    const state = get();
    if (state.phase !== "flipping") return;

    const card = state.board.find((c) => c.id === cardId);
    if (!card || card.revealed) return;

    // A plain mutable array for this update cycle — the bonus branch below
    // may reveal *additional* tiles beyond the one clicked, so this can't be
    // treated as immutable until the very end.
    const board: CardModel[] = state.board.map((c) =>
      c.id === cardId ? { ...c, revealed: true } : c
    );
    const players: Player[] = state.players.map((p) => ({
      ...p,
      collected: { ...p.collected },
      completedSets: [...p.completedSets],
    }));
    const currentPlayer = players[state.currentPlayerIndex];

    let completions: SetCompletion[] = state.completions;
    let nextIndex = state.currentPlayerIndex;
    let message: string;
    let phaseOverride: GamePhase | null = null;
    let soloLoss = false;

    // Credits `amount` copies of `faceId` to currentPlayer (capped at however
    // many copies of that face actually exist this game — see
    // totalCopiesForFace), checks for set completion, and returns the
    // resulting message. Shared by both a direct correct-face match and a
    // bonus-tile find, which behave identically from here on.
    const applyFound = (faceId: FaceId, amount: number, lead: string): string => {
      const total = totalCopiesForFace(board, faceId);
      currentPlayer.collected[faceId] = Math.min(currentPlayer.collected[faceId] + amount, total);
      let msg = `${lead} (${currentPlayer.collected[faceId]}/${total}). Flip again!`;

      if (
        currentPlayer.collected[faceId] === total &&
        !currentPlayer.completedSets.includes(faceId)
      ) {
        currentPlayer.completedSets.push(faceId);
        const order = completions.length + 1;
        completions = [...completions, { faceId, playerId: currentPlayer.id, order }];
        msg = `🏆 ${currentPlayer.name} completed the ${FACE_NAMES[faceId]} set — ${ordinal(
          order
        )} place!`;
      }
      return msg;
    };

    if (card.type === "skull") {
      if (players.length === 1) {
        // Solo: there's no other player to hand the turn to, so the penalty
        // is a brief forced pause instead of a skipped turn.
        message = `💀 ${currentPlayer.name} hit a skull! Frozen for a moment...`;
        phaseOverride = "skullPause";
      } else {
        // Group: turn ends now, and this player also loses their following turn.
        currentPlayer.skipNextTurn = true;
        nextIndex = advanceTurn(players, state.currentPlayerIndex).nextIndex;
        const next = players[nextIndex];
        message = `💀 ${currentPlayer.name} hit a skull! Turn lost, next turn skipped. ${
          next.name
        }'s turn — hunt for ${FACE_NAMES[next.targetFaceId!]} ${FACE_EMOJIS[next.targetFaceId!]}!`;
      }
    } else if (card.type === "bonusSmall" || card.type === "bonusBig") {
      // Bonus tiles don't just credit progress silently — they also flip
      // that many real, still-hidden copies of the *flipping* player's own
      // target face on the board by themselves (capped by how many are
      // actually left), so the board and the collection count always agree.
      // Never affects anyone else's cards.
      const faceId = currentPlayer.targetFaceId as FaceId;
      const amount = card.type === "bonusSmall" ? BONUS_SMALL_AMOUNT : BONUS_BIG_AMOUNT;
      const glyph = card.type === "bonusSmall" ? BONUS_SMALL_EMOJI : BONUS_BIG_EMOJI;
      const label = card.type === "bonusSmall" ? "a bonus gem" : "an ancient idol";

      const total = totalCopiesForFace(board, faceId);
      const remainingNeeded = total - currentPlayer.collected[faceId];
      const hiddenIndices = board
        .map((c, i) => i)
        .filter(
          (i) => board[i].type === "face" && board[i].faceId === faceId && !board[i].revealed
        );
      const toFlip = Math.max(0, Math.min(amount, remainingNeeded, hiddenIndices.length));
      for (let i = 0; i < toFlip; i++) {
        const idx = hiddenIndices[i];
        board[idx] = { ...board[idx], revealed: true };
      }

      const lead =
        toFlip > 0
          ? `${glyph} ${currentPlayer.name} found ${label} — +${toFlip} ${FACE_NAMES[faceId]}!`
          : `${glyph} ${currentPlayer.name} found ${label}, but had nothing left to reveal!`;
      message = applyFound(faceId, toFlip, lead);
    } else if (card.faceId === currentPlayer.targetFaceId) {
      // --- Correct face match ---
      const faceId = card.faceId as FaceId;
      message = applyFound(faceId, 1, `${currentPlayer.name} found ${FACE_NAMES[faceId]}`);
    } else {
      // --- Wrong face ---
      const wrongFaceId = card.faceId as FaceId;

      // Solo-only extra rule: if every copy of some *other* face gets fully
      // revealed before the player finishes their own target set, they lose.
      soloLoss =
        players.length === 1 &&
        board.filter((c) => c.type === "face" && c.faceId === wrongFaceId && c.revealed)
          .length === totalCopiesForFace(board, wrongFaceId);

      if (soloLoss) {
        message = `💀 All ${FACE_NAMES[wrongFaceId]} tiles were found before you finished your own ${
          FACE_NAMES[currentPlayer.targetFaceId!]
        } set — you lose!`;
      } else {
        // turn passes, no skip penalty
        nextIndex = advanceTurn(players, state.currentPlayerIndex).nextIndex;
        const next = players[nextIndex];
        message = `${currentPlayer.name} revealed the wrong tile. ${next.name}'s turn — hunt for ${
          FACE_NAMES[next.targetFaceId!]
        } ${FACE_EMOJIS[next.targetFaceId!]}!`;
      }
    }

    // Each player can only ever complete their own fixed target's set, so
    // "everyone's found their card" (not "all 6 faces claimed by someone")
    // is the real win condition — with up to 4 players there's no way to
    // ever cover all 6 faces. Clearing the board is a fallback so the game
    // still always ends even if duplicate targets split a face's 6 copies
    // across two players and neither completes it. Computed last, since the
    // bonus branch above may have revealed extra tiles beyond the one clicked.
    const boardCleared = board.every((c) => c.revealed);
    const gameOver = soloLoss || completions.length === players.length || boardCleared;
    const now = Date.now();
    if (gameOver) {
      const durationMs = state.startedAt ? now - state.startedAt : undefined;
      useStatsStore.getState().recordGame(players, completions, durationMs);
      if (!soloLoss) {
        message =
          completions.length === players.length
            ? "Everyone found their card! Game over."
            : "The tablet is cleared! Game over.";
      }
    }

    set({
      board,
      players,
      completions,
      currentPlayerIndex: nextIndex,
      targetFaceId: players[nextIndex].targetFaceId,
      phase: gameOver ? "gameOver" : phaseOverride ?? "flipping",
      didLose: soloLoss,
      endedAt: gameOver ? now : state.endedAt,
      message,
    });
  },

  // Ends the solo skull-hit pause and resumes normal play for the same player.
  endSkullPause: () => {
    const state = get();
    if (state.phase !== "skullPause") return;
    const player = state.players[state.currentPlayerIndex];
    set({
      phase: "flipping",
      message: `${player.name}'s turn — hunt for ${FACE_NAMES[player.targetFaceId!]} ${
        FACE_EMOJIS[player.targetFaceId!]
      }!`,
    });
  },

  resetGame: () => {
    set({
      gameId: 0,
      board: [],
      players: [],
      currentPlayerIndex: 0,
      targetFaceId: null,
      phase: "assigningTargets",
      completions: [],
      message: "",
      didLose: false,
      startedAt: null,
      endedAt: null,
    });
  },
}));
