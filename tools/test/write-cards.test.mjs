import { describe, expect, it } from "vitest";
import { pickModel, PREFERRED_MODELS } from "../write-cards.mjs";

describe("pickModel", () => {
  it("takes the first preferred model Groq still offers", () => {
    expect(pickModel(["llama-3.1-8b-instant", "openai/gpt-oss-120b"], PREFERRED_MODELS)).toBe("openai/gpt-oss-120b");
  });

  it("reproduces the failure: a retired default is skipped, not used", () => {
    const offered = ["openai/gpt-oss-20b", "whisper-large-v3"];
    expect(pickModel(offered, ["llama-3.3-70b-versatile", ...PREFERRED_MODELS])).toBe("openai/gpt-oss-20b");
  });

  it("honours a configured model when it is on offer", () => {
    expect(pickModel(["my/model", "openai/gpt-oss-120b"], ["my/model", ...PREFERRED_MODELS])).toBe("my/model");
  });

  it("ignores an unset configured model", () => {
    expect(pickModel(["openai/gpt-oss-120b"], [undefined, ...PREFERRED_MODELS])).toBe("openai/gpt-oss-120b");
  });

  it("falls back to any chat model, never a speech or guard model", () => {
    expect(pickModel(["whisper-large-v3", "llama-guard-4", "qwen/qwen3-32b"], PREFERRED_MODELS)).toBe("qwen/qwen3-32b");
  });

  it("returns null when nothing can write", () => {
    expect(pickModel([], PREFERRED_MODELS)).toBeNull();
    expect(pickModel(["whisper-large-v3"], PREFERRED_MODELS)).toBeNull();
  });
});

import { retryDelayMs } from "../write-cards.mjs";

describe("retryDelayMs", () => {
  it("honours Groq's retry-after header on a rate limit", () => {
    expect(retryDelayMs(429, "7", "")).toBe(7250);
  });

  it("reads 'try again in Ns' from the message when there is no header", () => {
    const body = '{"error":{"message":"Rate limit reached ... Please try again in 12.3s."}}';
    expect(retryDelayMs(429, null, body)).toBe(12550);
    expect(retryDelayMs(429, null, "Please try again in 800ms")).toBe(1050);
  });

  it("caps any wait so one card cannot hold the job open", () => {
    expect(retryDelayMs(429, "600", "")).toBe(30_000);
  });

  it("waits a default amount on a bare rate limit", () => {
    expect(retryDelayMs(429, null, "")).toBe(10_000);
  });

  it("retries a reply that failed the JSON schema, and a server error", () => {
    expect(retryDelayMs(400, null, '"code":"json_validate_failed"')).toBe(500);
    expect(retryDelayMs(400, null, "Failed to generate JSON. Please adjust")).toBe(500);
    expect(retryDelayMs(503, null, "")).toBe(3000);
  });

  it("does not retry a request that is simply wrong", () => {
    expect(retryDelayMs(400, null, "invalid model")).toBeNull();
    expect(retryDelayMs(401, null, "Invalid API Key")).toBeNull();
    expect(retryDelayMs(404, null, "model_not_found")).toBeNull();
  });
});
