import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BeastsRoom } from "./rooms/BeastsRoom";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (_req, res) => res.send("Bones & Beasts server is running."));

const port = Number(process.env.PORT) || 2567;
const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("bones_beasts", BeastsRoom);

httpServer.listen(port, () => {
  console.log(`Bones & Beasts server listening on ws://localhost:${port}`);
});
