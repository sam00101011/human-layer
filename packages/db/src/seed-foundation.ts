import { normalizeUrl } from "@human-layer/core";

import { pool } from "./client";
import {
  createSeedComment,
  ensureSeedProfiles,
  seedFollowAndSave,
  seedPageVerdict,
  seedSupportedDomainsManifest,
  upsertPageFromCandidate
} from "./queries";

async function main() {
  await seedSupportedDomainsManifest();

  const { builderId, researcherId } = await ensureSeedProfiles();

  const githubRepo = normalizeUrl("https://github.com/vercel/next.js");
  const githubIssue = normalizeUrl("https://github.com/vercel/next.js/issues/56789");
  const githubPr = normalizeUrl("https://github.com/vercel/next.js/pull/12345");
  const hnItem = normalizeUrl("https://news.ycombinator.com/item?id=40843880");
  const linkedUrl = normalizeUrl("https://react.dev/reference/react/useTransition");

  const seededCandidates = [githubRepo, githubIssue, githubPr, hnItem, linkedUrl].filter(
    Boolean
  );

  for (const candidate of seededCandidates) {
    const page = await upsertPageFromCandidate(candidate!, candidate!.canonicalUrl, true);

    if (candidate?.pageKind === "github_repo") {
      await createSeedComment({
        pageId: page.id,
        profileId: builderId,
        helpfulProfileId: researcherId,
        body: "Useful starting point. The repo README gives enough context to evaluate architecture quickly."
      });
      await seedPageVerdict({ pageId: page.id, profileId: builderId, verdict: "useful" });
      await seedFollowAndSave({
        pageId: page.id,
        followerProfileId: researcherId,
        followeeProfileId: builderId
      });
    }

    if (candidate?.pageKind === "hn_item") {
      await createSeedComment({
        pageId: page.id,
        profileId: researcherId,
        helpfulProfileId: builderId,
        body: "Good discussion density. Worth reading the thread before opening the linked piece."
      });
      await seedPageVerdict({ pageId: page.id, profileId: researcherId, verdict: "useful" });
    }
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
