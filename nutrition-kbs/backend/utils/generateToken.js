import jwt from "jsonwebtoken";

const COOKIE_NAME = "token";

export const sendTokenCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // JavaScript in the browser cannot read it
    secure: process.env.COOKIE_SECURE === "true", // true only on HTTPS
    sameSite: "lax", // basic CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookie = (res) => {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    expires: new Date(0),
  });
};

export { COOKIE_NAME };
