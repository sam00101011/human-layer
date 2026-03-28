import { type InterestTag, type PageSummary, type ThreadSnapshot, type Verdict } from "./types";

export type PageContextSummary = {
  tags: InterestTag[];
  dominantVerdict: Verdict | null;
  summary: string;
  whyItMatters: string[];
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
    whyItMatters
  };
}
