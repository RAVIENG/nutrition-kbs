import assert from "node:assert/strict";
import test from "node:test";

import { verifyCsrfToken } from "../middleware/csrfMiddleware.js";
import {
  buildConversationInput,
  extractGeminiText,
  generateNutritionReply,
} from "../services/geminiService.js";
import { foodRegionFilter } from "../utils/foodFilters.js";
import { isWithinServingBudget } from "../utils/recommendationFilters.js";

test("regional food filtering includes Pan-India records", () => {
  assert.deepEqual(foodRegionFilter("Kerala"), {
    $in: ["Kerala", "Pan-India"],
  });
  assert.equal(foodRegionFilter("Pan-India"), "Pan-India");
  assert.equal(foodRegionFilter(undefined), undefined);
});

test("a budget cap excludes over-budget and unknown-price foods", () => {
  assert.equal(isWithinServingBudget({ price: { perServing: 25 } }, 25), true);
  assert.equal(isWithinServingBudget({ price: { perServing: 25.01 } }, 25), false);
  assert.equal(isWithinServingBudget({ price: null }, 25), false);
  assert.equal(isWithinServingBudget({ price: null }, undefined), true);
});

test("CSRF middleware accepts a matching double-submit token", () => {
  let nextCalled = false;
  let nextError;
  verifyCsrfToken(
    {
      method: "POST",
      cookies: { "csrf-token": "token-123" },
      get: () => "token-123",
    },
    {},
    (error) => {
      nextCalled = true;
      nextError = error;
    },
  );
  assert.equal(nextCalled, true);
  assert.equal(nextError, undefined);
});

test("CSRF middleware rejects missing or mismatched tokens", () => {
  let nextError;
  verifyCsrfToken(
    { method: "DELETE", cookies: {}, get: () => undefined },
    {},
    (error) => {
      nextError = error;
    },
  );
  assert.equal(nextError?.statusCode, 403);
});

test("CSRF middleware allows safe read methods", () => {
  let nextCalled = false;
  verifyCsrfToken(
    { method: "GET", cookies: {}, get: () => undefined },
    {},
    () => {
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, true);
});

test("Gemini prompt uses only relevant profile preferences and recent context", () => {
  const input = buildConversationInput({
    message: "What can I eat for breakfast?",
    history: [{ role: "user", text: "I need something quick." }],
    profile: {
      name: "Private Name",
      email: "private@example.test",
      dietaryPreference: "vegetarian",
      allergies: ["peanuts"],
      restrictions: [],
      healthGoal: "balanced_nutrition",
    },
  });

  assert.match(input, /vegetarian/);
  assert.match(input, /peanuts/);
  assert.match(input, /I need something quick/);
  assert.doesNotMatch(input, /Private Name|private@example\.test/);
});

test("Gemini response text is extracted from model output steps", () => {
  assert.equal(
    extractGeminiText({
      steps: [
        { type: "thought", content: [{ type: "text", text: "hidden" }] },
        { type: "model_output", content: [{ type: "text", text: "Try dal and curd." }] },
      ],
    }),
    "Try dal and curd.",
  );
});

test("Gemini requests keep the key in a header and disable provider-side history storage", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  let captured;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return new Response(
      JSON.stringify({
        status: "completed",
        steps: [{ type: "model_output", content: [{ type: "text", text: "A balanced plate has variety." }] }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const reply = await generateNutritionReply({
      message: "What is a balanced plate?",
      history: [],
      profile: null,
    });
    assert.equal(reply, "A balanced plate has variety.");
    assert.equal(captured.options.headers["x-goog-api-key"], "test-key");
    assert.equal(captured.url.includes("test-key"), false);
    assert.equal(captured.body.store, false);
    assert.equal(captured.options.headers["Api-Revision"], "2026-05-20");
    assert.equal(captured.body.model, "gemini-3.5-flash-lite");
    assert.equal(captured.body.generation_config.max_output_tokens, 700);
    assert.equal("temperature" in captured.body.generation_config, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test("Gemini service retries model overload on the free-tier Flash-Lite model", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_MODEL;
  const previousFetch = globalThis.fetch;
  const requestedModels = [];
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "gemini-3.8-flash";
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requestedModels.push(body.model);
    if (requestedModels.length === 1) return new Response("{}", { status: 503 });
    return new Response(
      JSON.stringify({
        status: "completed",
        steps: [{ type: "model_output", content: [{ type: "text", text: "Try dal with rice." }] }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const reply = await generateNutritionReply({
      message: "Suggest a vegetarian protein meal.",
      history: [],
      profile: null,
    });
    assert.equal(reply, "Try dal with rice.");
    assert.deepEqual(requestedModels, ["gemini-3.8-flash", "gemini-3.5-flash-lite"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
  }
});

test("Gemini quota responses return a temporary-unavailable error", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = async () => new Response("{}", { status: 429 });

  try {
    await assert.rejects(
      generateNutritionReply({ message: "Question", history: [], profile: null }),
      { statusCode: 503 },
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test("Gemini incomplete interactions are rejected instead of shown as complete", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: "incomplete",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: "A partly generated response" }],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  try {
    await assert.rejects(
      generateNutritionReply({ message: "Question", history: [], profile: null }),
      { statusCode: 502 },
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
