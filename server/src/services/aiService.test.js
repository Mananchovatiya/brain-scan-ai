import assert from "node:assert/strict";
import test from "node:test";
import { analyzeScan } from "./aiService.js";

test("returns the clearly labeled mock only when no AI endpoint is configured", async () => {
  const previousEndpoint = process.env.AI_SERVICE_URL;
  delete process.env.AI_SERVICE_URL;
  try {
    const result = await analyzeScan({ scanId: "MRI-TEST", imageUrl: null, format: "jpg" });
    assert.equal(result.source, "mock");
    assert.equal(result.isMock, true);
    assert.match(result.mockDisclaimer, /MOCK AI RESPONSE — NOT A REAL ANALYSIS OR MEDICAL RESULT/);
    assert.equal(result.gradCamUrl, null);
  } finally {
    if (previousEndpoint === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = previousEndpoint;
  }
});

test("validates and identifies FastAPI output", async () => {
  const previousEndpoint = process.env.AI_SERVICE_URL;
  const previousFetch = globalThis.fetch;
  process.env.AI_SERVICE_URL = "http://fastapi.test/analyze";
  globalThis.fetch = async () => new Response(JSON.stringify({
    prediction: { predictedClass: "example", confidence: 0.75 },
    classProbabilities: [{ className: "example", probability: 0.75 }],
    gradCamUrl: null,
    model: { name: "test model", version: "test" },
    processingTimeMs: 25,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await analyzeScan({ scanId: "MRI-TEST", imageUrl: "https://private.test/scan", format: "jpg" });
    assert.equal(result.source, "fastapi");
    assert.equal(result.isMock, false);
    assert.equal(result.prediction.predictedClass, "example");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousEndpoint === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = previousEndpoint;
  }
});

test("does not substitute mock output when a configured service fails", async () => {
  const previousEndpoint = process.env.AI_SERVICE_URL;
  const previousFetch = globalThis.fetch;
  process.env.AI_SERVICE_URL = "http://fastapi.test/analyze";
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    await assert.rejects(
      analyzeScan({ scanId: "MRI-TEST", imageUrl: "https://private.test/scan", format: "jpg" }),
      { status: 502, message: "AI service returned an unsuccessful response" },
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousEndpoint === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = previousEndpoint;
  }
});
