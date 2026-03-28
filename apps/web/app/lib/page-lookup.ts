import {
  EMPTY_VERDICT_COUNTS,
  isPhase0EnabledPageKind,
  normalizeUrl,
  type NormalizedPageCandidate,
  type PageLookupResponse,
  type ThreadSnapshot
} from "@human-layer/core";
import {
  findPageByCanonicalKey,
  getPageThreadSnapshot,
  upsertPageFromCandidate,
  type StoredPage
} from "@human-layer/db";

export type PageLookupStore = {
  findPageByCanonicalKey(canonicalKey: string): Promise<StoredPage | null>;
  upsertPage(candidate: NormalizedPageCandidate, rawUrl: string): Promise<StoredPage>;
  getThreadSnapshot(pageId: string): Promise<ThreadSnapshot>;
};

export const dbPageLookupStore: PageLookupStore = {
  findPageByCanonicalKey,
  upsertPage: (candidate, rawUrl) => upsertPageFromCandidate(candidate, rawUrl),
  getThreadSnapshot: getPageThreadSnapshot
};

function hasActivity(snapshot: ThreadSnapshot): boolean {
  return (
    Object.values(snapshot.verdictCounts).some((count) => count > 0) ||
    snapshot.recentComments.length > 0
  );
}

function emptyResponse(): PageLookupResponse {
  return {
    supported: false,
    state: "unsupported",
    page: null,
    thread: null
  };
}

function emptyThread(): ThreadSnapshot {
  return {
    verdictCounts: { ...EMPTY_VERDICT_COUNTS },
    topHumanTake: null,
    recentComments: []
  };
}

export async function lookupPageByUrl(
  rawUrl: string,
  store: PageLookupStore = dbPageLookupStore
): Promise<PageLookupResponse> {
  const candidate = normalizeUrl(rawUrl);
  if (!candidate || !isPhase0EnabledPageKind(candidate.pageKind)) {
    return emptyResponse();
  }

  const page = candidate.requiresExistingPage
    ? await store.findPageByCanonicalKey(candidate.canonicalKey)
    : await store.upsertPage(candidate, rawUrl);

  if (!page) {
    return emptyResponse();
  }

  const thread = await store.getThreadSnapshot(page.id).catch(() => emptyThread());

  return {
    supported: true,
    state: hasActivity(thread) ? "active" : "empty",
    page: {
      id: page.id,
      pageKind: page.pageKind,
      canonicalUrl: page.canonicalUrl,
      canonicalKey: page.canonicalKey,
      host: page.host,
      title: page.title
    },
    thread
  };
}
