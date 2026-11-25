import jwt from "jsonwebtoken";

const COOKIE_NAME = "token";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

export const sendTokenCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearTokenCookie = (res) => {
  res.cookie(COOKIE_NAME, "", {
    ...cookieOptions,
    expires: new Date(0),
  });
};

export { COOKIE_NAME };
