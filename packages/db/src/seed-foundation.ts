import { normalizeUrl } from "@human-layer/core";

import {
  createSeedComment,
  ensureDemoProfiles,
  ensureSeedProfiles,
  seedFollowAndSave,
  seedPageVerdict,
  seedSupportedDomainsManifest,
  upsertPageFromCandidate
} from "./queries";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set explicitly to run seed scripts. Refusing to use the localhost fallback."
    );
  }

  const { pool } = await import("./client");
  await seedSupportedDomainsManifest();

  const { builderId, researcherId } = await ensureSeedProfiles();
  const demoProfiles = await ensureDemoProfiles();

  const githubRepo = normalizeUrl("https://github.com/vercel/next.js");
  const githubIssue = normalizeUrl("https://github.com/vercel/next.js/issues/56789");
  const githubPr = normalizeUrl("https://github.com/vercel/next.js/pull/12345");
  const hnItem = normalizeUrl("https://news.ycombinator.com/item?id=40843880");
  const linkedUrl = normalizeUrl("https://react.dev/reference/react/useTransition");
  const githubRelease = normalizeUrl("https://github.com/vercel/next.js/releases/tag/v15.3.0");
  const youtubeVideo = normalizeUrl("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  const spotifyTrack = normalizeUrl("https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl");
  const huggingFaceModel = normalizeUrl("https://huggingface.co/openai/whisper-large-v3");
  const chromeWebStoreItem = normalizeUrl(
    "https://chromewebstore.google.com/detail/grammarly-grammar-checker/kbfnbcaeplbcioakkpcpgfkobkghlhen"
  );
  const redditThread = normalizeUrl(
    "https://www.reddit.com/r/reactjs/comments/1b0abcd/react_server_components_discussion/"
  );

  const seededCandidates = [
    githubRepo,
    githubIssue,
    githubPr,
    githubRelease,
    hnItem,
    linkedUrl,
    youtubeVideo,
    spotifyTrack,
    huggingFaceModel,
    chromeWebStoreItem,
    redditThread
  ].filter(
    Boolean
  );
  const seededPages: Array<{ id: string; pageKind: string; title: string; host: string }> = [];

  for (const candidate of seededCandidates) {
    const page = await upsertPageFromCandidate(candidate!, candidate!.canonicalUrl, true);
    seededPages.push({
      id: page.id,
      pageKind: page.pageKind,
      title: page.title,
      host: page.host
    });

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

  const verdictCycle = ["useful", "useful", "useful", "misleading", "outdated"] as const;
  const commentTemplates = [
    "The strongest signal here is how quickly you can tell whether the promise matches the actual product surface.",
    "Worth opening, but the useful part is narrower than the headline makes it sound.",
    "Good for context and orientation. I would still verify the implementation details before acting on it.",
    "The comments and surrounding references matter more than the hero pitch on this page.",
    "Helpful if you already know the category. Not ideal as a first-stop explanation.",
    "This page earns trust because the details are concrete and the tradeoffs are visible.",
    "I would bookmark this mostly for the linked resources and the follow-up discussion.",
    "Interesting signal, but I would treat it as directional rather than final."
  ];

  for (let index = 0; index < demoProfiles.length; index += 1) {
    const profile = demoProfiles[index];
    const primaryPage = seededPages[index % seededPages.length];
    const secondaryPage = seededPages[(index + 3) % seededPages.length];
    const followTarget = demoProfiles[(index + 1) % demoProfiles.length];
    const helpfulProfile = demoProfiles[(index + 7) % demoProfiles.length];
    const tertiaryProfile = demoProfiles[(index + 13) % demoProfiles.length];

    const primaryBody =
      commentTemplates[index % commentTemplates.length] +
      " " +
      primaryPage.title +
      " on " +
      primaryPage.host +
      (index % 2 === 0
        ? " feels more useful once you inspect the supporting detail."
        : " is worth a skim before you decide what to do next.");

    const secondaryBody =
      "Coming back to this " +
      secondaryPage.pageKind.replace(/_/g, " ") +
      " later makes sense because the page keeps attracting useful follow-up signal.";

    await createSeedComment({
      pageId: primaryPage.id,
      profileId: profile.id,
      helpfulProfileId: helpfulProfile.id,
      body: primaryBody,
      createdAt: new Date(Date.now() - index * 1000 * 60 * 37)
    });

    await createSeedComment({
      pageId: secondaryPage.id,
      profileId: profile.id,
      helpfulProfileId: tertiaryProfile.id,
      body: secondaryBody,
      createdAt: new Date(Date.now() - index * 1000 * 60 * 79)
    });

    await seedPageVerdict({
      pageId: primaryPage.id,
      profileId: profile.id,
      verdict: verdictCycle[index % verdictCycle.length]
    });

    await seedFollowAndSave({
      pageId: primaryPage.id,
      followerProfileId: profile.id,
      followeeProfileId: followTarget.id
    });
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  const { pool } = await import("./client");
  await pool.end();
  process.exit(1);
});
