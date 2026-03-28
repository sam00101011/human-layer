import { describe, expect, it } from "vitest";

import { getOverlayTarget } from "../lib/overlay-target";

describe("getOverlayTarget", () => {
  it("returns a direct overlay target for GitHub repo pages", () => {
    expect(getOverlayTarget("https://github.com/vercel/next.js")?.pageKind).toBe("github_repo");
  });

  it("returns a direct overlay target for Hacker News item pages", () => {
    expect(
      getOverlayTarget("https://news.ycombinator.com/item?id=40843880")?.pageKind
    ).toBe("hn_item");
  });

  it("rejects unsupported GitHub paths", () => {
    expect(getOverlayTarget("https://github.com/vercel")).toBeNull();
  });

  it("rejects non-overlay external URLs", () => {
    expect(getOverlayTarget("https://x.com/_nicolealonso")).toBeNull();
  });
});
