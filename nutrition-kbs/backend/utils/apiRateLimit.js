const AUTH_BOOTSTRAP_PATHS = new Set([
  "/api/auth/csrf",
  "/api/auth/login",
]);

export const GENERAL_API_LIMIT = 600;

export const createRateLimitHandler = (limiterName) => (req, res, _next, options) => {
  if (process.env.NODE_ENV === "development") {
    const path = (req.originalUrl || req.url || "").split("?", 1)[0];
    console.warn(`[RATE LIMIT] ${req.method} ${path} status=${options.statusCode} limiter=${limiterName}`);
  }
  res.status(options.statusCode).json(options.message);
};

export const reportGeneralApiLimit = createRateLimitHandler("general-api");

export const shouldSkipGeneralApiRateLimit = (req) => {
  const pathname = new URL(req.originalUrl || req.url, "http://localhost").pathname;
  return AUTH_BOOTSTRAP_PATHS.has(pathname);
};
