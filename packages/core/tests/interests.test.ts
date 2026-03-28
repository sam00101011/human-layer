import { describe, expect, it } from "vitest";

import { getInterestTagLabel, getRelatedInterestTags } from "../src/interests";

describe("interest graph", () => {
  it("returns readable labels for expanded tags", () => {
    expect(getInterestTagLabel("creator_tools")).toBe("Creator tools");
    expect(getInterestTagLabel("llms")).toBe("LLMs");
  });

  it("suggests related tags for a selected interest", () => {
    expect(getRelatedInterestTags(["ai"], 5)).toEqual([
      "agents",
      "automation",
      "llms",
      "ml",
      "research"
    ]);
  });

  it("does not repeat already selected tags", () => {
    expect(getRelatedInterestTags(["devtools", "backend"], 6)).not.toContain("devtools");
    expect(getRelatedInterestTags(["devtools", "backend"], 6)).not.toContain("backend");
  });

  it("returns starter suggestions when nothing is selected", () => {
    expect(getRelatedInterestTags([], 4)).toEqual(["devtools", "ai", "product", "growth"]);
  });
});
