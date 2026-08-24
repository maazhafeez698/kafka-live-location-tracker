import { Server } from "socket.io";

import authenticateSocket from "./socket-auth.js";
import { publishUserLocation } from "../services/location.service.js";
import startRealtimeConsumer from "../kafka/consumers/realtime.consumer.js";

const initializeLocationSocket = async (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:4000",
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    socket.on("location:update", async (data, callback) => {
      try {
        const event = await publishUserLocation({
          userId: socket.user.id,
          latitude: data.latitude,
          longitude: data.longitude,
        });

        callback?.({
          success: true,
          event,
        });
      } catch (error) {
        console.error("Location update failed:", error);

        callback?.({
          success: false,
          message: error.message,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  await startRealtimeConsumer(io);

  return io;
};

export default initializeLocationSocket;
