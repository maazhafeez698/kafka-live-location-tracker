import "dotenv/config";
import http from "http";

import connectDB from "./src/common/config/db.connection.js";
import app from "./src/app.js";
import initializeLocationModule from "./src/modules/location/location.module.js";

const PORT = process.env.PORT || 4000;

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);

  initializeLocationModule(httpServer).catch((error) => {
    console.error("Failed to initialize location module:", error);
  });

  httpServer.listen(PORT, () => {
    console.log(
      `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`,
    );
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
