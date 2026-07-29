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

const PLAYER_COLORS = ["#C9A227", "#4C8B71", "#9C3B3B", "#6E8FB8"];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const COUNTDOWN_START = 3;

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
  const faceIds = [1, 2, 3, 4, 5, 6];

  for (const f of faceIds) {
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

export class BeastsRoom extends Room<BeastsState> {
  maxClients = MAX_PLAYERS;

  // The true deck lives only on the server; the synced schema only ever
  // reflects revealed cards. This is what actually keeps the game fair.
  private deck: DeckCard[] = [];
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

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

    // Game already in progress: keep their collected progress, just mark them
    // disconnected and skip past them if it was their turn.
    player.connected = false;
    if (this.state.turnOrder[this.state.currentPlayerIndex] === client.sessionId) {
      this.advanceTurn(`${player.name} disconnected — turn passes.`);
    }
  }

  onDispose() {
    this.cancelCountdown();
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
    this.state.message = `${first?.name}'s turn — roll the dice!`;
  }

  private currentClientId(): string {
    return this.state.turnOrder[this.state.currentPlayerIndex];
  }

  private handleRollDice(client: Client) {
    if (this.state.phase !== "rolling") return;
    if (client.sessionId !== this.currentClientId()) return;

    const value = Math.floor(Math.random() * 6) + 1;
    this.state.diceValue = value;
    this.state.targetFaceId = value;
    this.state.phase = "flipping";
    const player = this.state.players.get(client.sessionId)!;
    this.state.message = `${player.name}: hunt for ${FACE_NAMES[value]}!`;
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
      this.state.completions.push(completion);
      setMsg = `🏆 ${player.name} completed the ${FACE_NAMES[faceId]} set — place ${order}!`;
    }
    return { newCount, total, setMsg };
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
      player.skipNextTurn = true;
      this.advanceTurn(`💀 ${player.name} hit a skull! Turn lost, next turn skipped.`);
      return;
    }

    if (deckCard.type === "bonusSmall" || deckCard.type === "bonusBig") {
      // Bonus tiles don't just credit progress silently — they also flip
      // that many real, still-hidden copies of the *flipping* player's own
      // current target on the board by themselves (capped by how many are
      // actually left), so the board and the collection count always agree.
      // Never affects anyone else's cards.
      const amount = deckCard.type === "bonusSmall" ? BONUS_SMALL_AMOUNT : BONUS_BIG_AMOUNT;
      const label = deckCard.type === "bonusSmall" ? "a bonus gem" : "an ancient idol";
      const glyph = deckCard.type === "bonusSmall" ? BONUS_SMALL_EMOJI : BONUS_BIG_EMOJI;
      const faceId = this.state.targetFaceId;

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

      if (this.state.completions.length === 6) {
        this.state.phase = "gameOver";
        this.state.endedAt = Date.now();
        this.state.message = setMsg
          ? `${setMsg} All 6 sets found!`
          : "All 6 sets found! Game over.";
        return;
      }

      this.state.phase = "flipping";
      this.state.message =
        setMsg ??
        (toFlip > 0
          ? `${glyph} ${player.name} found ${label} — +${toFlip} ${FACE_NAMES[faceId]}!`
          : `${glyph} ${player.name} found ${label}, but had nothing left to reveal!`);
      return;
    }

    // Face card: always banked to the flipping player's own tally, whether
    // or not it matches this turn's target — nothing found is ever wasted.
    const faceId = deckCard.faceId!;
    const isMatch = faceId === this.state.targetFaceId;
    const { newCount, total, setMsg } = this.creditFace(player, faceId, 1);

    if (this.state.completions.length === 6) {
      this.state.phase = "gameOver";
      this.state.endedAt = Date.now();
      this.state.message = setMsg ? `${setMsg} All 6 sets found!` : "All 6 sets found! Game over.";
      return;
    }

    if (isMatch) {
      this.state.phase = "flipping";
      this.state.message =
        setMsg ?? `${player.name} found ${FACE_NAMES[faceId]} (${newCount}/${total}). Flip again!`;
    } else {
      this.advanceTurn(
        (setMsg ? setMsg + " " : "") +
          `${player.name} found the wrong tile (banked for later) — turn passes.`
      );
    }
  }

  private advanceTurn(reason: string) {
    const n = this.state.turnOrder.length;
    let idx = this.state.currentPlayerIndex;

    for (let attempts = 0; attempts < n; attempts++) {
      idx = (idx + 1) % n;
      const candidate = this.state.players.get(this.state.turnOrder[idx]);
      if (!candidate) continue;
      if (candidate.skipNextTurn) {
        candidate.skipNextTurn = false;
        continue;
      }
      break;
    }

    this.state.currentPlayerIndex = idx;
    this.state.diceValue = 0;
    this.state.targetFaceId = 0;
    this.state.phase = "rolling";
    const next = this.state.players.get(this.state.turnOrder[idx]);
    this.state.message = `${reason} ${next?.name}'s turn — roll the dice!`;
  }
}
