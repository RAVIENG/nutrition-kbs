import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import sanitizeInput from "./utils/sanitize.js";
import { issueCsrfToken, verifyCsrfToken } from "./middleware/csrfMiddleware.js";
import {
  GENERAL_API_LIMIT,
  reportGeneralApiLimit,
  shouldSkipGeneralApiRateLimit,
} from "./utils/apiRateLimit.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import nutritionRoutes from "./routes/nutritionRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";

// 1. Initialize Express
const app = express();

// Render terminates one trusted proxy hop. Keep direct local requests untrusted.
app.set("trust proxy", process.env.RENDER === "true" ? 1 : false);

// 2. Security headers
app.use(helmet());

// 3. CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

// 4. Rate limiting
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: GENERAL_API_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    // Login has its own stricter limiter. Let login and its CSRF bootstrap
    // request reach that limiter even if normal API traffic hit the shared cap.
    skip: shouldSkipGeneralApiRateLimit,
    handler: reportGeneralApiLimit,
    message: {
      success: false,
      message: "Too many requests, please try again later",
    },
  }),
);

// 5. Parse incoming JSON
app.use(express.json({ limit: "10kb" }));

// 6. Parse cookies
app.use(cookieParser());

// Cookie-authenticated requests also need a same-origin CSRF token.
app.get("/api/auth/csrf", issueCsrfToken);
app.use(verifyCsrfToken);

// 7. Sanitize incoming input
app.use(sanitizeInput);

// 8. Health check
app.get("/api/health", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    message: databaseReady
      ? "NutriGuide API is running"
      : "NutriGuide database is unavailable",
  });
});

// 9. API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/tracking", trackingRoutes);

// 10. Handle unknown routes
app.use(notFound);

// 11. Global error handler
app.use(errorHandler);

export default app;
