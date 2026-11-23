import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import initializeSocket from "./socket/socket.js";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 5_000_000,
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5137",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initializeSocket(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.IO server initialized");
});
