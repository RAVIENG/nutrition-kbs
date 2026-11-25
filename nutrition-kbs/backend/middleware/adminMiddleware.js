import ApiError from "../utils/ApiError.js";

// Use AFTER protect. Only admins pass. This is the real, server-side check.
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(new ApiError(403, "Admin access required"));
  }
  next();
};
