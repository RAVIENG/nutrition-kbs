import assert from "node:assert/strict";
import test from "node:test";
import { errorHandler } from "../middleware/errorMiddleware.js";
import ApiError from "../utils/ApiError.js";

test("development API error log records endpoint, status, and provider without query data", () => {
  const previousEnvironment = process.env.NODE_ENV;
  const originalWarn = console.warn;
  const logs = [];
  let statusCode;
  let responseBody;
  process.env.NODE_ENV = "development";
  console.warn = (line) => logs.push(line);
  try {
    errorHandler(
      new ApiError(503, "FoodTales rate or credit limit reached."),
      { method: "GET", originalUrl: "/api/tracking/foodtales/search?q=private" },
      {
        status(code) { statusCode = code; return this; },
        json(body) { responseBody = body; return this; },
      },
      () => {},
    );
  } finally {
    console.warn = originalWarn;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
  assert.equal(statusCode, 503);
  assert.equal(responseBody.message, "FoodTales rate or credit limit reached.");
  assert.equal(logs[0], "[API ERROR] GET /api/tracking/foodtales/search status=503 source=FoodTales");
});
