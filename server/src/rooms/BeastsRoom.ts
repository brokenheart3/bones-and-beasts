import { Client, Room } from "colyseus";
import { BeastsState, CardSchema, CompletionSchema, PlayerSchema } from "../schema/GameSchema";

const FACE_NAMES: Record<number, string> = {
  1: "Lion",
  2: "Elephant",
  3: "Monkey",
  4: "Tiger",
  5: "Giraffe",
  6: "Zebra",
};
const FACE_IDS = [1, 2, 3, 4, 5, 6];

const PLAYER_COLORS = ["#C9A227", "#4C8B71", "#9C3B3B", "#6E8FB8"];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const COUNTDOWN_START = 3;
const SKULL_PAUSE_MS = 5000; // same forced-pause length as Solo

const SKULL_COUNT = 3;
const BONUS_SMALL_COUNT = 2; // each worth +1
const BONUS_BIG_COUNT = 1; // worth +3 — a single, rare jackpot tile
const BONUS_SMALL_AMOUNT = 1;
const BONUS_BIG_AMOUNT = 3;
const BONUS_SMALL_EMOJI = "💎";
const BONUS_BIG_EMOJI = "🏺";
const COPIES_PER_FACE = 6;

interface DeckCard {
  id: string;
  type: "face" | "skull" | "bonusSmall" | "bonusBig";
  faceId?: number;
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 3 skulls + 2 small bonus + 1 big bonus tile (6 special tiles — same count
// as the original 6 skulls) + 36 face tiles (6 faces x 6 copies each).
function buildDeck(): DeckCard[] {
  const cards: DeckCard[] = [];

  for (const f of FACE_IDS) {
    for (let c = 0; c < COPIES_PER_FACE; c++) {
      cards.push({ id: `face-${f}-${c}`, type: "face", faceId: f });
    }
  }
  for (let i = 0; i < SKULL_COUNT; i++) {
    cards.push({ id: `skull-${i}`, type: "skull" });
  }
  for (let i = 0; i < BONUS_SMALL_COUNT; i++) {
    cards.push({ id: `bonusSmall-${i}`, type: "bonusSmall" });
  }
  for (let i = 0; i < BONUS_BIG_COUNT; i++) {
    cards.push({ id: `bonusBig-${i}`, type: "bonusBig" });
  }

  return shuffle(cards);
}

// Picks a face for a newly-rolling player, excluding faces already claimed
// as someone else's fixed target this game (mirrors the local Solo store's
// rollFace) — with at most MAX_PLAYERS (4) players and 6 faces, the "pool
// empty" fallback below can't actually happen, but it's cheap insurance.
function rollFace(excluding: number[]): number {
  const available = FACE_IDS.filter((f) => !excluding.includes(f));
  const pool = available.length > 0 ? available : FACE_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export class BeastsRoom extends Room<BeastsState> {
  maxClients = MAX_PLAYERS;

  // The true deck lives only on the server; the synced schema only ever
  // reflects revealed cards. This is what actually keeps the game fair.
  private deck: DeckCard[] = [];
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private skullPauseTimer: ReturnType<typeof setTimeout> | null = null;

  onCreate() {
    this.setState(new BeastsState());
    this.deck = buildDeck();
    this.deck.forEach((c) => {
      const card = new CardSchema();
      card.id = c.id;
      this.state.board.push(card);
    });
    for (let f = 1; f <= 6; f++) {
      this.state.faceTotals.set(String(f), this.totalCopiesForFace(f));
    }

    this.onMessage("rollDice", (client) => this.handleRollDice(client));
    this.onMessage("flipCard", (client, message: { cardId: string }) =>
      this.handleFlipCard(client, message?.cardId)
    );
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = (options?.name || "").trim() || `Player ${this.state.players.size + 1}`;
    player.color = PLAYER_COLORS[this.state.players.size % PLAYER_COLORS.length];
    for (let f = 1; f <= 6; f++) player.collected.set(String(f), 0);

    this.state.players.set(client.sessionId, player);
    this.state.turnOrder.push(client.sessionId);
    this.state.message = `Waiting for players... (${this.state.players.size}/${MIN_PLAYERS} minimum)`;

    if (this.state.phase === "waiting") {
      if (this.state.players.size >= MAX_PLAYERS) {
        this.beginCountdown(0); // room is full: start immediately
      } else if (this.state.players.size >= MIN_PLAYERS) {
        this.beginCountdown(COUNTDOWN_START);
      }
    }
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (this.state.phase === "waiting" || this.state.phase === "countdown") {
      this.state.players.delete(client.sessionId);
      const idx = this.state.turnOrder.indexOf(client.sessionId);
      if (idx >= 0) this.state.turnOrder.splice(idx, 1);
      if (this.state.players.size < MIN_PLAYERS) this.cancelCountdown();
      return;
    }

    // Game already in progress: keep their collected progress, just mark
    // them disconnected. advanceTurn()/the roll-assignment flow both skip
    // disconnected players, so the game can't stall waiting on them —
    // others can still complete a disconnected player's set for them via
    // the wrong-tile-credits-the-owner rule, and the boardCleared fallback
    // guarantees the game ends either way.
    player.connected = false;
    if (this.state.phase === "rolling" && this.currentClientId() === client.sessionId) {
      this.assignTargetAndAdvance(player, `${player.name} disconnected —`);
    } else if (
      this.state.phase === "flipping" &&
      this.currentClientId() === client.sessionId
    ) {
      this.advanceTurn(`${player.name} disconnected — turn passes.`);
    }
  }

  onDispose() {
    this.cancelCountdown();
    if (this.skullPauseTimer) clearTimeout(this.skullPauseTimer);
  }

  private beginCountdown(from: number) {
    this.cancelCountdown();
    this.state.phase = "countdown";
    this.state.countdown = from;
    this.state.message = from > 0 ? `Starting in ${from}...` : "Room full — starting now!";

    if (from <= 0) {
      this.startGame();
      return;
    }

    this.countdownInterval = setInterval(() => {
      this.state.countdown -= 1;
      if (this.state.players.size >= MAX_PLAYERS) {
        this.state.countdown = 0;
      }
      if (this.state.countdown <= 0) {
        this.cancelCountdown();
        this.startGame();
      } else {
        this.state.message = `Starting in ${this.state.countdown}...`;
      }
    }, 1000);
  }

  private cancelCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.state.phase === "countdown") {
      this.state.phase = "waiting";
      this.state.countdown = -1;
      this.state.message = `Waiting for players... (${this.state.players.size}/${MIN_PLAYERS} minimum)`;
    }
  }

  private startGame() {
    this.lock(); // room is set once play begins — new joiners get routed to the next room
    this.state.currentPlayerIndex = 0;
    this.state.phase = "rolling";
    this.state.startedAt = Date.now();
    const first = this.state.players.get(this.state.turnOrder[0]);
    this.state.message = `${first?.name}, roll to find your card!`;
  }

  private currentClientId(): string {
    return this.state.turnOrder[this.state.currentPlayerIndex];
  }

  // A player is done for the rest of the game the instant they complete
  // their own fixed target's set — they never take another turn.
  private isFinished(player: PlayerSchema): boolean {
    return player.targetFaceId !== 0 && player.completedSets.includes(player.targetFaceId);
  }

  // True once every other seated player is disconnected or already
  // finished — i.e. this player is the only one left who can still take a
  // turn, same situation Solo is always in.
  private isOnlyActivePlayer(player: PlayerSchema): boolean {
    return this.state.turnOrder.every((id) => {
      if (id === player.id) return true;
      const other = this.state.players.get(id);
      return !other || !other.connected || this.isFinished(other);
    });
  }

  // Mirrors Solo's skull rule: with no one else to hand the turn to, a
  // skull just costs a forced 5-second pause instead of a "skip your next
  // turn" that would otherwise never have anyone else to cycle through
  // before coming back around.
  private beginSkullPause(player: PlayerSchema) {
    player.skipNextTurn = false;
    this.state.phase = "skullPause";
    this.state.message = `💀 ${player.name} hit a skull! Frozen for a moment...`;

    if (this.skullPauseTimer) clearTimeout(this.skullPauseTimer);
    this.skullPauseTimer = setTimeout(() => {
      this.skullPauseTimer = null;
      if (this.state.phase !== "skullPause") return; // room disposed or state moved on
      this.state.phase = "flipping";
      this.state.message = `${player.name}'s turn — hunt for ${FACE_NAMES[player.targetFaceId]}!`;
    }, SKULL_PAUSE_MS);
  }

  // Every player rolls once, in turn order, to lock in a fixed personal
  // target (mirrors Solo's assigningTargets phase) — no re-rolling after
  // that. Shared by a normal roll and the disconnect-during-rolling
  // fallback below, which auto-rolls for a player who leaves before
  // getting a turn so the rest of the room isn't stuck waiting on them.
  private assignTargetAndAdvance(player: PlayerSchema, messagePrefix: string) {
    const claimed = this.state.turnOrder
      .map((id) => this.state.players.get(id)?.targetFaceId)
      .filter((f): f is number => !!f);
    const value = rollFace(claimed);
    player.targetFaceId = value;
    this.state.diceValue = value;

    // Find the next player (in turn order) who still needs to roll,
    // auto-rolling on behalf of anyone already disconnected — cascading if
    // several in a row are gone — so the room never stalls waiting on a
    // player who can no longer respond.
    const n = this.state.turnOrder.length;
    let idx = this.state.turnOrder.indexOf(player.id);
    for (let attempts = 0; attempts < n; attempts++) {
      idx = (idx + 1) % n;
      const candidate = this.state.players.get(this.state.turnOrder[idx]);
      if (!candidate || candidate.targetFaceId !== 0) continue; // already rolled
      if (!candidate.connected) {
        this.assignTargetAndAdvance(candidate, messagePrefix);
        return;
      }
      this.state.currentPlayerIndex = idx;
      this.state.message = messagePrefix
        ? `${messagePrefix} ${candidate.name}, roll to find your card!`
        : `${candidate.name}, roll to find your card!`;
      return;
    }

    // Everyone's rolled — hand off to the flipping phase. Announce every
    // player's target together first, since each was only ever shown to
    // that one player as they rolled — this is everyone else's first
    // chance to see the full lineup.
    this.state.currentPlayerIndex = 0;
    this.state.phase = "flipping";
    const first = this.state.players.get(this.state.turnOrder[0])!;
    const summary = this.state.turnOrder
      .map((id) => this.state.players.get(id))
      .filter((p): p is PlayerSchema => !!p)
      .map((p) => `${p.name}: ${FACE_NAMES[p.targetFaceId]}`)
      .join(", ");
    const firstTurnMsg = `${first.name}'s turn — hunt for ${FACE_NAMES[first.targetFaceId]}!`;
    const combined = `${summary}. ${firstTurnMsg}`;
    this.state.message = messagePrefix ? `${messagePrefix} ${combined}` : combined;
  }

  private handleRollDice(client: Client) {
    if (this.state.phase !== "rolling") return;
    if (client.sessionId !== this.currentClientId()) return;

    const player = this.state.players.get(client.sessionId)!;
    this.assignTargetAndAdvance(player, "");
  }

  // How many total copies of this face exist in the deck this game.
  private totalCopiesForFace(faceId: number): number {
    return this.deck.filter((c) => c.type === "face" && c.faceId === faceId).length;
  }

  // Indices (aligned 1:1 between `deck` and the synced `board`, since both
  // are built by iterating the same deck array in `onCreate`) of still-hidden
  // tiles that are a real copy of `faceId`.
  private hiddenBoardIndicesForFace(faceId: number): number[] {
    const indices: number[] = [];
    this.deck.forEach((c, i) => {
      if (c.type === "face" && c.faceId === faceId && !this.state.board[i].revealed) {
        indices.push(i);
      }
    });
    return indices;
  }

  // Every player has their own distinct fixed target, so at most one other
  // player can ever "own" a given face.
  private findTargetOwner(faceId: number, excludingPlayerId: string): PlayerSchema | null {
    for (const id of this.state.turnOrder) {
      if (id === excludingPlayerId) continue;
      const candidate = this.state.players.get(id);
      if (candidate && candidate.targetFaceId === faceId) return candidate;
    }
    return null;
  }

  // Credits `amount` copies of `faceId` to player (capped at that face's
  // actual total this game), checks for set completion, and returns the
  // resulting counts/message. Shared by a direct face match and a bonus-tile
  // find, which behave identically from here on.
  private creditFace(
    player: PlayerSchema,
    faceId: number,
    amount: number
  ): { newCount: number; total: number; setMsg: string | null } {
    const total = this.totalCopiesForFace(faceId);
    const newCount = Math.min((player.collected.get(String(faceId)) ?? 0) + amount, total);
    player.collected.set(String(faceId), newCount);

    let setMsg: string | null = null;
    if (newCount === total && !player.completedSets.includes(faceId)) {
      player.completedSets.push(faceId);
      const order = this.state.completions.length + 1;
      const completion = new CompletionSchema();
      completion.faceId = faceId;
      completion.playerId = player.id;
      completion.order = order;
      completion.finishedAt = Date.now();
      this.state.completions.push(completion);
      setMsg = `🏆 ${player.name} completed the ${FACE_NAMES[faceId]} set — place ${order}! They're done for this game.`;
    }
    return { newCount, total, setMsg };
  }

  // Game ends once every seated player has completed their own set, or (as
  // a fallback, same as Solo) the whole board gets cleared without that
  // happening — e.g. a disconnected player's last few copies never turn up.
  private checkGameOver(): boolean {
    const allFinished = this.state.completions.length === this.state.turnOrder.length;
    const boardCleared = this.state.board.every((c) => c.revealed);
    if (allFinished || boardCleared) {
      this.state.phase = "gameOver";
      this.state.endedAt = Date.now();
      return true;
    }
    return false;
  }

  private handleFlipCard(client: Client, cardId: string) {
    if (this.state.phase !== "flipping") return;
    if (client.sessionId !== this.currentClientId()) return;
    if (!cardId) return;

    const boardIndex = this.state.board.findIndex((c) => c.id === cardId);
    const deckCard = this.deck.find((c) => c.id === cardId);
    if (boardIndex < 0 || !deckCard) return;

    const cardSchema = this.state.board[boardIndex];
    if (cardSchema.revealed) return;

    cardSchema.revealed = true;
    cardSchema.cardType = deckCard.type;
    if (deckCard.type === "face") cardSchema.faceId = deckCard.faceId!;

    const player = this.state.players.get(client.sessionId)!;

    if (deckCard.type === "skull") {
      if (this.isOnlyActivePlayer(player)) {
        this.beginSkullPause(player);
        return;
      }
      player.skipNextTurn = true;
      this.advanceTurn(`💀 ${player.name} hit a skull! Turn lost, next turn skipped.`);
      return;
    }

    if (deckCard.type === "bonusSmall" || deckCard.type === "bonusBig") {
      // Bonus tiles don't just credit progress silently — they also flip
      // that many real, still-hidden copies of the *flipping* player's own
      // fixed target on the board by themselves (capped by how many are
      // actually left), so the board and the collection count always agree.
      // Never affects anyone else's cards.
      const amount = deckCard.type === "bonusSmall" ? BONUS_SMALL_AMOUNT : BONUS_BIG_AMOUNT;
      const label = deckCard.type === "bonusSmall" ? "a bonus gem" : "an ancient idol";
      const glyph = deckCard.type === "bonusSmall" ? BONUS_SMALL_EMOJI : BONUS_BIG_EMOJI;
      const faceId = player.targetFaceId;

      const total = this.totalCopiesForFace(faceId);
      const already = player.collected.get(String(faceId)) ?? 0;
      const remainingNeeded = total - already;
      const hiddenIndices = this.hiddenBoardIndicesForFace(faceId);
      const toFlip = Math.max(0, Math.min(amount, remainingNeeded, hiddenIndices.length));
      for (let i = 0; i < toFlip; i++) {
        const idx = hiddenIndices[i];
        this.state.board[idx].revealed = true;
        this.state.board[idx].cardType = "face";
        this.state.board[idx].faceId = faceId;
      }

      const { setMsg } = this.creditFace(player, faceId, toFlip);
      const leadMsg =
        toFlip > 0
          ? `${glyph} ${player.name} found ${label} — +${toFlip} ${FACE_NAMES[faceId]}!`
          : `${glyph} ${player.name} found ${label}, but had nothing left to reveal!`;

      if (this.checkGameOver()) {
        this.state.message = setMsg ? `${setMsg}` : leadMsg;
        return;
      }

      // Unlike a direct match, a bonus find ends the turn either way —
      // it's a rewarding find, but not a reason to keep flipping too.
      this.advanceTurn(setMsg ? setMsg : `${leadMsg} Turn passes.`);
      return;
    }

    // Face card.
    const faceId = deckCard.faceId!;

    if (faceId === player.targetFaceId) {
      // Matches the flipper's own fixed target.
      const { newCount, total, setMsg } = this.creditFace(player, faceId, 1);

      if (this.checkGameOver()) {
        this.state.message = setMsg ?? `${player.name} found ${FACE_NAMES[faceId]}.`;
        return;
      }

      if (setMsg) {
        // That was their last copy — done for the game, turn passes.
        this.advanceTurn(setMsg);
      } else {
        this.state.message = `${player.name} found ${FACE_NAMES[faceId]} (${newCount}/${total}). Flip again!`;
      }
      return;
    }

    // Wrong tile for the flipper — but if it's some other still-playing
    // player's fixed target, it's credited to *them* instead of being
    // wasted, since there are only 4 players and 6 faces to go around.
    const owner = this.findTargetOwner(faceId, player.id);
    let setMsg: string | null = null;
    let leadMsg: string;
    if (owner) {
      const credit = this.creditFace(owner, faceId, 1);
      setMsg = credit.setMsg;
      leadMsg = `${player.name} found ${FACE_NAMES[faceId]} for ${owner.name}!`;
    } else {
      leadMsg = `${player.name} revealed the wrong tile.`;
    }

    if (this.checkGameOver()) {
      this.state.message = setMsg ? `${leadMsg} ${setMsg}` : leadMsg;
      return;
    }

    this.advanceTurn(setMsg ? `${leadMsg} ${setMsg}` : `${leadMsg} Turn passes.`);
  }

  private advanceTurn(reason: string) {
    const n = this.state.turnOrder.length;
    const startIdx = this.state.currentPlayerIndex;
    let idx = startIdx;
    let found = false;

    // Only ever consider the OTHER n-1 seats here — never wrap back around
    // to re-examine the player whose turn just ended. Without this bound,
    // a skull's `player.skipNextTurn = true` (set immediately before this
    // call) could get silently cleared by this same loop reaching their own
    // seat again, handing them back the turn right away with their penalty
    // wiped — exactly the "plays twice in a row" bug this fixes.
    for (let attempts = 0; attempts < n - 1; attempts++) {
      idx = (idx + 1) % n;
      const candidate = this.state.players.get(this.state.turnOrder[idx]);
      if (!candidate || !candidate.connected) continue;
      if (this.isFinished(candidate)) continue; // done for the game — never gets another turn
      if (candidate.skipNextTurn) {
        candidate.skipNextTurn = false;
        continue;
      }
      found = true;
      break;
    }

    // Nobody else can take a turn right now (everyone else is finished,
    // disconnected, or was already owed a skip) — same edge case Solo hits
    // with only one player: there's no one else to hand the turn to, so it
    // stays right where it is, untouched.
    if (!found) idx = startIdx;

    this.state.currentPlayerIndex = idx;
    const next = this.state.players.get(this.state.turnOrder[idx]);
    this.state.message = next
      ? `${reason} ${next.name}'s turn — hunt for ${FACE_NAMES[next.targetFaceId]}!`
      : reason;
  }
}
