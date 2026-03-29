import { isSpotifyPageKind } from "./media";
import { type InterestTag, type PageSummary, type ThreadSnapshot, type Verdict } from "./types";

export type PageContextSummary = {
  tags: InterestTag[];
  dominantVerdict: Verdict | null;
  summary: string;
  whyItMatters: string[];
  surfaceLens: {
    label: string;
    title: string;
    explanation: string;
    prompts: readonly string[];
  } | null;
};

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function pushTags(set: Set<InterestTag>, tags: readonly InterestTag[]) {
  for (const tag of tags) {
    set.add(tag);
  }
}

function inferTagsFromText(text: string, set: Set<InterestTag>) {
  const lower = text.toLowerCase();

  if (/\b(ai|llm|model|agent|agents|openai|anthropic|hugging ?face|inference|prompt)\b/.test(lower)) {
    pushTags(set, ["ai"]);
  }

  if (/\b(agent|agents|assistant|copilot|autonomous)\b/.test(lower)) {
    pushTags(set, ["agents"]);
  }

  if (/\b(oss|open source|repo|repository|github|gitlab|package|library|crate|pypi|npm)\b/.test(lower)) {
    pushTags(set, ["oss"]);
  }

  if (/\b(cli|sdk|tooling|plugin|extension|framework|docs|api|developer|devtools)\b/.test(lower)) {
    pushTags(set, ["devtools"]);
  }

  if (/\b(research|paper|benchmark|evaluation|study|arxiv|openreview)\b/.test(lower)) {
    pushTags(set, ["research"]);
  }

  if (/\b(infra|cloud|deploy|deployment|docker|kubernetes|terraform|hosting|database)\b/.test(lower)) {
    pushTags(set, ["infra"]);
  }

  if (/\b(security|audit|auth|authentication|exploit|vulnerability|privacy)\b/.test(lower)) {
    pushTags(set, ["security"]);
  }

  if (/\b(design|ui|ux|figma|prototype|interface|landing page)\b/.test(lower)) {
    pushTags(set, ["design"]);
  }

  if (/\b(startup|launch|founder|product hunt|growth|saas|beta)\b/.test(lower)) {
    pushTags(set, ["startups"]);
  }

  if (/\b(crypto|ethereum|solidity|wallet|token|defi|onchain)\b/.test(lower)) {
    pushTags(set, ["crypto"]);
  }
}

function inferTagsFromPage(page: Pick<PageSummary, "pageKind" | "host" | "title">, set: Set<InterestTag>) {
  inferTagsFromText(`${page.host} ${page.title} ${page.pageKind}`, set);

  if (
    [
      "github_repo",
      "github_issue",
      "github_pr",
      "github_discussion",
      "github_release",
      "gitlab_project",
      "gitlab_issue",
      "gitlab_merge_request",
      "gitlab_epic",
      "repository_page",
      "registry_package",
      "npm_package",
      "pypi_package",
      "gist_snippet"
    ].includes(page.pageKind)
  ) {
    pushTags(set, ["oss", "devtools"]);
  }

  if (["docs_page", "qa_question", "marketplace_item", "chrome_web_store_item"].includes(page.pageKind)) {
    pushTags(set, ["devtools"]);
  }

  if (["research_page", "publication_page", "notebook_page", "kaggle_resource"].includes(page.pageKind)) {
    pushTags(set, ["research"]);
  }

  if (["model_page", "hugging_face_model", "hugging_face_dataset", "hugging_face_space"].includes(page.pageKind)) {
    pushTags(set, ["ai"]);
  }

  if (page.pageKind === "youtube_video" || isSpotifyPageKind(page.pageKind)) {
    pushTags(set, ["media"]);
  }

  if (["product_hunt_product", "product_page", "showcase_page", "event_page"].includes(page.pageKind)) {
    pushTags(set, ["startups"]);
  }

  if (["figma_community_resource"].includes(page.pageKind)) {
    pushTags(set, ["design"]);
  }
}

function getDominantVerdict(thread: ThreadSnapshot): Verdict | null {
  const orderedVerdicts = Object.entries(thread.verdictCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (orderedVerdicts[0]?.[0] as Verdict | undefined) ?? null;
}

function formatTagList(tags: InterestTag[]) {
  return tags.map((tag) => tag.replace(/_/g, " ")).join(", ");
}

function getSurfaceLens(page: Pick<PageSummary, "pageKind" | "host" | "title">) {
  if (page.pageKind === "chrome_web_store_item") {
    return {
      label: "Install signal",
      title: "Humans add the missing install reality check.",
      explanation:
        "This is where verified builders can say whether the extension is actually worth installing, safe to trust, and better than the alternatives.",
      prompts: [
        "Worth installing for a real workflow?",
        "Any privacy, permission, or performance red flags?",
        "Is there a better alternative people should consider first?"
      ]
    } as const;
  }

  if (
    page.pageKind === "marketplace_item" &&
    (page.host === "marketplace.visualstudio.com" || page.host === "visualstudiomarketplace.com")
  ) {
    return {
      label: "Workflow signal",
      title: "Humans can explain whether this earns a slot in your editor.",
      explanation:
        "Marketplace pages rarely tell you how an extension feels after a week of real use. Verified takes can fill in that gap fast.",
      prompts: [
        "Does it improve daily workflow or just look promising?",
        "Any setup, telemetry, or performance gotchas?",
        "Who is this genuinely best for?"
      ]
    } as const;
  }

  if (page.pageKind === "qa_question" && page.host.includes("stack")) {
    return {
      label: "Freshness signal",
      title: "Humans can say whether the accepted answer still holds.",
      explanation:
        "Old answers can look authoritative long after the ecosystem moves on. Verified humans can mark what still works, what changed, and what to trust now.",
      prompts: [
        "Is the top answer still correct for current versions?",
        "What caveat or safer fix is missing?",
        "Which answer should people trust today?"
      ]
    } as const;
  }

  if (page.pageKind === "youtube_video") {
    return {
      label: "Time-worth signal",
      title: "Humans can save people from low-signal tutorials and demos.",
      explanation:
        "Video pages need more than likes. Verified takes can tell people whether the content is current, honest, and worth their attention.",
      prompts: [
        "Worth watching end-to-end or skimming?",
        "Which section or timestamp actually matters?",
        "Is the demo real, current, and reproducible?"
      ]
    } as const;
  }

  if (page.pageKind === "spotify_track") {
    return {
      label: "Listening signal",
      title: "Humans can tell you whether this track actually sticks.",
      explanation:
        "Stream counts do not tell you whether a track holds up. Verified listeners can add fit, context, and who this is really for.",
      prompts: [
        "Does it actually earn repeat listens?",
        "Who is this track best for or adjacent to?",
        "Is this the standout or should people start elsewhere?"
      ]
    } as const;
  }

  if (page.pageKind === "spotify_album" || page.pageKind === "spotify_playlist") {
    return {
      label: "Taste signal",
      title: "Humans can explain why this is worth saving, not just streaming.",
      explanation:
        "Albums and playlists are discovery surfaces. Verified listeners can tell you whether this is coherent, skipless, and actually worth adding to your graph.",
      prompts: [
        "Is this coherent start-to-finish or mostly filler?",
        "Which tracks or transitions actually carry it?",
        "What kind of listener or context is this best for?"
      ]
    } as const;
  }

  if (page.pageKind === "spotify_episode" || page.pageKind === "spotify_show") {
    return {
      label: "Listen-worth signal",
      title: "Humans can surface the moments and takeaways worth hearing.",
      explanation:
        "Podcast pages need more than a title and description. Verified listeners can point to the moment that matters and whether the conversation is actually worth your time.",
      prompts: [
        "Is this worth the full listen or just one segment?",
        "What moment or timestamp is the key takeaway?",
        "Was the conversation insightful, current, and honest?"
      ]
    } as const;
  }

  if (page.pageKind === "github_release") {
    return {
      label: "Upgrade signal",
      title: "Humans can explain whether this release is safe to adopt.",
      explanation:
        "Release notes rarely tell the whole migration story. Verified humans can surface upgrade risk, breaking changes, and rollout advice.",
      prompts: [
        "Safe to upgrade right now?",
        "What breaking changes matter most?",
        "Any migration or rollback advice people should know?"
      ]
    } as const;
  }

  if (["hugging_face_model", "hugging_face_dataset", "hugging_face_space"].includes(page.pageKind)) {
    return {
      label: "Deployment signal",
      title: "Humans can add the production reality behind the model card.",
      explanation:
        "Model pages show benchmarks and demos. Verified builders can explain how the model behaves in practice, what it costs, and what caveats matter.",
      prompts: [
        "Does it work outside the demo or benchmark?",
        "What cost, latency, or license caveats matter?",
        "What prompt, eval, or deployment setup changes the outcome?"
      ]
    } as const;
  }

  return null;
}

export function inferPageInterestTags(params: {
  page: Pick<PageSummary, "pageKind" | "host" | "title">;
  thread?: ThreadSnapshot | null;
  maxTags?: number;
}): InterestTag[] {
  const set = new Set<InterestTag>();
  inferTagsFromPage(params.page, set);

  if (params.thread?.topHumanTake?.body) {
    inferTagsFromText(params.thread.topHumanTake.body, set);
  }

  for (const comment of params.thread?.recentComments ?? []) {
    inferTagsFromText(comment.body, set);
  }

  return Array.from(set).slice(0, params.maxTags ?? 4);
}

export function buildPageContextSummary(params: {
  page: Pick<PageSummary, "pageKind" | "host" | "title">;
  thread: ThreadSnapshot;
}): PageContextSummary {
  const tags = inferPageInterestTags({
    page: params.page,
    thread: params.thread,
    maxTags: 4
  });
  const dominantVerdict = getDominantVerdict(params.thread);
  const totalVerdicts = Object.values(params.thread.verdictCounts).reduce((sum, count) => sum + count, 0);
  const verifiedTakeCount = params.thread.recentComments.length;
  const usefulCount = params.thread.verdictCounts.useful;
  const surfaceLens = getSurfaceLens(params.page);

  let summary = "No verified signal yet. The first useful take here will set the tone.";

  if (dominantVerdict === "useful") {
    summary =
      usefulCount > 1
        ? `${usefulCount} verified humans are already leaning useful on this page.`
        : "Verified humans are starting to signal that this page is useful.";
  } else if (dominantVerdict === "misleading") {
    summary = "Verified humans are flagging this page as potentially misleading.";
  } else if (dominantVerdict === "outdated") {
    summary = "Verified humans think this page may be slipping out of date.";
  } else if (dominantVerdict === "scam") {
    summary = "Verified humans are raising a serious trust warning on this page.";
  } else if (verifiedTakeCount > 0) {
    summary = "Signal is early, but verified takes are already starting to explain this page.";
  }

  const whyItMatters: string[] = [];

  if (tags.length > 0) {
    whyItMatters.push(`Most relevant for builders following ${formatTagList(tags.slice(0, 3))}.`);
  }

  if (params.thread.topHumanTake?.body) {
    whyItMatters.push(`Top take: “${truncate(params.thread.topHumanTake.body, 120)}”`);
  }

  if (totalVerdicts > 0) {
    whyItMatters.push(`${totalVerdicts} verified verdict${totalVerdicts === 1 ? "" : "s"} are on record.`);
  }

  if (verifiedTakeCount > 1) {
    whyItMatters.push(`${verifiedTakeCount} recent verified takes are active on this page right now.`);
  }

  if (whyItMatters.length === 0) {
    whyItMatters.push("There is not enough verified signal yet, so the next contribution here will matter a lot.");
  }

  return {
    tags,
    dominantVerdict,
    summary,
    whyItMatters,
    surfaceLens
  };
}
