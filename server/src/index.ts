import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BeastsRoom } from "./rooms/BeastsRoom";
import { billingRouter } from "./billing/routes";
import { billingWebhookHandler } from "./billing/webhook";

const app = express();
app.use(cors());
// Stripe signs the raw request body, so this route needs express.raw()
// instead of the global express.json() parser below — it must be
// registered first, before that parser consumes the body as JSON.
app.post("/billing/webhook", express.raw({ type: "application/json" }), billingWebhookHandler);
app.use(express.json());
app.get("/", (_req, res) => res.send("Bones & Beasts server is running."));
app.use("/billing", billingRouter);

const port = Number(process.env.PORT) || 2567;
const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("bones_beasts", BeastsRoom);

httpServer.listen(port, () => {
  console.log(`Bones & Beasts server listening on ws://localhost:${port}`);
});
