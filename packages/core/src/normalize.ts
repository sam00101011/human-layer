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
  return decodeURIComponent(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function buildExternalCandidate(
  pageKind: NormalizedPageCandidate["pageKind"],
  host: string,
  pathname: string,
  title: string
): NormalizedPageCandidate {
  const normalizedPath = trimTrailingSlash(pathname);
  const canonicalUrl = `https://${host}${normalizedPath === "/" ? "" : normalizedPath}`;

  return {
    pageKind,
    canonicalUrl,
    canonicalKey: canonicalUrl,
    host,
    title,
    requiresExistingPage: false
  };
}

function normalizeGitHub(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = trimTrailingSlash(url.pathname).split("/").filter(Boolean);

  if (segments.length < 2) return null;

  const [owner, repo, third, fourth] = segments;
  if (!owner || !repo) return null;

  if (segments.length === 2) {
    const canonicalUrl = `https://github.com/${owner}/${repo}`;
    return {
      pageKind: "github_repo",
      canonicalUrl,
      canonicalKey: canonicalUrl,
      host,
      title: `${owner}/${repo}`,
      requiresExistingPage: false
    };
  }

  if (segments.length === 4 && third === "issues" && fourth && /^\d+$/.test(fourth)) {
    const canonicalUrl = `https://github.com/${owner}/${repo}/issues/${fourth}`;
    return {
      pageKind: "github_issue",
      canonicalUrl,
      canonicalKey: canonicalUrl,
      host,
      title: `${owner}/${repo} issue #${fourth}`,
      requiresExistingPage: false
    };
  }

  if (segments.length === 4 && third === "pull" && fourth && /^\d+$/.test(fourth)) {
    const canonicalUrl = `https://github.com/${owner}/${repo}/pull/${fourth}`;
    return {
      pageKind: "github_pr",
      canonicalUrl,
      canonicalKey: canonicalUrl,
      host,
      title: `${owner}/${repo} PR #${fourth}`,
      requiresExistingPage: false
    };
  }

  return null;
}

function normalizeHackerNews(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const pathname = trimTrailingSlash(url.pathname);

  if (pathname !== "/item") return null;

  const itemId = url.searchParams.get("id");
  if (!itemId || !/^\d+$/.test(itemId)) return null;

  const canonicalUrl = `https://news.ycombinator.com/item?id=${itemId}`;
  return {
    pageKind: "hn_item",
    canonicalUrl,
    canonicalKey: canonicalUrl,
    host,
    title: `HN item ${itemId}`,
    requiresExistingPage: false
  };
}

function normalizeProductHunt(url: URL): NormalizedPageCandidate | null {
  const host = "www.producthunt.com";
  const segments = trimTrailingSlash(url.pathname).split("/").filter(Boolean);
  if (segments.length !== 2) return null;

  const [section, slug] = segments;
  if (!slug || (section !== "products" && section !== "posts")) return null;

  return buildExternalCandidate("product_hunt_product", host, `/${section}/${slug}`, slugToTitle(slug));
}

function normalizeLobsters(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = trimTrailingSlash(url.pathname).split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [section, storyId] = segments;
  if (section !== "s" || !storyId) return null;

  return buildExternalCandidate("lobsters_story", host, `/s/${storyId}`, `Lobsters story ${storyId}`);
}

function normalizeGitLab(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = trimTrailingSlash(url.pathname).split("/").filter(Boolean);
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

    return null;
  }

  const namespace = segments.join("/");
  return buildExternalCandidate("gitlab_project", host, `/${namespace}`, namespace);
}

function normalizeHuggingFace(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = trimTrailingSlash(url.pathname).split("/").filter(Boolean);
  if (segments.length < 2) return null;

  if (segments[0] === "datasets" && segments.length === 3) {
    const [, owner, name] = segments;
    return buildExternalCandidate(
      "hugging_face_dataset",
      host,
      `/datasets/${owner}/${name}`,
      `${owner}/${name} dataset`
    );
  }

  if (segments[0] === "spaces" && segments.length === 3) {
    const [, owner, name] = segments;
    return buildExternalCandidate(
      "hugging_face_space",
      host,
      `/spaces/${owner}/${name}`,
      `${owner}/${name} Space`
    );
  }

  if (segments.length === 2) {
    const [owner, name] = segments;
    return buildExternalCandidate("hugging_face_model", host, `/${owner}/${name}`, `${owner}/${name}`);
  }

  return null;
}

function normalizeNpm(url: URL): NormalizedPageCandidate | null {
  const host = "www.npmjs.com";
  const segments = trimTrailingSlash(url.pathname).split("/").filter(Boolean);
  if (segments[0] !== "package") return null;

  if (segments.length === 2 && segments[1]) {
    return buildExternalCandidate("npm_package", host, `/package/${segments[1]}`, segments[1]);
  }

  if (segments.length === 3 && segments[1]?.startsWith("@") && segments[2]) {
    const packageName = `${segments[1]}/${segments[2]}`;
    return buildExternalCandidate("npm_package", host, `/package/${packageName}`, packageName);
  }

  return null;
}

function normalizePypi(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = trimTrailingSlash(url.pathname).split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== "project" || !segments[1]) return null;

  return buildExternalCandidate("pypi_package", host, `/project/${segments[1]}`, segments[1]);
}

const mediumReservedSegments = new Set(["about", "m", "tag", "topics", "membership", "me", "search"]);
const devToReservedSegments = new Set(["about", "latest", "top", "tags", "pod", "videos", "search"]);

function isMediumHost(host: string): boolean {
  return host === "medium.com" || host.endsWith(".medium.com");
}

function isHashnodeHost(host: string): boolean {
  return host === "hashnode.com" || host.endsWith(".hashnode.dev");
}

function isSubstackHost(host: string): boolean {
  return host.endsWith(".substack.com");
}

function normalizeBlogPost(url: URL): NormalizedPageCandidate | null {
  const host = normalizeHost(url);
  const segments = trimTrailingSlash(url.pathname).split("/").filter(Boolean);
  if (segments.length === 0) return null;

  if (host === "dev.to") {
    if (segments.length < 2 || devToReservedSegments.has(segments[0])) return null;
    return buildExternalCandidate("blog_post", host, `/${segments[0]}/${segments[1]}`, slugToTitle(segments[1]));
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

  return null;
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
  if (host === "news.ycombinator.com") return normalizeHackerNews(url);
  if (host === "producthunt.com" || host === "www.producthunt.com") return normalizeProductHunt(url);
  if (host === "lobste.rs") return normalizeLobsters(url);
  if (host === "gitlab.com") return normalizeGitLab(url);
  if (host === "huggingface.co") return normalizeHuggingFace(url);
  if (host === "npmjs.com" || host === "www.npmjs.com") return normalizeNpm(url);
  if (host === "pypi.org") return normalizePypi(url);
  if (
    host === "dev.to" ||
    host === "hashnode.com" ||
    host.endsWith(".hashnode.dev") ||
    host === "medium.com" ||
    host.endsWith(".medium.com") ||
    host.endsWith(".substack.com")
  ) {
    return normalizeBlogPost(url);
  }
  return normalizeExternalCandidate(url);
}
