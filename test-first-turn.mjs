import { Client } from "colyseus.js";

const URL = "wss://bones-and-beasts-server-production.up.railway.app";

async function runOnce() {
  const c1 = new Client(URL);
  const c2 = new Client(URL);
  const room1 = await c1.joinOrCreate("bones_beasts", { name: "Alice" });
  const room2 = await c2.joinOrCreate("bones_beasts", { name: "Bob" });

  function currentSessionId(state) {
    return state.turnOrder[state.currentPlayerIndex];
  }

  return new Promise((resolve) => {
    let gameOver = false;
    const turnLog = [];
    let lastMsg = "";

    function act(room, state) {
      if (state.phase === "rolling" && currentSessionId(state) === room.sessionId) {
        room.send("rollDice");
      } else if (state.phase === "flipping" && currentSessionId(state) === room.sessionId) {
        const hidden = state.board.filter((c) => !c.revealed);
        if (hidden.length > 0) room.send("flipCard", { cardId: hidden[0].id });
      }
    }

    function onUpdate(room, state) {
      if (state.phase === "flipping" && state.message !== lastMsg) {
        lastMsg = state.message;
        turnLog.push({
          player: currentSessionId(state),
          msg: state.message,
          board: state.board.filter((c) => c.revealed).length,
        });
      }
      if (state.phase === "gameOver") {
        if (!gameOver) {
          gameOver = true;
          resolve(turnLog);
        }
        return;
      }
      act(room, state);
    }

    room1.onStateChange((s) => onUpdate(room1, s));
    room2.onStateChange((s) => onUpdate(room2, s));
    setTimeout(() => {
      act(room1, room1.state);
      act(room2, room2.state);
    }, 500);
    setTimeout(() => {
      room1.leave();
      room2.leave();
      resolve(turnLog);
    }, 20000);
  });
}

for (let run = 0; run < 8; run++) {
  const log = await runOnce();
  console.log(`=== RUN ${run} (first 6 flipping-phase events) ===`);
  log.slice(0, 6).forEach((e, i) => console.log(`  [${i}] revealedCount=${e.board} player=${e.player.slice(0, 6)} msg="${e.msg}"`));
}
process.exit(0);
