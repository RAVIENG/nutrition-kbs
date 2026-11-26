import assert from "node:assert/strict";
import test from "node:test";
import {
  GENERAL_API_LIMIT,
  reportGeneralApiLimit,
  shouldSkipGeneralApiRateLimit,
} from "../utils/apiRateLimit.js";

test("general API rate limit leaves login and CSRF bootstrap to auth protection", () => {
  assert.equal(shouldSkipGeneralApiRateLimit({ originalUrl: "/api/auth/login" }), true);
  assert.equal(shouldSkipGeneralApiRateLimit({ originalUrl: "/api/auth/csrf" }), true);
  assert.equal(shouldSkipGeneralApiRateLimit({ originalUrl: "/api/auth/login?next=%2Fdashboard" }), true);
  assert.equal(shouldSkipGeneralApiRateLimit({ originalUrl: "/api/auth/register" }), false);
  assert.equal(shouldSkipGeneralApiRateLimit({ originalUrl: "/api/tracking/day" }), false);
});

test("general API limiter keeps a broad cap and responds with the configured 429 body", () => {
  assert.equal(GENERAL_API_LIMIT, 600);
  let statusCode;
  let body;
  const response = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  try {
    reportGeneralApiLimit(
      { method: "GET", originalUrl: "/api/users/options" },
      response,
      () => {},
      { statusCode: 429, message: { success: false, message: "Too many requests" } },
    );
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
  assert.equal(statusCode, 429);
  assert.deepEqual(body, { success: false, message: "Too many requests" });
});
