export const PAGE_KINDS = [
  "github_repo",
  "github_issue",
  "github_pr",
  "hn_item",
  "hn_linked_url",
  "product_hunt_product",
  "docs_page",
  "blog_post"
] as const;

export type PageKind = (typeof PAGE_KINDS)[number];

export const PHASE_0_PAGE_KINDS = [
  "github_repo",
  "github_issue",
  "github_pr",
  "hn_item",
  "hn_linked_url"
] as const satisfies readonly PageKind[];

export type Phase0PageKind = (typeof PHASE_0_PAGE_KINDS)[number];

export const VERDICTS = ["useful", "misleading", "outdated", "scam"] as const;

export type Verdict = (typeof VERDICTS)[number];

export const ANALYTICS_EVENTS = [
  "overlay_opened",
  "verify_started",
  "verify_succeeded",
  "comment_posted",
  "page_saved"
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const INTEREST_TAGS = [
  "ai",
  "agents",
  "crypto",
  "devtools",
  "research",
  "oss",
  "security",
  "design",
  "startups",
  "markets",
  "governance",
  "infra"
] as const;

export type InterestTag = (typeof INTEREST_TAGS)[number];

export const MAX_PROFILE_INTERESTS = 5;

export type RolloutStage = "phase_0" | "later_v1";
export type MatchStrategy = "path_prefix" | "query_param" | "db_known_external";
export type NormalizerName =
  | "githubRepo"
  | "githubIssue"
  | "githubPr"
  | "hnItem"
  | "hnLinkedUrl";

export type SupportedDomainRule = {
  id: string;
  enabled: boolean;
  hosts: string[];
  pageKind: PageKind;
  matchStrategy: MatchStrategy;
  normalizer: NormalizerName;
  rolloutStage: RolloutStage;
};

export type TopHumanTake = {
  commentId: string;
  profileId: string;
  profileHandle: string;
  body: string;
  helpfulCount: number;
  createdAt: string;
} | null;

export type CommentProjection = NonNullable<TopHumanTake>;

export type VerdictCounts = Record<Verdict, number>;

export type ThreadSnapshot = {
  verdictCounts: VerdictCounts;
  topHumanTake: TopHumanTake;
  recentComments: CommentProjection[];
};

export type ViewerSummary = {
  profileId: string;
  handle: string;
};

export type ProfileCounts = {
  comments: number;
  saves: number;
  followers: number;
  following: number;
};

export type ProfileCommentSummary = CommentProjection & {
  pageId: string;
  pageKind: PageKind;
  pageTitle: string;
  canonicalUrl: string;
};

export type ProfileSnapshot = {
  id: string;
  handle: string;
  verifiedHuman: boolean;
  interestTags: InterestTag[];
  counts: ProfileCounts;
  recentComments: ProfileCommentSummary[];
  savedPages: PageSummary[];
  createdAt: string;
};

export type PageSummary = {
  id: string;
  pageKind: PageKind;
  canonicalUrl: string;
  canonicalKey: string;
  host: string;
  title: string;
};

export type PageLookupState = "unsupported" | "empty" | "active";

export type PageLookupResponse = {
  supported: boolean;
  state: PageLookupState;
  page: PageSummary | null;
  thread: ThreadSnapshot | null;
  viewer?: ViewerSummary | null;
};

export type NormalizedPageCandidate = {
  pageKind: Phase0PageKind;
  canonicalUrl: string;
  canonicalKey: string;
  host: string;
  title: string;
  requiresExistingPage: boolean;
};

export const EMPTY_VERDICT_COUNTS: VerdictCounts = {
  useful: 0,
  misleading: 0,
  outdated: 0,
  scam: 0
};
