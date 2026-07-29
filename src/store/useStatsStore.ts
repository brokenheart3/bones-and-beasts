import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Player, SetCompletion } from "../types";

export interface GameRecord {
  date: string; // ISO timestamp
  mode: "solo" | "group";
  playerCount: number;
  winnerName: string | null; // null if nobody completed a set
  setsCompleted: number; // total sets completed by anyone that game
  durationMs?: number; // wall-clock time from game start to game over
}

interface StatsState {
  history: GameRecord[];
  recordGame: (players: Player[], completions: SetCompletion[], durationMs?: number) => void;
  clearHistory: () => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      history: [],
      recordGame: (players: Player[], completions: SetCompletion[], durationMs?: number) => {
        const counts = new Map<string, number>();
        completions.forEach((c) => {
          counts.set(c.playerId, (counts.get(c.playerId) ?? 0) + 1);
        });
        let winnerId: string | null = null;
        let bestCount = 0;
        counts.forEach((count, playerId) => {
          if (count > bestCount) {
            bestCount = count;
            winnerId = playerId;
          }
        });
        const winner = players.find((p) => p.id === winnerId);

        const record: GameRecord = {
          date: new Date().toISOString(),
          mode: players.length > 1 ? "group" : "solo",
          playerCount: players.length,
          winnerName: winner?.name ?? null,
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
