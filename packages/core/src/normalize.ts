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
  return normalizeExternalCandidate(url);
}
