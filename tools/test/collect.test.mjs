import { describe, expect, it, vi } from "vitest";
import { fullNameFromUrl, probeHomepage } from "../collect-evidence.mjs";

/** A fake fetch that answers each call from a script, in order. */
const scripted = (...answers) => {
  const fn = vi.fn(async () => {
    const next = answers.shift();
    if (next instanceof Error) throw next;
    return { status: next, body: { cancel: async () => undefined } };
  });
  return fn;
};

describe("probeHomepage", () => {
  it("reports a 200 as live after one request", async () => {
    const f = scripted(200);
    expect(await probeHomepage("https://x.dev", f)).toBe("live");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("reports a 404 as down, having tried twice", async () => {
    const f = scripted(404, 404);
    expect(await probeHomepage("https://x.dev", f)).toBe("down");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("forgives a cold start: a timeout followed by a 200 is live", async () => {
    const f = scripted(new Error("timeout"), 200);
    expect(await probeHomepage("https://x.dev", f)).toBe("live");
  });

  it("reports a host that never answers as down", async () => {
    const f = scripted(new Error("ENOTFOUND"), new Error("ENOTFOUND"));
    expect(await probeHomepage("https://nowhere.invalid", f)).toBe("down");
  });

  it("counts a protected deployment answering 401 as live", async () => {
    expect(await probeHomepage("https://x.dev", scripted(401))).toBe("live");
  });

  it("asks with GET and follows redirects", async () => {
    const f = scripted(200);
    await probeHomepage("https://x.dev", f);
    expect(f.mock.calls[0][1]).toMatchObject({ method: "GET", redirect: "follow" });
  });
});

describe("fullNameFromUrl", () => {
  it("extracts owner/name from a repository URL", () => {
    expect(fullNameFromUrl("https://github.com/CODER7657/pramana")).toBe("CODER7657/pramana");
    expect(fullNameFromUrl("https://github.com/Hash-Hawks/roadside-app?tab=readme")).toBe("Hash-Hawks/roadside-app");
  });

  it("returns null for anything that is not one", () => {
    expect(fullNameFromUrl("https://example.com/x")).toBeNull();
    expect(fullNameFromUrl(undefined)).toBeNull();
  });
});
