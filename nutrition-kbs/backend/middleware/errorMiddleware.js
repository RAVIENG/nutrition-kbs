import ApiError from "../utils/ApiError.js";

// Runs when a request reaches no route
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Central error formatter: every error response has the same shape
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Server error";

  // Mongoose: invalid ObjectId, e.g. /api/foods/abc
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  // Mongoose: schema validation failed
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // MongoDB: unique constraint violated (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 409;
    message = `${Object.keys(err.keyValue)[0]} already exists`;
  }

  // Never leak internal details for unexpected errors in production
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Something went wrong";
  }

  if (statusCode >= 500 && process.env.NODE_ENV === "development") {
    const path = (req.originalUrl || req.url || "").split("?", 1)[0];
    const provider = /\b(Gemini|FoodTales|USDA)\b/i.exec(message)?.[1];
    console.warn(`[API ERROR] ${req.method} ${path} status=${statusCode} source=${provider || "backend"}`);
  }
  if (statusCode === 500) console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
