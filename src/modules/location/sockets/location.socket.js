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
    console.log(`User connected: ${socket.user.id}`);

    socket.emit("server:session", {
      user: {
        id: socket.user.id,
        name: socket.user.name,
      },
    });

    socket.on("location:update", async (data, callback) => {
      try {
        const now = Date.now();
        const lastUpdate = lastLocationUpdate.get(socket.user.id);

        if (lastUpdate && now - lastUpdate < LOCATION_RATE_LIMIT_MS) {
          const elapsed = now - lastUpdate;

          console.log(
            `Location rate-limited for user ${socket.user.id}. ` +
              `Only ${elapsed}ms since last update.`,
          );

          callback?.({
            success: false,
            message: "Location updates are too frequent",
          });

          return;
        }

        lastLocationUpdate.set(socket.user.id, now);

        console.log(`Location accepted for user ${socket.user.id}`);

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
        console.error("Location update failed:", error);

        callback?.({
          success: false,
          message: error.message,
        });
      }
    });

    socket.on("disconnect", () => {
      lastLocationUpdate.delete(socket.user.id);

      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  await startRealtimeConsumer(io);

  return io;
};

export default initializeLocationSocket;
