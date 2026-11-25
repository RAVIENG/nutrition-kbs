import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import sanitizeInput from "./utils/sanitize.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import nutritionRoutes from "./routes/nutritionRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";

// 1. Initialize Express
const app = express();

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
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
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

// 7. Sanitize incoming input
app.use(sanitizeInput);

// 8. Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "NutriGuide API is running",
  });
});

// 9. API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/recommendations", recommendationRoutes);

// 10. Handle unknown routes
app.use(notFound);

// 11. Global error handler
app.use(errorHandler);

export default app;
