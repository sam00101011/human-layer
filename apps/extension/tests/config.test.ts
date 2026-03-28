import { describe, expect, it } from "vitest";

import { resolveAppUrl } from "../lib/config";

describe("appUrl config", () => {
  it("falls back cleanly when process is unavailable", () => {
    expect(resolveAppUrl(undefined)).toBe("http://127.0.0.1:3000");
  });

  it("prefers the explicit extension app URL", () => {
    expect(resolveAppUrl({ WXT_APP_URL: "http://127.0.0.1:4444", APP_URL: "http://127.0.0.1:3000" })).toBe(
      "http://127.0.0.1:4444"
    );
  });
});
