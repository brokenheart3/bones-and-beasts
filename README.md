# Bones & Beasts

A memory/dice hybrid game built with Expo + React Native + TypeScript. Runs on iOS, Android, and web from one codebase.

## Setup

```bash
cd bones-and-beasts
npm install
npx expo start
```

Then press `w` for web, `i` for iOS simulator, `a` for Android emulator, or scan the QR code with the Expo Go app on your phone.

**Online Group play** needs the game server. For local development:
```bash
cd server
npm install
npm run dev
```
This starts it at `ws://localhost:2567`. The client defaults to `EXPO_PUBLIC_SERVER_URL` from `.env` (copy `.env.example`) — set it to `ws://localhost:2567` for local dev, or your machine's LAN IP (e.g. `ws://192.168.1.20:2567`) when testing on a physical device that can't resolve "localhost". See `src/net/colyseusClient.ts`.

**Deployed server:** the server is also deployed to Railway at `wss://bones-and-beasts-server-production.up.railway.app` (project `bones-and-beasts-server` under the Railway account used to deploy it) — this is the client's default when `EXPO_PUBLIC_SERVER_URL` isn't set. To redeploy after server changes:
```bash
cd server
railway up
```
`server/railway.json` configures the build (`npm run build`) and start (`npm start`) commands; the server already reads `process.env.PORT`, which Railway sets automatically.

## App structure

- **Onboarding:** first launch asks for a username (`Settings > Profile`), stored on-device (AsyncStorage). No accounts/sign-in yet — that's future work.
- **Home tab:** welcomes the player by name, with two options — **Play Solo** (local, no networking) or **Find a Group** (online only, 2-4 players, matched into a live lobby by the Colyseus server in `server/`).
- **Play tab:** the game itself — see rules below.
- **Stats tab:** on-device history of completed local games (games played, your wins, sets completed, recent games list). Online games aren't recorded here yet.
- **Settings tab:** a stack with Profile, App Settings (theme + data reset, see below), Privacy Policy, Terms of Service, and About.

## Solo rules vs. online Group rules

Solo play and online Group play currently run on **two different rule
sets** — the server (`server/src/rooms/BeastsRoom.ts`) was ported from an
earlier prototype as-is rather than rewritten to match Solo's rules, so
they diverge until a later reconciliation pass:

|                    | Solo (local)                                    | Group (online)                                  |
|--------------------|--------------------------------------------------|--------------------------------------------------|
| Target face        | Rolled once, fixed for the whole game             | Re-rolled every turn                              |
| Wrong-face flip     | Not credited to anyone                            | Still credited to the flipping player's own tally |
| Skull               | 5-second forced pause (no one else to skip to)    | Turn passes, that player skips their next turn    |
| Bonus tiles         | Yes — instant, self-only progress (see below)     | Yes — same mechanic, credited to your current target |
| Extra lose condition| Yes — see below                                   | No                                                |
| Game end            | Everyone's completed their set, or board cleared  | All 6 sets completed by anyone                    |

## Solo rules implemented

- **Board:** 42 tiles (6 rows x 6 columns) = 3 skulls + 2 bonus gems (💎) +
  1 bonus idol (🏺) + 36 animal-face tiles (Lion, Elephant, Monkey, Tiger,
  Giraffe, Zebra — 6 copies each, unchanged).
- **Setup roll:** an animated roll-and-reveal sequence on the Play screen picks your fixed **target face** for the game. No re-rolling later.
- **Flipping:** tap any tile.
  - Matches your target face → stays revealed, added to your collection, **keep flipping**.
  - Wrong face (a real animal, just not yours) → stays revealed permanently as a memory hint, and if every copy of that face gets revealed before you finish your own set, **you lose** — someone else's beast beat you to it.
  - Skull → stays revealed, and the screen freezes for a 5-second countdown before you can flip again (there's no one else to pass the turn to).
  - Bonus gem (💎, 2 on the board) → automatically flips **1** other still-hidden real copy of your own target face for you (capped by how many you still need and how many are actually left on the board), crediting it exactly like finding it yourself. Behaves like a match — **keep flipping**. A "You found a Bonus Gem!" banner flashes on screen.
  - Bonus idol (🏺, only 1 on the board — a rare jackpot) → same, but auto-flips up to **3** copies. Bonus tiles only ever affect whoever flips them, and the board and your collection count always stay in sync since it's real tiles being revealed, not just a hidden counter.
- **Completing your set:** once you collect every copy of your target face (by flipping, bonuses, or both), you win — the ranking screen shows it as the game's 1st (and only) completed set.
- **Game end:** you complete your set (win), someone else's face gets fully revealed first (lose), or the whole board gets cleared without either happening.
- **Win/loss announcement:** right before the ranking screen, a 5-second banner ("You found all 6 [Face] cards!" 🏆, or "You Lost!" 💀) appears over the board so you get a clear moment to see whether you won or lost — it waits for the deciding flip's own reveal (and any bonus popup it triggered) to be visible first, so you can see exactly which card ended the game. Applies the same way in online Group play, judged from each player's own completion (or lack of one) rather than a shared win/lose state.
- **Game timer:** a live stopwatch (⏱, top-right of the board) starts the moment the game begins and freezes the instant it ends — shown ticking during play, then held on the win/loss banner and the ranking screen. Also applies to online Group play. Solo wins are logged to Stats (`durationMs` on each `GameRecord`), which surfaces a "Best solo time" tile and per-game times in the recent-games list.

## Theming

`Settings > App Settings` has a real, live Dark/Light toggle (persisted via
`useSettingsStore`, `AsyncStorage`-backed like Profile/Stats). Design rule
(see `src/theme.ts`): the carved-stone/gold "game pieces" — tiles, dice,
buttons, gold/moss/danger accents — stay the same real-world material color
in both modes, exactly like a physical stone tablet doesn't change color
between day and night. Only the *ambient scene* around them — page
background, panels, and general body text — actually inverts, going from
the original deep-jungle night look to a sunlit sandstone-courtyard day
look. Every screen/component reads colors through the `useTheme()` hook
(no static `theme` export) so the whole app reskins live the instant the
toggle is flipped, no restart needed. The three full-screen "always dark"
overlays (`SkullPauseOverlay`, `BonusFoundOverlay`, `GameResultOverlay`)
intentionally opt out of this — their dimming backdrop stays a fixed dark
scrim regardless of theme, like any modal overlay, so their text colors are
hardcoded literals rather than theme tokens.

`App Settings` also has a **Reset local data** action (with an in-app
confirm step, since `Alert.alert` isn't reliable on web) that clears Stats
history and the saved username, sending the player back through onboarding
— useful for testing or handing a device to someone else.

## Assumptions worth revisiting

These were reasonable defaults picked where the spec was open — flag anything you want changed and I'll adjust the store logic in `src/store/useGameStore.ts`:

1. **Grid shape:** the board renders as 6 columns x 7 rows (42 tiles total). This is just a layout choice in `GridBoard.tsx` (`COLUMNS = 6`) — change that constant if you'd rather have 7 columns x 6 rows. It doesn't affect gameplay logic.
2. **Wrong-face tiles stay revealed permanently** — this makes the game get easier over time as the board fills in with visible info.
3. **Winner ranking** is by total sets completed, tie-broken by who finished each set earliest.
4. **No re-roll:** while hunting, the player does not re-roll after each correct find — they keep flipping toward the same target until they miss or hit a skull.
5. **Dice-roll reveal animation** (grow + spin + settle, then a 3-stage pop-in for "Your card is X") is a bouncy-overshoot interpretation rather than a literal repeated-doubling final size — see `DiceRollStage.tsx` if you want it more dramatic.
6. **Stats** only track local Solo games recorded from this device going forward; online Group games aren't recorded yet, and there's no historical backfill.
7. **Bonus idol amount (+3)**: with only 1 idol on the whole board this is a rare jackpot rather than a reliable strategy, so the earlier concern about it overshadowing memory gameplay is much smaller now — still a one-line change (`BONUS_BIG_AMOUNT` in `useGameStore.ts` / `BeastsRoom.ts`) if you want it gentler.
8. **Light theme palette** (`lightColors` in `theme.ts`) is a reasonable-effort pass for contrast and mood, not an accessibility-audited color scheme — nudge any specific hex if something reads too soft.

## Where to go next

- Swap the emoji glyphs for real illustrated tile art (drop images into an `assets/` folder and reference them in `Card.tsx`).
- Add sound effects on flip/skull/set-complete/dice-roll via `expo-av`.
- Add a custom carved-stone display font via `@expo-google-fonts` (e.g. Cinzel) for the title and legend numbers.
- Real accounts/sign-in, replacing the local-only username in `useProfileStore`.
- Privacy Policy / Terms of Service / About now accurately describe the app's actual current behavior (see `src/screens/settings/`), but still haven't been reviewed by a lawyer — have one review them before a real release.
- Reconcile online Group's rules with Solo's (fixed personal targets, no wrong-face banking, the solo lose condition) so both modes play the same game.
- Record online games in Stats too.
- The Railway deployment is on whatever free/starter plan was active at setup time — check usage/billing before relying on it for real traffic, and consider a healthcheck path + custom domain for a production release.
# bones-and-beasts
# bones-and-beasts
