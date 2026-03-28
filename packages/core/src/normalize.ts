import type { NormalizedPageCandidate } from "./types";

function isHttpUrl(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

function trimTrailingSlash(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function normalizeHost(url: URL): string {
  return url.host.toLowerCase();
}

function slugToTitle(value: string): string {
  try {
    return decodeURIComponent(value)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return value.replace(/[-_]+/g, " ").trim();
  }
}

function splitPath(url: URL): string[] {
  return trimTrailingSlash(url.pathname).split("/").filter(Boolean);
}

function buildCandidate(
  pageKind: NormalizedPageCandidate["pageKind"],
  canonicalUrl: string,
  host: string,
  title: string
): NormalizedPageCandidate {
  return {
    pageKind,
    canonicalUrl,
    canonicalKey: canonicalUrl,
    host,
    title,
    requiresExistingPage: false
  };
}

function buildExternalCandidate(
  pageKind: NormalizedPageCandidate["pageKind"],
  host: string,
  pathname: string,
  title: string
): NormalizedPageCandidate {
  const normalizedPath = trimTrailingSlash(pathname);
  const canonicalUrl = `https://${host}${normalizedPath === "/" ? "" : normalizedPath}`;
  return buildCandidate(pageKind, canonicalUrl, host, title);
}

function normalizeExternalCandidate(url: URL): NormalizedPageCandidate {
  const host = normalizeHost(url);
  const pathname = trimTrailingSlash(url.pathname);
  const canonicalUrl = `${url.protocol}//${host}${pathname === "/" ? "" : pathname}`;
  const title = pathname === "/" ? host : `${host}${pathname}`;

  return {
    pageKind: "hn_linked_url",
    canonicalUrl,
    canonicalKey: canonicalUrl,
    host,
    title,
    requiresExistingPage: true
  };
}

const devReservedSegments = new Set(["about", "latest", "top", "tags", "pod", "videos", "search"]);
const mediumReservedSegments = new Set(["about", "m", "tag", "topics", "membership", "me", "search"]);
const showcaseReservedSegments = new Set(["docs", "pricing", "blog", "privacy", "terms", "api"]);
const lumaReservedSegments = new Set(["login", "discover", "host", "pricing", "privacy", "terms"]);
const stackExchangeHosts = new Set([
  "stackoverflow.com",
  "serverfault.com",
  "superuser.com",
  "askubuntu.com",
  "stackapps.com",
  "mathoverflow.net"
]);
const sourcehutReservedSegments = new Set(["about", "blog", "privacy", "security", "support", "plans"]);
const designReservedSegments = new Set([
  "about",
  "blog",
  "browse",
  "collections",
  "community",
  "discover",
  "jobs",
  "login",
  "pricing",
  "search",
  "signup",
  "tags"
]);

function isMediumHost(host: string): boolean {
  return host === "medium.com" || host.endsWith(".medium.com");
}

function isHashnodeHost(host: string): boolean {
  return host === "hashnode.com" || host.endsWith(".hashnode.dev");
}

function isSubstackHost(host: string): boolean {
  return host.endsWith(".substack.com");
}

function isAtlassianHost(host: string): boolean {
  return host.endsWith(".atlassian.net");
}

function isCannyHost(host: string): boolean {
  return host === "canny.io" || host.endsWith(".canny.io");
}

function isReadmeHost(host: string): boolean {
  return host.endsWith(".readme.io");
}

function isMintlifyHost(host: string): boolean {
  return host.endsWith(".mintlify.app");
}

function isGitbookHost(host: string): boolean {
  return host.endsWith(".gitbook.io");
}

function isDocusaurusHost(host: string): boolean {
  return host.endsWith(".docusaurus.io");
}

function isNotionHost(host: string): boolean {
  return host === "www.notion.so" || host.endsWith(".notion.site");
}

function isWikipediaHost(host: string): boolean {
  return host.endsWith(".wikipedia.org");
}

function isStackExchangeHost(host: string): boolean {
  return stackExchangeHosts.has(host) || host.endsWith(".stackexchange.com");
}

function isReadTheDocsHost(host: string): boolean {
  return host === "readthedocs.io" || host.endsWith(".readthedocs.io");
}

function isVsMarketplaceHost(host: string): boolean {
  return host === "marketplace.visualstudio.com" || host === "visualstudiomarketplace.com";
}

function isLaunchpadHost(host: string): boolean {
  return host === "launchpad.net" || host === "bugs.launchpad.net";
}

function normalizeGitHub(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length < 2) return null;

  const [owner, repo, third, fourth, fifth] = segments;
  if (!owner || !repo) return null;

  if (segments.length === 2) {
    return buildExternalCandidate("github_repo", host, `/${owner}/${repo}`, `${owner}/${repo}`);
  }

  if (segments.length === 4 && third === "issues" && fourth && /^\d+$/.test(fourth)) {
    return buildExternalCandidate(
      "github_issue",
      host,
      `/${owner}/${repo}/issues/${fourth}`,
      `${owner}/${repo} issue #${fourth}`
    );
  }

  if (segments.length === 4 && third === "pull" && fourth && /^\d+$/.test(fourth)) {
    return buildExternalCandidate(
      "github_pr",
      host,
      `/${owner}/${repo}/pull/${fourth}`,
      `${owner}/${repo} PR #${fourth}`
    );
  }

  if (segments.length === 4 && third === "discussions" && fourth && /^\d+$/.test(fourth)) {
    return buildExternalCandidate(
      "github_discussion",
      host,
      `/${owner}/${repo}/discussions/${fourth}`,
      `${owner}/${repo} discussion #${fourth}`
    );
  }

  if (segments.length === 3 && third === "releases") {
    return buildExternalCandidate(
      "github_release",
      host,
      `/${owner}/${repo}/releases`,
      `${owner}/${repo} releases`
    );
  }

  if (segments.length === 5 && third === "releases" && fourth === "tag" && fifth) {
    return buildExternalCandidate(
      "github_release",
      host,
      `/${owner}/${repo}/releases/tag/${fifth}`,
      `${owner}/${repo} release ${fifth}`
    );
  }

  return null;
}

function normalizeGist(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (host !== "gist.github.com" || segments.length < 2) return null;

  const [user, gistId] = segments;
  if (!user || !gistId) return null;

  return buildExternalCandidate("gist_snippet", host, `/${user}/${gistId}`, `${user} gist ${gistId}`);
}

function normalizeHackerNews(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  if (trimTrailingSlash(url.pathname) !== "/item") return null;

  const itemId = url.searchParams.get("id");
  if (!itemId || !/^\d+$/.test(itemId)) return null;

  return buildCandidate(
    "hn_item",
    `https://news.ycombinator.com/item?id=${itemId}`,
    host,
    `HN item ${itemId}`
  );
}

function normalizeProductHunt(url: URL): NormalizedPageCandidate | null {
  const segments = splitPath(url);
  if (segments.length !== 2) return null;

  const [section, slug] = segments;
  if (!slug || (section !== "products" && section !== "posts")) return null;

  return buildExternalCandidate(
    "product_hunt_product",
    "www.producthunt.com",
    `/${section}/${slug}`,
    slugToTitle(slug)
  );
}

function normalizeLobsters(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length < 2 || segments[0] !== "s" || !segments[1]) return null;

  return buildExternalCandidate("lobsters_story", host, `/s/${segments[1]}`, `Lobsters story ${segments[1]}`);
}

function normalizeGitLab(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length < 2) return null;

  const dashIndex = segments.indexOf("-");
  if (dashIndex >= 2) {
    const namespace = segments.slice(0, dashIndex).join("/");
    const section = segments[dashIndex + 1];
    const itemId = segments[dashIndex + 2];
    const hasExtraSegments = segments.length !== dashIndex + 3;

    if (!hasExtraSegments && section === "issues" && itemId && /^\d+$/.test(itemId)) {
      return buildExternalCandidate(
        "gitlab_issue",
        host,
        `/${namespace}/-/issues/${itemId}`,
        `${namespace} issue #${itemId}`
      );
    }

    if (!hasExtraSegments && section === "merge_requests" && itemId && /^\d+$/.test(itemId)) {
      return buildExternalCandidate(
        "gitlab_merge_request",
        host,
        `/${namespace}/-/merge_requests/${itemId}`,
        `${namespace} merge request !${itemId}`
      );
    }

    if (!hasExtraSegments && section === "epics" && itemId && /^\d+$/.test(itemId)) {
      return buildExternalCandidate(
        "gitlab_epic",
        host,
        `/${namespace}/-/epics/${itemId}`,
        `${namespace} epic &${itemId}`
      );
    }

    return null;
  }

  return buildExternalCandidate("gitlab_project", host, url.pathname, segments.join("/"));
}

function normalizeHuggingFace(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length < 2) return null;

  if (segments[0] === "datasets" && segments.length === 3) {
    return buildExternalCandidate(
      "hugging_face_dataset",
      host,
      `/datasets/${segments[1]}/${segments[2]}`,
      `${segments[1]}/${segments[2]} dataset`
    );
  }

  if (segments[0] === "spaces" && segments.length === 3) {
    return buildExternalCandidate(
      "hugging_face_space",
      host,
      `/spaces/${segments[1]}/${segments[2]}`,
      `${segments[1]}/${segments[2]} Space`
    );
  }

  if (segments.length === 2) {
    return buildExternalCandidate(
      "hugging_face_model",
      host,
      `/${segments[0]}/${segments[1]}`,
      `${segments[0]}/${segments[1]}`
    );
  }

  return null;
}

function normalizeNpm(url: URL): NormalizedPageCandidate | null {
  const segments = splitPath(url);
  if (segments[0] !== "package") return null;

  if (segments.length === 2 && segments[1]) {
    return buildExternalCandidate("npm_package", "www.npmjs.com", `/package/${segments[1]}`, segments[1]);
  }

  if (segments.length === 3 && segments[1]?.startsWith("@") && segments[2]) {
    const packageName = `${segments[1]}/${segments[2]}`;
    return buildExternalCandidate("npm_package", "www.npmjs.com", `/package/${packageName}`, packageName);
  }

  return null;
}

function normalizePypi(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length !== 2 || segments[0] !== "project" || !segments[1]) return null;

  return buildExternalCandidate("pypi_package", host, `/project/${segments[1]}`, segments[1]);
}

function normalizeReddit(url: URL): NormalizedPageCandidate | null {
  const segments = splitPath(url);

  if (segments.length >= 4 && segments[0] === "r" && segments[2] === "comments" && segments[1] && segments[3]) {
    return buildExternalCandidate(
      "reddit_thread",
      "www.reddit.com",
      `/r/${segments[1]}/comments/${segments[3]}`,
      `r/${segments[1]} thread ${segments[3]}`
    );
  }

  if (segments.length >= 2 && segments[0] === "comments" && segments[1]) {
    return buildExternalCandidate("reddit_thread", "www.reddit.com", `/comments/${segments[1]}`, `Reddit thread ${segments[1]}`);
  }

  return null;
}

function normalizeYouTube(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);

  if (host === "youtu.be") {
    const videoId = splitPath(url)[0];
    if (!videoId) return null;
    return buildCandidate(
      "youtube_video",
      `https://www.youtube.com/watch?v=${videoId}`,
      "www.youtube.com",
      `YouTube video ${videoId}`
    );
  }

  if ((host === "www.youtube.com" || host === "youtube.com") && trimTrailingSlash(url.pathname) === "/watch") {
    const videoId = url.searchParams.get("v");
    if (!videoId) return null;
    return buildCandidate(
      "youtube_video",
      `https://www.youtube.com/watch?v=${videoId}`,
      "www.youtube.com",
      `YouTube video ${videoId}`
    );
  }

  return null;
}

function normalizeQaQuestion(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (!isStackExchangeHost(host) || segments.length < 2) return null;

  if (segments[0] === "questions" && /^\d+$/.test(segments[1] ?? "")) {
    return buildExternalCandidate("qa_question", host, `/questions/${segments[1]}`, `Question ${segments[1]}`);
  }

  if (segments[0] === "q" && /^\d+$/.test(segments[1] ?? "")) {
    return buildExternalCandidate("qa_question", host, `/questions/${segments[1]}`, `Question ${segments[1]}`);
  }

  return null;
}

function normalizeResearchPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length === 0) return null;

  if (host === "arxiv.org" && segments[0] === "abs" && segments[1]) {
    return buildExternalCandidate("research_page", host, `/abs/${segments[1]}`, `arXiv ${segments[1]}`);
  }

  if (host === "paperswithcode.com" && (segments[0] === "paper" || segments[0] === "dataset") && segments[1]) {
    return buildExternalCandidate("research_page", host, `/${segments[0]}/${segments[1]}`, slugToTitle(segments[1]));
  }

  if (host === "openreview.net") {
    const reviewId = url.searchParams.get("id");
    if (reviewId && (segments[0] === "forum" || segments[0] === "pdf" || segments[0] === "attachment")) {
      return buildCandidate("research_page", `https://openreview.net/forum?id=${reviewId}`, host, `OpenReview ${reviewId}`);
    }
  }

  if ((host === "semanticscholar.org" || host === "www.semanticscholar.org") && segments[0] === "paper" && segments[1]) {
    return buildExternalCandidate(
      "research_page",
      "www.semanticscholar.org",
      url.pathname,
      slugToTitle(segments[segments.length - 1] ?? segments[1])
    );
  }

  return null;
}

function normalizeProductPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length < 2) return null;

  if ((host === "crunchbase.com" || host === "www.crunchbase.com") && ["organization", "product", "company"].includes(segments[0] ?? "")) {
    return buildExternalCandidate("product_page", "www.crunchbase.com", `/${segments[0]}/${segments[1]}`, slugToTitle(segments[1]));
  }

  if ((host === "indiehackers.com" || host === "www.indiehackers.com") && ["product", "products"].includes(segments[0] ?? "")) {
    return buildExternalCandidate("product_page", "www.indiehackers.com", `/${segments[0]}/${segments[1]}`, slugToTitle(segments[1]));
  }

  if (host === "betalist.com" && ["startup", "startups"].includes(segments[0] ?? "")) {
    return buildExternalCandidate("product_page", host, `/${segments[0]}/${segments[1]}`, slugToTitle(segments[1]));
  }

  if (host === "appsumo.com") {
    if (segments[0] === "products" && segments[1] === "marketplace" && segments[2]) {
      return buildExternalCandidate("product_page", host, `/products/marketplace/${segments[2]}`, slugToTitle(segments[2]));
    }

    if ((segments[0] === "products" || segments[0] === "software") && segments[1]) {
      return buildExternalCandidate("product_page", host, `/${segments[0]}/${segments[1]}`, slugToTitle(segments[1]));
    }
  }

  return null;
}

function normalizeMarketplaceItem(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);

  if (isVsMarketplaceHost(host) && segments[0] === "items") {
    const itemName = url.searchParams.get("itemName");
    if (!itemName) return null;
    return buildCandidate(
      "marketplace_item",
      `https://marketplace.visualstudio.com/items?itemName=${itemName}`,
      "marketplace.visualstudio.com",
      itemName
    );
  }

  if (host === "plugins.jetbrains.com" && segments[0] === "plugin" && segments[1]) {
    return buildExternalCandidate("marketplace_item", host, `/plugin/${segments[1]}`, slugToTitle(segments[1]));
  }

  if (host === "marketplace.atlassian.com" && segments[0] === "apps" && segments[1]) {
    return buildExternalCandidate("marketplace_item", host, `/apps/${segments[1]}`, segments[2] ? slugToTitle(segments[2]) : `Atlassian app ${segments[1]}`);
  }

  if (host === "addons.mozilla.org") {
    const addonIndex = segments.indexOf("addon");
    const addonSlug = addonIndex >= 0 ? segments[addonIndex + 1] : null;
    if (!addonSlug) return null;
    return buildCandidate("marketplace_item", `https://addons.mozilla.org/addon/${addonSlug}`, host, slugToTitle(addonSlug));
  }

  if (host === "marketplace.cursor.com" && segments[0] === "items") {
    const itemName = url.searchParams.get("itemName");
    if (!itemName) return null;
    return buildCandidate(
      "marketplace_item",
      `https://marketplace.cursor.com/items?itemName=${itemName}`,
      host,
      itemName
    );
  }

  if ((host === "raycast.com" || host === "www.raycast.com") && segments[0] === "extensions" && segments[1]) {
    return buildExternalCandidate("marketplace_item", "raycast.com", url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "obsidian.md" && segments[0] === "plugins") {
    const pluginId = url.searchParams.get("id");
    if (!pluginId) return null;
    return buildCandidate("marketplace_item", `https://obsidian.md/plugins?id=${pluginId}`, host, slugToTitle(pluginId));
  }

  return null;
}

function normalizeRepositoryPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length === 0) return null;

  if (host === "bitbucket.org" && segments[0] && segments[1]) {
    if (segments[2] === "issues" && /^\d+$/.test(segments[3] ?? "")) {
      return buildExternalCandidate(
        "issue_page",
        host,
        `/${segments[0]}/${segments[1]}/issues/${segments[3]}`,
        `${segments[0]}/${segments[1]} issue #${segments[3]}`
      );
    }

    if (segments[2] === "pull-requests" && /^\d+$/.test(segments[3] ?? "")) {
      return buildExternalCandidate(
        "issue_page",
        host,
        `/${segments[0]}/${segments[1]}/pull-requests/${segments[3]}`,
        `${segments[0]}/${segments[1]} PR #${segments[3]}`
      );
    }

    if (segments.length === 2) {
      return buildExternalCandidate("repository_page", host, `/${segments[0]}/${segments[1]}`, `${segments[0]}/${segments[1]}`);
    }
  }

  if (host === "git.sr.ht" && segments[0]?.startsWith("~") && segments[1]) {
    return buildExternalCandidate("repository_page", host, `/${segments[0]}/${segments[1]}`, `${segments[0]}/${segments[1]}`);
  }

  if (isLaunchpadHost(host)) {
    const bugIndex = segments.indexOf("+bug");
    const bugId = bugIndex >= 0 ? segments[bugIndex + 1] : null;
    if (bugId && /^\d+$/.test(bugId)) {
      const project = segments[0] && segments[0] !== "+bug" ? segments[0] : "launchpad";
      return buildExternalCandidate("issue_page", host, `/${project}/+bug/${bugId}`, `${project} bug #${bugId}`);
    }

    if (host === "launchpad.net" && segments.length === 1 && segments[0] && !segments[0].startsWith("+")) {
      return buildExternalCandidate("repository_page", host, `/${segments[0]}`, segments[0]);
    }
  }

  return null;
}

function normalizeChromeWebStore(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (host !== "chromewebstore.google.com" || segments[0] !== "detail" || !segments[1] || !segments[2]) {
    return null;
  }

  return buildExternalCandidate(
    "chrome_web_store_item",
    host,
    `/detail/${segments[1]}/${segments[2]}`,
    slugToTitle(segments[1])
  );
}

function normalizeFigmaCommunity(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  const allowedTypes = new Set(["file", "plugin", "widget"]);

  if (
    (host !== "www.figma.com" && host !== "figma.com") ||
    segments[0] !== "community" ||
    !allowedTypes.has(segments[1] ?? "") ||
    !segments[2]
  ) {
    return null;
  }

  return buildExternalCandidate(
    "figma_community_resource",
    "www.figma.com",
    `/community/${segments[1]}/${segments[2]}`,
    `Figma ${segments[1]} ${segments[2]}`
  );
}

function normalizeDocsPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length === 0) return null;

  if (host === "docs.google.com" && segments[0] === "document" && segments[1] === "d" && segments[2]) {
    return buildExternalCandidate("docs_page", host, `/document/d/${segments[2]}`, `Google Doc ${segments[2]}`);
  }

  if (isAtlassianHost(host) && segments[0] === "wiki" && segments[1] === "spaces" && segments[2] && segments[3] === "pages" && segments[4]) {
    return buildExternalCandidate(
      "docs_page",
      host,
      `/wiki/spaces/${segments[2]}/pages/${segments[4]}`,
      `Confluence page ${segments[4]}`
    );
  }

  if (host === "sourcegraph.com" && segments[0] === "docs") {
    return buildExternalCandidate("docs_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "modal.com" && segments[0] === "docs") {
    return buildExternalCandidate("docs_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "helm.sh" && segments[0] === "docs") {
    return buildExternalCandidate("docs_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "docs.rs") {
    return buildExternalCandidate("docs_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "hexdocs.pm" || isReadTheDocsHost(host)) {
    return buildExternalCandidate("docs_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "sourcehut.org" && !sourcehutReservedSegments.has(segments[0] ?? "")) {
    return buildExternalCandidate("docs_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (isNotionHost(host) || isReadmeHost(host) || isMintlifyHost(host) || isGitbookHost(host) || isDocusaurusHost(host)) {
    return buildExternalCandidate("docs_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  return null;
}

function normalizeIssuePage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);

  if (host === "linear.app" && segments.length >= 3 && segments[1] === "issue" && segments[2]) {
    return buildExternalCandidate("issue_page", host, `/${segments[0]}/issue/${segments[2]}`, `${segments[0]} issue ${segments[2]}`);
  }

  if (isAtlassianHost(host) && segments[0] === "browse" && segments[1]) {
    return buildExternalCandidate("issue_page", host, `/browse/${segments[1]}`, `Issue ${segments[1]}`);
  }

  return null;
}

function normalizeFeedbackPost(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (!isCannyHost(host) || segments.length < 3 || segments[1] !== "p" || !segments[2]) return null;

  return buildExternalCandidate("feedback_post", host, `/${segments[0]}/p/${segments[2]}`, slugToTitle(segments[2]));
}

function normalizeEventPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (host !== "lu.ma" || !segments[0] || lumaReservedSegments.has(segments[0])) return null;

  return buildExternalCandidate("event_page", host, `/${segments[0]}`, slugToTitle(segments[0]));
}

function normalizeRegistryPackage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length === 0) return null;

  if (host === "hub.docker.com" && segments[0] === "r" && segments[1] && segments[2]) {
    return buildExternalCandidate("registry_package", host, `/r/${segments[1]}/${segments[2]}`, `${segments[1]}/${segments[2]}`);
  }

  if (host === "artifacthub.io" && segments[0] === "packages" && segments[1] && segments[2] && segments[3]) {
    return buildExternalCandidate(
      "registry_package",
      host,
      `/packages/${segments[1]}/${segments[2]}/${segments[3]}`,
      `${segments[2]}/${segments[3]}`
    );
  }

  if (host === "registry.terraform.io" && segments[0] === "providers" && segments[1] && segments[2]) {
    return buildExternalCandidate(
      "registry_package",
      host,
      `/providers/${segments[1]}/${segments[2]}`,
      `${segments[1]}/${segments[2]}`
    );
  }

  if (host === "registry.terraform.io" && segments[0] === "modules" && segments[1] && segments[2] && segments[3]) {
    return buildExternalCandidate(
      "registry_package",
      host,
      `/modules/${segments[1]}/${segments[2]}/${segments[3]}`,
      `${segments[1]}/${segments[2]}`
    );
  }

  if (host === "search.maven.org" && segments[0] === "artifact" && segments[1] && segments[2]) {
    return buildExternalCandidate(
      "registry_package",
      host,
      `/artifact/${segments[1]}/${segments[2]}`,
      `${segments[1]}/${segments[2]}`
    );
  }

  if ((host === "www.nuget.org" || host === "nuget.org") && segments[0] === "packages" && segments[1]) {
    return buildExternalCandidate("registry_package", "www.nuget.org", `/packages/${segments[1]}`, segments[1]);
  }

  if (host === "packagist.org" && segments[0] === "packages" && segments[1] && segments[2]) {
    return buildExternalCandidate("registry_package", host, `/packages/${segments[1]}/${segments[2]}`, `${segments[1]}/${segments[2]}`);
  }

  if (host === "rubygems.org" && segments[0] === "gems" && segments[1]) {
    return buildExternalCandidate("registry_package", host, `/gems/${segments[1]}`, segments[1]);
  }

  if (host === "crates.io" && segments[0] === "crates" && segments[1]) {
    return buildExternalCandidate("registry_package", host, `/crates/${segments[1]}`, segments[1]);
  }

  if (host === "pkg.go.dev") {
    return buildExternalCandidate("registry_package", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "hackage.haskell.org" && segments[0] === "package" && segments[1]) {
    return buildExternalCandidate("registry_package", host, `/package/${segments[1]}`, segments[1]);
  }

  if (host === "metacpan.org" && (segments[0] === "pod" || segments[0] === "dist") && segments[1]) {
    return buildExternalCandidate("registry_package", host, `/${segments[0]}/${segments[1]}`, segments[1]);
  }

  if (host === "homebrewformulae.brew.sh" && ["formula", "formula-linux", "cask"].includes(segments[0] ?? "") && segments[1]) {
    return buildExternalCandidate("registry_package", host, `/${segments[0]}/${segments[1]}`, segments[1]);
  }

  if (host === "jsr.io") {
    if (segments[0]?.startsWith("@") && segments[1]) {
      return buildExternalCandidate("registry_package", host, `/${segments[0]}/${segments[1]}`, `${segments[0]}/${segments[1]}`);
    }

    if (segments[0]) {
      return buildExternalCandidate("registry_package", host, `/${segments[0]}`, segments[0]);
    }
  }

  if (host === "pub.dev" && segments[0] === "packages" && segments[1]) {
    return buildExternalCandidate("registry_package", host, `/packages/${segments[1]}`, segments[1]);
  }

  if (host === "hex.pm" && segments[0] === "packages" && segments[1]) {
    return buildExternalCandidate("registry_package", host, `/packages/${segments[1]}`, segments[1]);
  }

  return null;
}

function normalizePackageComparisonPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (host !== "npmtrends.com" || !segments[0] || !segments[1]) return null;
  if (segments[0] !== "compare" && segments[0] !== "package") return null;

  return buildExternalCandidate(
    "package_comparison_page",
    host,
    `/${segments[0]}/${segments[1]}`,
    slugToTitle(segments[1])
  );
}

function normalizeModelPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length === 0) return null;

  if (host === "replicate.com" && segments.length === 2 && !showcaseReservedSegments.has(segments[0])) {
    return buildExternalCandidate("model_page", host, `/${segments[0]}/${segments[1]}`, `${segments[0]}/${segments[1]}`);
  }

  if (host === "openrouter.ai" && segments[0] === "models" && segments[1]) {
    const modelPath = segments[2] ? `/models/${segments[1]}/${segments[2]}` : `/models/${segments[1]}`;
    const title = segments[2] ? `${segments[1]}/${segments[2]}` : segments[1];
    return buildExternalCandidate("model_page", host, modelPath, title);
  }

  if (host === "ollama.com" && segments[0] === "library" && segments[1]) {
    return buildExternalCandidate("model_page", host, `/library/${segments[1]}`, segments[1]);
  }

  if (host === "modal.com" && segments[0] === "gallery" && segments[1]) {
    return buildExternalCandidate("model_page", host, `/gallery/${segments[1]}`, slugToTitle(segments[1]));
  }

  if ((host === "fal.ai" || host === "together.ai" || host === "weights.gg") && segments[0] === "models" && segments[1]) {
    return buildExternalCandidate("model_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if ((host === "www.kaggle.com" || host === "kaggle.com") && segments[0] === "models" && segments[1] && segments[2]) {
    return buildExternalCandidate("model_page", "www.kaggle.com", `/models/${segments[1]}/${segments[2]}`, `${segments[1]}/${segments[2]}`);
  }

  return null;
}

function normalizeShowcasePage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length === 0) return null;

  if (host === "v0.dev" && !showcaseReservedSegments.has(segments[0])) {
    return buildExternalCandidate("showcase_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "lovable.dev" && segments[0] === "projects" && segments[1]) {
    return buildExternalCandidate("showcase_page", host, `/projects/${segments[1]}`, `Lovable project ${segments[1]}`);
  }

  if (host === "bolt.new" && !showcaseReservedSegments.has(segments[0])) {
    return buildExternalCandidate("showcase_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if ((host === "dribbble.com" || host === "www.dribbble.com") && segments[0] === "shots" && segments[1]) {
    return buildExternalCandidate("showcase_page", "dribbble.com", `/shots/${segments[1]}`, `Dribbble shot ${segments[1]}`);
  }

  if ((host === "behance.net" || host === "www.behance.net") && segments[0] === "gallery" && segments[1]) {
    return buildExternalCandidate("showcase_page", "www.behance.net", `/gallery/${segments[1]}`, `Behance gallery ${segments[1]}`);
  }

  if (host === "mobbin.com" && segments.length >= 2 && !designReservedSegments.has(segments[0] ?? "")) {
    return buildExternalCandidate("showcase_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if ((host === "godly.website" || host === "land-book.com") && !designReservedSegments.has(segments[0] ?? "")) {
    return buildExternalCandidate("showcase_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  return null;
}

function normalizeKaggleResource(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if ((host !== "www.kaggle.com" && host !== "kaggle.com") || segments.length < 3) return null;
  if ((segments[0] !== "datasets" && segments[0] !== "code") || !segments[1] || !segments[2]) return null;

  return buildExternalCandidate(
    "kaggle_resource",
    "www.kaggle.com",
    `/${segments[0]}/${segments[1]}/${segments[2]}`,
    `${segments[1]}/${segments[2]}`
  );
}

function normalizeNotebookPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length === 0) return null;

  if (host === "observablehq.com") {
    if (segments[0] === "d" && segments[1]) {
      return buildExternalCandidate("notebook_page", host, `/d/${segments[1]}`, `Observable notebook ${segments[1]}`);
    }

    if (segments[0].startsWith("@") && segments[1]) {
      return buildExternalCandidate("notebook_page", host, `/${segments[0]}/${segments[1]}`, slugToTitle(segments[1]));
    }
  }

  if (host === "colab.research.google.com") {
    if (segments[0] === "drive" && segments[1]) {
      return buildExternalCandidate("notebook_page", host, `/drive/${segments[1]}`, `Colab notebook ${segments[1]}`);
    }

    if (segments[0] === "github" && segments.length >= 4) {
      return buildExternalCandidate("notebook_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
    }
  }

  if (host === "codesandbox.io") {
    if (segments[0] === "s" && segments[1]) {
      return buildExternalCandidate("notebook_page", host, `/s/${segments[1]}`, segments[1]);
    }

    if (segments[0] === "p" && segments[1] === "sandbox" && segments[2]) {
      return buildExternalCandidate("notebook_page", host, `/p/sandbox/${segments[2]}`, segments[2]);
    }
  }

  if (host === "stackblitz.com" && (segments[0] === "edit" || segments[0] === "github") && segments[1]) {
    return buildExternalCandidate("notebook_page", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "replit.com" && segments[0]?.startsWith("@") && segments[1]) {
    return buildExternalCandidate("notebook_page", host, `/${segments[0]}/${segments[1]}`, `${segments[0]}/${segments[1]}`);
  }

  return null;
}

function normalizePublicationPage(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);

  if (host === "dev.to" && segments.length === 1 && !devReservedSegments.has(segments[0])) {
    return buildExternalCandidate("publication_page", host, `/${segments[0]}`, segments[0]);
  }

  if (host === "hashnode.com" && segments.length === 1 && segments[0]?.startsWith("@")) {
    return buildExternalCandidate("publication_page", host, `/${segments[0]}`, segments[0]);
  }

  if (host === "substack.com" && segments.length === 1 && segments[0]?.startsWith("@")) {
    return buildExternalCandidate("publication_page", host, `/${segments[0]}`, segments[0]);
  }

  if (isSubstackHost(host) && segments.length === 0) {
    return buildCandidate("publication_page", `https://${host}`, host, host.replace(".substack.com", ""));
  }

  if (isSubstackHost(host) && segments.length === 1 && segments[0] === "archive") {
    return buildExternalCandidate("publication_page", host, "/archive", host.replace(".substack.com", ""));
  }

  return null;
}

function normalizeBlogPost(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (segments.length === 0) return null;

  if ((host === "indiehackers.com" || host === "www.indiehackers.com") && segments[0] === "post" && segments[1]) {
    return buildExternalCandidate("blog_post", "www.indiehackers.com", `/post/${segments[1]}`, slugToTitle(segments[1]));
  }

  if (host === "dev.to") {
    if (segments.length < 2 || devReservedSegments.has(segments[0])) return null;
    return buildExternalCandidate("blog_post", host, `/${segments[0]}/${segments[1]}`, slugToTitle(segments[1]));
  }

  if (host === "linear.app" && segments[0] === "changelog" && segments[1]) {
    return buildExternalCandidate("blog_post", host, `/changelog/${segments[1]}`, slugToTitle(segments[1]));
  }

  if (host === "substack.com" && segments[0]?.startsWith("@") && segments[1] && (segments[1] === "p" || segments[1] === "note")) {
    const slug = segments[2];
    if (!slug) return null;
    return buildExternalCandidate("blog_post", host, `/${segments[0]}/${segments[1]}/${slug}`, slugToTitle(slug));
  }

  if (isSubstackHost(host)) {
    if (segments[0] !== "p" || !segments[1]) return null;
    return buildExternalCandidate("blog_post", host, `/p/${segments[1]}`, slugToTitle(segments[1]));
  }

  if (host === "hashnode.com") {
    if (segments[0] === "post" && segments[1]) {
      return buildExternalCandidate("blog_post", host, `/post/${segments[1]}`, slugToTitle(segments[1]));
    }
    return null;
  }

  if (isHashnodeHost(host)) {
    return buildExternalCandidate("blog_post", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (isMediumHost(host)) {
    const lastSegment = segments[segments.length - 1];
    if (!lastSegment || mediumReservedSegments.has(segments[0])) return null;
    if (segments.length === 1 && !lastSegment.includes("-")) return null;
    return buildExternalCandidate("blog_post", host, url.pathname, slugToTitle(lastSegment));
  }

  if (host === "mirror.xyz" || host === "hackernoon.com" || host === "css-tricks.com") {
    return buildExternalCandidate("blog_post", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "www.infoq.com" && (segments[0] === "articles" || segments[0] === "news") && segments[1]) {
    return buildExternalCandidate("blog_post", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  if (host === "www.smashingmagazine.com" && segments.length >= 3) {
    return buildExternalCandidate("blog_post", host, url.pathname, slugToTitle(segments[segments.length - 1]));
  }

  return null;
}

function normalizeWikipediaArticle(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = splitPath(url);
  if (!isWikipediaHost(host) || segments[0] !== "wiki" || !segments[1] || segments[1].includes(":")) return null;

  return buildExternalCandidate("wikipedia_article", host, `/wiki/${segments[1]}`, slugToTitle(segments[1]));
}

export function normalizeUrl(rawUrl: string): NormalizedPageCandidate | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!isHttpUrl(url)) return null;

  const host = normalizeHost(url);

  if (host === "github.com") return normalizeGitHub(url);
  if (host === "gist.github.com") return normalizeGist(url);
  if (host === "news.ycombinator.com") return normalizeHackerNews(url);
  if (host === "producthunt.com" || host === "www.producthunt.com") return normalizeProductHunt(url);
  if (host === "lobste.rs") return normalizeLobsters(url);
  if (host === "gitlab.com") return normalizeGitLab(url);
  if (host === "huggingface.co") return normalizeHuggingFace(url);
  if (host === "npmjs.com" || host === "www.npmjs.com") return normalizeNpm(url);
  if (host === "pypi.org") return normalizePypi(url);
  if (host === "www.reddit.com" || host === "reddit.com" || host === "old.reddit.com") return normalizeReddit(url);
  if (host === "www.youtube.com" || host === "youtube.com" || host === "youtu.be") return normalizeYouTube(url);
  if (isStackExchangeHost(host)) return normalizeQaQuestion(url);
  if (
    host === "arxiv.org" ||
    host === "paperswithcode.com" ||
    host === "openreview.net" ||
    host === "semanticscholar.org" ||
    host === "www.semanticscholar.org"
  ) {
    return normalizeResearchPage(url);
  }
  if (
    host === "crunchbase.com" ||
    host === "www.crunchbase.com" ||
    host === "indiehackers.com" ||
    host === "www.indiehackers.com" ||
    host === "betalist.com" ||
    host === "appsumo.com"
  ) {
    return normalizeProductPage(url) ?? normalizeBlogPost(url);
  }
  if (
    isVsMarketplaceHost(host) ||
    host === "plugins.jetbrains.com" ||
    host === "marketplace.atlassian.com" ||
    host === "addons.mozilla.org" ||
    host === "marketplace.cursor.com" ||
    host === "raycast.com" ||
    host === "www.raycast.com" ||
    host === "obsidian.md"
  ) {
    return normalizeMarketplaceItem(url);
  }
  if (host === "bitbucket.org" || host === "git.sr.ht" || isLaunchpadHost(host)) {
    return normalizeRepositoryPage(url);
  }
  if (host === "chromewebstore.google.com") return normalizeChromeWebStore(url);
  if (host === "www.figma.com" || host === "figma.com") return normalizeFigmaCommunity(url);
  if (host === "linear.app" || isAtlassianHost(host)) {
    return normalizeIssuePage(url) ?? normalizeDocsPage(url) ?? normalizeBlogPost(url);
  }
  if (isCannyHost(host)) return normalizeFeedbackPost(url);
  if (host === "lu.ma") return normalizeEventPage(url);
  if (
    host === "hub.docker.com" ||
    host === "artifacthub.io" ||
    host === "registry.terraform.io" ||
    host === "search.maven.org" ||
    host === "www.nuget.org" ||
    host === "nuget.org" ||
    host === "packagist.org" ||
    host === "rubygems.org" ||
    host === "crates.io" ||
    host === "pkg.go.dev" ||
    host === "hackage.haskell.org" ||
    host === "metacpan.org" ||
    host === "homebrewformulae.brew.sh" ||
    host === "jsr.io" ||
    host === "pub.dev" ||
    host === "hex.pm"
  ) {
    return normalizeRegistryPackage(url);
  }
  if (host === "npmtrends.com") return normalizePackageComparisonPage(url);
  if (
    host === "replicate.com" ||
    host === "openrouter.ai" ||
    host === "ollama.com" ||
    host === "modal.com" ||
    host === "fal.ai" ||
    host === "together.ai" ||
    host === "weights.gg"
  ) {
    return normalizeModelPage(url) ?? normalizeDocsPage(url);
  }
  if (
    host === "v0.dev" ||
    host === "lovable.dev" ||
    host === "bolt.new" ||
    host === "dribbble.com" ||
    host === "www.dribbble.com" ||
    host === "behance.net" ||
    host === "www.behance.net" ||
    host === "mobbin.com" ||
    host === "godly.website" ||
    host === "land-book.com"
  ) {
    return normalizeShowcasePage(url);
  }
  if (host === "www.kaggle.com" || host === "kaggle.com") {
    return normalizeModelPage(url) ?? normalizeKaggleResource(url);
  }
  if (
    host === "observablehq.com" ||
    host === "colab.research.google.com" ||
    host === "codesandbox.io" ||
    host === "stackblitz.com" ||
    host === "replit.com"
  ) {
    return normalizeNotebookPage(url);
  }
  if (
    host === "www.notion.so" ||
    host.endsWith(".notion.site") ||
    host.endsWith(".readme.io") ||
    host.endsWith(".mintlify.app") ||
    host.endsWith(".gitbook.io") ||
    host.endsWith(".docusaurus.io") ||
    host === "docs.google.com" ||
    host === "sourcegraph.com" ||
    host === "modal.com" ||
    host === "sourcehut.org" ||
    host === "hexdocs.pm" ||
    isReadTheDocsHost(host) ||
    host === "helm.sh" ||
    host === "docs.rs"
  ) {
    return normalizeDocsPage(url);
  }
  if (
    host === "dev.to" ||
    host === "hashnode.com" ||
    host === "substack.com" ||
    host.endsWith(".substack.com") ||
    host === "indiehackers.com" ||
    host === "www.indiehackers.com"
  ) {
    return normalizeBlogPost(url) ?? normalizePublicationPage(url);
  }
  if (
    host.endsWith(".hashnode.dev") ||
    host === "medium.com" ||
    host.endsWith(".medium.com") ||
    host === "mirror.xyz" ||
    host === "hackernoon.com" ||
    host === "www.infoq.com" ||
    host === "www.smashingmagazine.com" ||
    host === "css-tricks.com"
  ) {
    return normalizeBlogPost(url);
  }
  if (host.endsWith(".wikipedia.org")) return normalizeWikipediaArticle(url);

  return normalizeExternalCandidate(url);
}
