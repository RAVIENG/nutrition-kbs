import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { COOKIE_NAME } from "../utils/generateToken.js";

// Protects a route: only logged-in users pass
export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) throw new ApiError(401, "Not logged in");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Session expired or invalid, please log in again");
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, "User no longer exists");

  req.user = user; // available in every later controller
  next();
});
