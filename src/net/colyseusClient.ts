import { Client } from "colyseus.js";

// Defaults to the deployed Railway server. Override for local development by
// setting EXPO_PUBLIC_SERVER_URL in .env (see .env.example) — e.g.
// "ws://localhost:2567", or your machine's LAN IP like "ws://192.168.1.20:2567"
// when testing on a physical device, since it can't resolve "localhost".
export const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? "wss://bones-and-beasts-server-production.up.railway.app";

export const colyseusClient = new Client(SERVER_URL);

export async function joinBeastsRoom(playerName: string) {
  return colyseusClient.joinOrCreate("bones_beasts", { name: playerName });
}
