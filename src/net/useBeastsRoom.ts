import { useEffect, useState } from "react";
import { Room } from "colyseus.js";
import { OnlineSnapshot, snapshotFromState } from "../types/online";

export function useBeastsRoom(room: Room | null): OnlineSnapshot | null {
  const [snapshot, setSnapshot] = useState<OnlineSnapshot | null>(null);

  useEffect(() => {
    if (!room) {
      setSnapshot(null);
      return;
    }
    // room.state / its nested collections aren't guaranteed populated the
    // instant the room object exists — the initial sync from the server
    // arrives asynchronously. Skip until onStateChange actually fires with
    // real data; LobbyScreen already renders a loading spinner while
    // snapshot is null.
    const update = () => {
      if (!room.state || !room.state.players) return;
      setSnapshot(snapshotFromState(room.state));
    };
    update();
    room.onStateChange(update);
    return () => {
      room.onStateChange.remove(update);
    };
  }, [room]);

  return snapshot;
}
