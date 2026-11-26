import assert from "node:assert/strict";
import test from "node:test";
import {
  createReadRequestManager,
  formatApiError,
} from "../../frontend/src/services/readRequestManager.js";

test("GET manager deduplicates concurrent reads, caches briefly, and clears after mutation", async () => {
  const manager = createReadRequestManager({ ttlMs: 10_000 });
  let calls = 0;
  let resolveRequest;
  const request = () => {
    calls += 1;
    return new Promise((resolve) => { resolveRequest = resolve; });
  };
  const first = manager.get("/users/options", request);
  const second = manager.get("/users/options", request);
  assert.equal(calls, 1);
  const response = { data: { options: ["female"] } };
  resolveRequest(response);
  assert.equal(await first, response);
  assert.equal(await second, response);
  assert.equal(await manager.get("/users/options", request), response);
  assert.equal(calls, 1);

  manager.clear();
  const refreshed = await manager.get("/users/options", async () => {
    calls += 1;
    return { data: { options: ["updated"] } };
  });
  assert.deepEqual(refreshed.data.options, ["updated"]);
  assert.equal(calls, 2);
});

test("GET manager retries short HTTP 429 windows with bounded exponential delays", async () => {
  const delays = [];
  const manager = createReadRequestManager({ sleep: async (ms) => delays.push(ms) });
  let attempts = 0;
  const response = await manager.get("/read", async () => {
    attempts += 1;
    if (attempts < 3) throw { response: { status: 429, headers: {} } };
    return { status: 200 };
  });
  assert.equal(response.status, 200);
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [250, 500]);
});

test("GET manager honors long Retry-After windows without retrying", async () => {
  const delays = [];
  const manager = createReadRequestManager({ sleep: async (ms) => delays.push(ms) });
  let attempts = 0;
  await assert.rejects(manager.get("/limited", async () => {
    attempts += 1;
    throw { response: { status: 429, headers: { "retry-after": "60" } } };
  }));
  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

test("API errors identify backend rate limits, upstream service failures, and unreachable backend", () => {
  assert.match(formatApiError({
    config: { url: "/users/options" },
    response: { status: 429, data: { message: "Too many requests, please try again later" } },
  }), /Backend rate limit reached on \/users\/options \(HTTP 429\)/);
  assert.equal(formatApiError({
    config: { url: "/tracking/foodtales/search" },
    response: { status: 503, data: { message: "FoodTales rate or credit limit reached." } },
  }), "FoodTales service on /tracking/foodtales/search (HTTP 503): FoodTales rate or credit limit reached.");
  assert.equal(formatApiError({
    config: { url: "/chat" },
    response: { status: 502, data: { message: "Could not connect to Gemini." } },
  }), "Gemini service on /chat (HTTP 502): Could not connect to Gemini.");
  assert.match(formatApiError({ request: {} }), /Cannot reach the Nutrition KBS backend/);
});
