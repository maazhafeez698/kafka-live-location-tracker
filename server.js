import "dotenv/config";

import http from "http";

import connectDB from "./src/common/config/db.connection.js";
import app from "./src/app.js";

import initializeLocationSocket from "./src/modules/location/sockets/location.socket.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);

  initializeLocationSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(
      `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`,
    );
  });
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
