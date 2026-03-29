import { describe, expect, it } from "vitest";

import { buildMediaMomentUrl, formatMediaTimestamp, parseMediaTimestampInput } from "../src/media";

describe("media helpers", () => {
  it("parses timestamp input formats used for highlights", () => {
    expect(parseMediaTimestampInput("83")).toBe(83);
    expect(parseMediaTimestampInput("1:23")).toBe(83);
    expect(parseMediaTimestampInput("01:02:03")).toBe(3723);
    expect(parseMediaTimestampInput("1:75")).toBeNull();
  });

  it("formats media timestamps and builds media moment URLs", () => {
    expect(formatMediaTimestamp(83)).toBe("1:23");
    expect(formatMediaTimestamp(3723)).toBe("1:02:03");
    expect(
      buildMediaMomentUrl(
        {
          pageKind: "youtube_video",
          canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        },
        83
      )
    ).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=83s");
    expect(
      buildMediaMomentUrl(
        {
          pageKind: "spotify_episode",
          canonicalUrl: "https://open.spotify.com/episode/abcde"
        },
        83
      )
    ).toBe("https://open.spotify.com/episode/abcde?t=83");
  });
});
