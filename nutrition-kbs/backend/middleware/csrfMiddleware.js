import crypto from "crypto";
import ApiError from "../utils/ApiError.js";

const COOKIE_NAME = "csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const isProduction =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";

const cookieOptions = () => ({
  httpOnly: false,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const issueCsrfToken = (req, res) => {
  // Reuse a valid token so multiple tabs do not invalidate each other.
  const token =
    req.cookies[COOKIE_NAME] || crypto.randomBytes(32).toString("hex");
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ success: true, csrfToken: token });
};

export const verifyCsrfToken = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies[COOKIE_NAME];
  const headerToken = req.get("X-CSRF-Token");

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return next(
      new ApiError(403, "Request security check failed. Refresh and try again."),
    );
  }

  next();
};
