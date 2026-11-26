const validMongoUri = (value) => /^mongodb(?:\+srv)?:\/\//i.test(value);

const validClientUrl = (value) => {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
};

export const environmentErrors = (env = process.env) => {
  const errors = [];
  const deployed = env.NODE_ENV === "production" || env.RENDER === "true";

  if (!env.MONGO_URI?.trim() || !validMongoUri(env.MONGO_URI.trim())) {
    errors.push("MONGO_URI must be a MongoDB connection URI");
  }
  if (!env.JWT_SECRET?.trim() || env.JWT_SECRET.trim().length < 32) {
    errors.push("JWT_SECRET must contain at least 32 characters");
  }
  if (!env.CLIENT_URL?.trim() || !validClientUrl(env.CLIENT_URL.trim())) {
    errors.push("CLIENT_URL must be an origin URL without a path");
  }
  if (
    env.PORT &&
    (!/^\d+$/.test(env.PORT) || Number(env.PORT) > 65535 || Number(env.PORT) < 1)
  ) {
    errors.push("PORT must be a valid TCP port");
  }

  if (deployed) {
    if (env.CLIENT_URL) {
      try {
        if (new URL(env.CLIENT_URL).protocol !== "https:") {
          errors.push("CLIENT_URL must use HTTPS in production");
        }
      } catch {
        // The URL format error is already reported above.
      }
    }
    if (env.COOKIE_SECURE !== "true") {
      errors.push("COOKIE_SECURE must be true in production");
    }
  } else if (
    env.COOKIE_SECURE &&
    !["true", "false"].includes(env.COOKIE_SECURE)
  ) {
    errors.push("COOKIE_SECURE must be true or false");
  }

  return errors;
};

export const validateEnvironment = (env = process.env) => {
  const errors = environmentErrors(env);
  if (errors.length) {
    throw new Error(`Invalid environment configuration: ${errors.join("; ")}`);
  }
};
