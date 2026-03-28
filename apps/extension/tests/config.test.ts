import { describe, expect, it } from "vitest";

import { resolveAppUrl } from "../lib/config";

describe("appUrl config", () => {
  it("falls back cleanly when env is unavailable", () => {
    expect(resolveAppUrl(undefined)).toBe("http://127.0.0.1:3000");
  });

  it("prefers the explicit extension app URL", () => {
    expect(resolveAppUrl({ WXT_APP_URL: "http://127.0.0.1:4444", APP_URL: "http://127.0.0.1:3000" })).toBe(
      "http://127.0.0.1:4444"
    );
  });

  it("uses APP_URL when the extension-specific URL is missing", () => {
    expect(resolveAppUrl({ APP_URL: "https://human-layer-web.vercel.app" })).toBe(
      "https://human-layer-web.vercel.app"
    );
  });

  it("prefers the injected build-time app URL when provided", () => {
    expect(
      resolveAppUrl(
        { WXT_APP_URL: "http://127.0.0.1:4444", APP_URL: "http://127.0.0.1:3000" },
        "https://human-layer-web.vercel.app"
      )
    ).toBe("https://human-layer-web.vercel.app");
  });
});
