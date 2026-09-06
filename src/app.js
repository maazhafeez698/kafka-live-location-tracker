import express from "express";
import authRoute from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";
import ApiError from "./common/utils/api-error.js";
import path from "path";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(process.cwd(), "public")));

app.use("/api/auth", authRoute);

app.all("{*path}", (req, res) => {
  throw ApiError.notFound(`Route ${req.originalUrl} not found`);
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] Error: ${message}`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
});

export default app;
