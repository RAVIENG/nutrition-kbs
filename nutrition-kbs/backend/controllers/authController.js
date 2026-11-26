import User from "../models/User.js";
import crypto from "crypto";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendTokenCookie, clearTokenCookie } from "../utils/generateToken.js";

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
});

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ email }))
    throw new ApiError(409, "Email is already registered");

  // Role is NOT taken from the request: everyone registers as a normal user
  const user = await User.create({ name, email, password });

  sendTokenCookie(res, user._id);
  res.status(201).json({ success: true, user: publicUser(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  // Same message for "no such user" and "wrong password" so attackers can't tell which
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  sendTokenCookie(res, user._id);
  res.json({ success: true, user: publicUser(user) });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.json({ success: true, message: "Logged out" });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  // Reset links are only exposed through the local development console until
  // email delivery is configured. Never put reset tokens in hosted logs.
  if (process.env.NODE_ENV !== "development" || process.env.RENDER === "true") {
    throw new ApiError(503, "Password reset email delivery is not configured.");
  }

  const user = await User.findOne({ email: req.body.email });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = hashToken(resetToken); // only the hash is stored
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    const link = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    // Demo mode: a real deployment would email this link instead
    console.log(`\n[PASSWORD RESET] Link for ${user.email}:\n${link}\n`);
  }

  // Same response whether or not the email exists, so attackers cannot discover registered emails
  res.json({
    success: true,
    message:
      "If that email is registered, a password reset link has been generated.",
  });
});

// POST /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: hashToken(req.params.token),
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, "Reset link is invalid or has expired");

  user.password = req.body.password; // the pre-save hook hashes it
  user.passwordResetToken = undefined; // one-time use
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ success: true, message: "Password updated. You can now log in." });
});
