import { describe, expect, it } from "vitest";

import { normalizeUrl } from "../src/normalize";

describe("normalizeUrl", () => {
  it("normalizes GitHub repo URLs", () => {
    const result = normalizeUrl("https://github.com/vercel/next.js/?tab=readme-ov-file#top");

    expect(result).toEqual({
      pageKind: "github_repo",
      canonicalUrl: "https://github.com/vercel/next.js",
      canonicalKey: "https://github.com/vercel/next.js",
      host: "github.com",
      title: "vercel/next.js",
      requiresExistingPage: false
    });
  });

  it("normalizes GitHub issue URLs", () => {
    const result = normalizeUrl("https://github.com/vercel/next.js/issues/12345?foo=bar");

    expect(result?.pageKind).toBe("github_issue");
    expect(result?.canonicalUrl).toBe("https://github.com/vercel/next.js/issues/12345");
  });

  it("normalizes GitHub pull request URLs", () => {
    const result = normalizeUrl("https://github.com/vercel/next.js/pull/9999/files");

    expect(result).toBeNull();
    expect(normalizeUrl("https://github.com/vercel/next.js/pull/9999?diff=split")?.canonicalUrl).toBe(
      "https://github.com/vercel/next.js/pull/9999"
    );
  });

  it("rejects unsupported GitHub paths", () => {
    expect(normalizeUrl("https://github.com/vercel")).toBeNull();
    expect(normalizeUrl("https://github.com/vercel/next.js/discussions")).toBeNull();
  });

  it("normalizes Hacker News item URLs", () => {
    const result = normalizeUrl("https://news.ycombinator.com/item?id=40843880#comments");

    expect(result).toEqual({
      pageKind: "hn_item",
      canonicalUrl: "https://news.ycombinator.com/item?id=40843880",
      canonicalKey: "https://news.ycombinator.com/item?id=40843880",
      host: "news.ycombinator.com",
      title: "HN item 40843880",
      requiresExistingPage: false
    });
  });

  it("treats external URLs as HN linked candidates", () => {
    const result = normalizeUrl("https://react.dev/reference/react/useTransition?utm_source=hn#overview");

    expect(result).toEqual({
      pageKind: "hn_linked_url",
      canonicalUrl: "https://react.dev/reference/react/useTransition",
      canonicalKey: "https://react.dev/reference/react/useTransition",
      host: "react.dev",
      title: "react.dev/reference/react/useTransition",
      requiresExistingPage: true
    });
  });

  it("distinguishes HN item threads from linked external URLs", () => {
    const item = normalizeUrl("https://news.ycombinator.com/item?id=40843880");
    const linked = normalizeUrl("https://react.dev/reference/react/useTransition");

    expect(item?.pageKind).toBe("hn_item");
    expect(linked?.pageKind).toBe("hn_linked_url");
    expect(item?.canonicalKey).not.toBe(linked?.canonicalKey);
  });

  it("rejects non-http urls", () => {
    expect(normalizeUrl("mailto:test@example.com")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});
