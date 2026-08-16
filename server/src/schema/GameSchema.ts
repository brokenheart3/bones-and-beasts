import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

// A card's true type/faceId is only ever written into this synced schema
// once it has been revealed. Until then it stays "hidden" with faceId 0 so
// clients have no way to see what a tile is before someone flips it.
export class CardSchema extends Schema {
  @type("string") id: string = "";
  @type("string") cardType: string = "hidden"; // "hidden" | "face" | "skull"
  @type("number") faceId: number = 0; // 0 = unknown/unrevealed, otherwise 1-6
  @type("boolean") revealed: boolean = false;
}

export class PlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") color: string = "";
  @type("boolean") connected: boolean = true;
  @type("boolean") skipNextTurn: boolean = false;
  // Rolled once at game start and fixed for the rest of the game (like
  // Solo's per-player target) — 0 until this player has rolled.
  @type("number") targetFaceId: number = 0;
  @type({ map: "number" }) collected = new MapSchema<number>();
  @type(["number"]) completedSets = new ArraySchema<number>();
}

export class CompletionSchema extends Schema {
  @type("number") faceId: number = 0;
  @type("string") playerId: string = "";
  @type("number") order: number = 0;
  @type("number") finishedAt: number = 0; // epoch ms
}

export class BeastsState extends Schema {
  @type([CardSchema]) board = new ArraySchema<CardSchema>();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type(["string"]) turnOrder = new ArraySchema<string>();
  @type("number") currentPlayerIndex: number = 0;
  @type("number") diceValue: number = 0; // 0 = not rolled yet; last value rolled during "rolling"
  @type("string") phase: string = "waiting"; // waiting | countdown | rolling | flipping | gameOver
  @type("number") countdown: number = -1;
  @type("string") message: string = "Waiting for players...";
  @type([CompletionSchema]) completions = new ArraySchema<CompletionSchema>();
  // How many total copies of each face (1-6) exist in this game's deck
  // (always 6 — see buildDeck). This is public game-state (not tile-
  // identity-revealing), so it's synced up front rather than derived from
  // the fogged-until-revealed board.
  @type({ map: "number" }) faceTotals = new MapSchema<number>();
  // Epoch ms; 0 = not set yet (matches the same "0 = unset" convention used
  // by diceValue above, since a Schema number can't be null).
  @type("number") startedAt: number = 0;
  @type("number") endedAt: number = 0;
}
