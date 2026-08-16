import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Player, SetCompletion } from "../types";

export interface GameRecord {
  date: string; // ISO timestamp
  mode: "solo" | "group";
  playerCount: number;
  // This device's own player, not a shared "the game's winner" value — every
  // participant's device records this same game independently, and each
  // should see its own placement/time, not identical results for everyone.
  myRank: number | null; // 1st, 2nd, ... — null if this player didn't finish
  myFinishMs?: number; // this player's own elapsed time when they finished
  setsCompleted: number; // total sets completed by anyone that game
  durationMs?: number; // whole game's wall-clock time, start to game over
}

interface StatsState {
  history: GameRecord[];
  recordGame: (
    players: Player[],
    completions: SetCompletion[],
    myPlayerId: string,
    startedAt: number | null,
    endedAt: number | null
  ) => void;
  clearHistory: () => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      history: [],
      recordGame: (players, completions, myPlayerId, startedAt, endedAt) => {
        const myCompletion = completions.find((c) => c.playerId === myPlayerId);
        const durationMs = startedAt != null && endedAt != null ? endedAt - startedAt : undefined;
        const myFinishMs =
          myCompletion && startedAt != null ? myCompletion.finishedAt - startedAt : undefined;

        const record: GameRecord = {
          date: new Date().toISOString(),
          mode: players.length > 1 ? "group" : "solo",
          playerCount: players.length,
          myRank: myCompletion?.order ?? null,
          myFinishMs,
          setsCompleted: completions.length,
          durationMs,
        };
        set((state) => ({ history: [...state.history, record] }));
      },
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "bones-and-beasts/stats",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
