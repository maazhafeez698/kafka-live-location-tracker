import "dotenv/config";
import connectDB from "./src/common/config/db.connection.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(
      `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`,
    );
  });
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
