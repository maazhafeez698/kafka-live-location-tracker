import { Server } from "socket.io";

import authenticateSocket from "./socket-auth.js";
import { publishUserLocation } from "../services/location.service.js";
import startRealtimeConsumer from "../kafka/consumers/realtime.consumer.js";

const lastLocationUpdate = new Map();
const LOCATION_RATE_LIMIT_MS = 3000;

const initializeLocationSocket = async (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:4000",
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.emit("server:session", {
      user: {
        id: socket.user.id,
        name: socket.user.name,
      },
    });

    socket.on("location:update", async (data, callback) => {
      try {
        const now = Date.now();
        const lastUpdate = lastLocationUpdate.get(socket.id);

        if (lastUpdate && now - lastUpdate < LOCATION_RATE_LIMIT_MS) {
          const elapsed = now - lastUpdate;

          callback?.({
            success: false,
            message: "Location updates are too frequent",
            retryAfterMs: LOCATION_RATE_LIMIT_MS - elapsed,
          });

          return;
        }

        lastLocationUpdate.set(socket.id, now);

        const event = await publishUserLocation({
          userId: socket.user.id,
          username: socket.user.name,
          latitude: data.latitude,
          longitude: data.longitude,
        });

        callback?.({
          success: true,
          event,
        });
      } catch (error) {
        callback?.({
          success: false,
          message: error.message,
        });
      }
    });

    socket.on("disconnect", () => {
      lastLocationUpdate.delete(socket.id);
    });
  });

  startRealtimeConsumer(io).catch((error) => {
    console.error("Realtime Kafka consumer failed:", error);
  });

  return io;
};

export default initializeLocationSocket;
