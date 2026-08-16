export interface OnlineCard {
  id: string;
  cardType: string; // "hidden" | "face" | "skull"
  faceId: number; // 0 = unknown
  revealed: boolean;
}

export interface OnlinePlayer {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  skipNextTurn: boolean;
  // Rolled once at game start and fixed for the rest of the game; 0 until
  // this player has rolled.
  targetFaceId: number;
  collected: Record<string, number>;
  completedSets: number[];
}

export interface OnlineCompletion {
  faceId: number;
  playerId: string;
  order: number;
  finishedAt: number;
}

export interface OnlineSnapshot {
  board: OnlineCard[];
  players: OnlinePlayer[];
  turnOrder: string[];
  currentPlayerIndex: number;
  diceValue: number; // last value rolled during target assignment
  phase: string;
  countdown: number;
  message: string;
  completions: OnlineCompletion[];
  // How many total copies of each face (keyed "1"-"6") exist this game —
  // public game-state, synced up front since the board itself hides
  // unrevealed tiles' true types/faces.
  faceTotals: Record<string, number>;
  startedAt: number | null; // epoch ms; null before the game actually starts
  endedAt: number | null; // epoch ms; null while still playing
}

// Colyseus schema instances aren't plain objects, so we snapshot them into
// plain data each time state changes — simplest way to feed them into React.
export function snapshotFromState(state: any): OnlineSnapshot {
  const players: OnlinePlayer[] = [];
  state.players.forEach((p: any) => {
    const collected: Record<string, number> = {};
    p.collected.forEach((v: number, k: string) => {
      collected[k] = v;
    });
    players.push({
      id: p.id,
      name: p.name,
      color: p.color,
      connected: p.connected,
      skipNextTurn: p.skipNextTurn,
      targetFaceId: p.targetFaceId,
      collected,
      completedSets: [...p.completedSets],
    });
  });

  return {
    board: state.board.map((c: any) => ({
      id: c.id,
      cardType: c.cardType,
      faceId: c.faceId,
      revealed: c.revealed,
    })),
    players,
    turnOrder: [...state.turnOrder],
    currentPlayerIndex: state.currentPlayerIndex,
    diceValue: state.diceValue,
    phase: state.phase,
    countdown: state.countdown,
    message: state.message,
    completions: state.completions.map((c: any) => ({
      faceId: c.faceId,
      playerId: c.playerId,
      order: c.order,
      finishedAt: c.finishedAt,
    })),
    faceTotals: (() => {
      const totals: Record<string, number> = {};
      state.faceTotals.forEach((v: number, k: string) => {
        totals[k] = v;
      });
      return totals;
    })(),
    startedAt: state.startedAt || null,
    endedAt: state.endedAt || null,
  };
}
