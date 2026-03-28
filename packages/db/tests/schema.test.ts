import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("foundation migration", () => {
  const migrations = readdirSync(resolve(process.cwd(), "drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(resolve(process.cwd(), "drizzle", file), "utf8"))
    .join("\n");

  it("defines the locked verdict enum", () => {
    expect(migrations).toContain(
      "CREATE TYPE verdict AS ENUM ('useful', 'misleading', 'outdated', 'scam')"
    );
  });

  it("enforces one profile per nullifier and one verdict per profile per page", () => {
    expect(migrations).toContain("profiles_nullifier_hash_unique");
    expect(migrations).toContain("verdicts_page_profile_unique");
  });

  it("includes the phase 0 page kinds plus later placeholders", () => {
    expect(migrations).toContain("'github_repo'");
    expect(migrations).toContain("'github_issue'");
    expect(migrations).toContain("'github_pr'");
    expect(migrations).toContain("'hn_item'");
    expect(migrations).toContain("'hn_linked_url'");
    expect(migrations).toContain("'product_hunt_product'");
  });

  it("adds profile interests and world id verification metadata for phase 1", () => {
    expect(migrations).toContain("ADD COLUMN IF NOT EXISTS interest_tags jsonb");
    expect(migrations).toContain("ADD COLUMN IF NOT EXISTS verification_level text");
    expect(migrations).toContain("ADD COLUMN IF NOT EXISTS signal text");
  });
});
