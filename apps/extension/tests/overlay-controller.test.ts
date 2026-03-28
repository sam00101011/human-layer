import { describe, expect, it } from "vitest";

import { buildVerifyUrl } from "../components/OverlayController";

describe("OverlayController", () => {
  it("builds the extension verify handoff URL", () => {
    expect(
      buildVerifyUrl(
        "https://human-layer-web.vercel.app",
        "https://github.com/NeoVertex1/SuperPrompt"
      )
    ).toBe(
      "https://human-layer-web.vercel.app/verify?handoff=1&returnUrl=https%3A%2F%2Fgithub.com%2FNeoVertex1%2FSuperPrompt"
    );
  });
});
