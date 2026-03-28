import { describe, expect, it } from "vitest";

import { summarizeContributorReputation } from "../src/reputation";

describe("summarizeContributorReputation", () => {
  it("marks deeply helpful contributors as consistently useful", () => {
    const reputation = summarizeContributorReputation({
      publicTakeCount: 5,
      helpfulVoteCount: 4,
      followerCount: 2,
      distinctPageCount: 3,
      verdictCount: 4
    });

    expect(reputation.level).toBe("consistently_useful");
    expect(reputation.label).toBe("Consistently useful");
  });

  it("marks repeated public contributors as steady", () => {
    const reputation = summarizeContributorReputation({
      publicTakeCount: 2,
      helpfulVoteCount: 1,
      followerCount: 0,
      distinctPageCount: 2,
      verdictCount: 1
    });

    expect(reputation.level).toBe("steady_contributor");
  });

  it("marks early positive contributors as emerging", () => {
    const reputation = summarizeContributorReputation({
      publicTakeCount: 1,
      helpfulVoteCount: 1,
      followerCount: 0,
      distinctPageCount: 1,
      verdictCount: 0
    });

    expect(reputation.level).toBe("emerging_signal");
  });

  it("falls back to new voice when public signal is still sparse", () => {
    const reputation = summarizeContributorReputation({
      publicTakeCount: 0,
      helpfulVoteCount: 0,
      followerCount: 0,
      distinctPageCount: 0,
      verdictCount: 0
    });

    expect(reputation.level).toBe("new_voice");
  });
});
