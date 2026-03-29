import type { InterestTag } from "./types";

export type DemoProfileDefinition = {
  handle: string;
  interestTags: InterestTag[];
  verificationLevel: "orb" | "device";
  nullifierHash: string;
};

const FIRST_NAMES = [
  "maya",
  "kenji",
  "sofia",
  "noah",
  "lina",
  "omar",
  "clara",
  "diego",
  "nina",
  "julian"
] as const;

const LAST_NAMES = ["rivera", "ito", "walker", "singh", "brooks"] as const;

const INTEREST_SETS: InterestTag[][] = [
  ["ai", "research", "devtools"],
  ["design", "product", "ux"],
  ["music", "film", "art"],
  ["health", "fitness", "food"],
  ["travel", "photography", "lifestyle"],
  ["politics", "history", "law"],
  ["sports", "media", "communities"],
  ["fintech", "markets", "economics"],
  ["fashion", "beauty", "creator_tools"],
  ["education", "psychology", "books"],
  ["climate", "energy", "science"],
  ["backend", "cloud", "security"],
  ["frontend", "design", "fullstack"],
  ["growth", "sales", "marketplaces"],
  ["parenting", "health", "lifestyle"]
];

export const DEMO_PROFILE_DEFINITIONS: DemoProfileDefinition[] = FIRST_NAMES.flatMap((firstName, firstIndex) =>
  LAST_NAMES.map((lastName, lastIndex) => {
    const handle = `${firstName}_${lastName}`;
    const profileIndex = firstIndex * LAST_NAMES.length + lastIndex;

    return {
      handle,
      interestTags: INTEREST_SETS[profileIndex % INTEREST_SETS.length],
      verificationLevel: profileIndex % 3 === 0 ? "orb" : "device",
      nullifierHash: `demo-nullifier-${handle}`
    };
  })
);

export const DEMO_PROFILE_HANDLES = DEMO_PROFILE_DEFINITIONS.map((profile) => profile.handle);

export function isDemoProfileHandle(handle: string): boolean {
  return DEMO_PROFILE_HANDLES.includes(handle.trim().toLowerCase());
}
