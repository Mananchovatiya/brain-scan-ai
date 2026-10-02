import { z } from "zod";

const analysisSchema = z.object({
  prediction: z.object({
    predictedClass: z.string().trim().min(1).max(80),
    confidence: z.number().min(0).max(1),
  }).strict(),
  classProbabilities: z.array(z.object({
    className: z.string().trim().min(1).max(80),
    probability: z.number().min(0).max(1),
  }).strict()).min(1).max(32),
  gradCamUrl: z.string().url().nullable(),
  model: z.object({
    name: z.string().trim().min(1).max(120),
    version: z.string().trim().min(1).max(80),
  }).strict(),
  processingTimeMs: z.number().min(0).max(10 * 60 * 1000),
}).strict();

/** Test/demo result only. Keep this as the single replaceable mock location. */
function mockAnalysis() {
  return {
    source: "mock",
    isMock: true,
    mockDisclaimer: "MOCK AI RESPONSE — NOT A REAL ANALYSIS OR MEDICAL RESULT",
    prediction: { predictedClass: "Glioma", confidence: 0.91 },
    classProbabilities: [
      { className: "Glioma", probability: 0.91 },
      { className: "Meningioma", probability: 0.04 },
      { className: "Pituitary tumor", probability: 0.03 },
      { className: "No tumor", probability: 0.02 },
    ],
    gradCamUrl: null,
    model: { name: "MOCK — NOT A DEPLOYED MODEL", version: "mock" },
    processingTimeMs: 0,
  };
}

function gatewayError(message) {
  const error = new Error(message);
  error.status = 502;
  return error;
}

export async function analyzeScan(input) {
  const endpoint = process.env.AI_SERVICE_URL;
  if (!endpoint) return mockAnalysis();

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.AI_SERVICE_API_KEY ? { Authorization: `Bearer ${process.env.AI_SERVICE_API_KEY}` } : {}),
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw gatewayError("AI service could not be reached");
  }

  if (!response.ok) throw gatewayError("AI service returned an unsuccessful response");

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw gatewayError("AI service returned invalid JSON");
  }

  const parsed = analysisSchema.safeParse(payload);
  if (!parsed.success) throw gatewayError("AI service response did not match the analysis contract");
  return { ...parsed.data, source: "fastapi", isMock: false, mockDisclaimer: null };
}
