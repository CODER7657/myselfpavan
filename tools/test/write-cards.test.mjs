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
