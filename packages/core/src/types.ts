export const PAGE_KINDS = [
  "github_repo",
  "github_issue",
  "github_pr",
  "hn_item",
  "hn_linked_url",
  "product_hunt_product",
  "lobsters_story",
  "gitlab_project",
  "gitlab_issue",
  "gitlab_merge_request",
  "github_discussion",
  "github_release",
  "gitlab_epic",
  "hugging_face_model",
  "hugging_face_dataset",
  "hugging_face_space",
  "npm_package",
  "pypi_package",
  "reddit_thread",
  "youtube_video",
  "qa_question",
  "research_page",
  "product_page",
  "marketplace_item",
  "repository_page",
  "chrome_web_store_item",
  "figma_community_resource",
  "issue_page",
  "feedback_post",
  "event_page",
  "registry_package",
  "package_comparison_page",
  "model_page",
  "showcase_page",
  "kaggle_resource",
  "notebook_page",
  "publication_page",
  "wikipedia_article",
  "gist_snippet",
  "docs_page",
  "blog_post"
] as const;

export type PageKind = (typeof PAGE_KINDS)[number];

export const PHASE_0_PAGE_KINDS = [
  "github_repo",
  "github_issue",
  "github_pr",
  "hn_item",
  "hn_linked_url",
  "product_hunt_product",
  "lobsters_story",
  "gitlab_project",
  "gitlab_issue",
  "gitlab_merge_request",
  "github_discussion",
  "github_release",
  "gitlab_epic",
  "hugging_face_model",
  "hugging_face_dataset",
  "hugging_face_space",
  "npm_package",
  "pypi_package",
  "reddit_thread",
  "youtube_video",
  "qa_question",
  "research_page",
  "product_page",
  "marketplace_item",
  "repository_page",
  "chrome_web_store_item",
  "figma_community_resource",
  "issue_page",
  "feedback_post",
  "event_page",
  "registry_package",
  "package_comparison_page",
  "model_page",
  "showcase_page",
  "kaggle_resource",
  "notebook_page",
  "publication_page",
  "wikipedia_article",
  "gist_snippet",
  "docs_page",
  "blog_post"
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
  "infra",
  "llms",
  "ml",
  "data",
  "analytics",
  "automation",
  "robotics",
  "bio",
  "apis",
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "cloud",
  "databases",
  "observability",
  "privacy",
  "ux",
  "product",
  "creator_tools",
  "saas",
  "enterprise",
  "growth",
  "ads",
  "seo",
  "sales",
  "marketplaces",
  "ecommerce",
  "communities",
  "media",
  "education",
  "fintech",
  "defi",
  "trading",
  "gaming"
] as const;

export type InterestTag = (typeof INTEREST_TAGS)[number];

export const MAX_PROFILE_INTERESTS = 8;

export type RolloutStage = "phase_0" | "later_v1";
export type MatchStrategy = "path_prefix" | "query_param" | "db_known_external";
export type NormalizerName =
  | "githubRepo"
  | "githubIssue"
  | "githubPr"
  | "hnItem"
  | "hnLinkedUrl"
  | "productHuntProduct"
  | "lobstersStory"
  | "gitlabProject"
  | "gitlabIssue"
  | "gitlabMergeRequest"
  | "githubDiscussion"
  | "githubRelease"
  | "gitlabEpic"
  | "huggingFaceModel"
  | "huggingFaceDataset"
  | "huggingFaceSpace"
  | "npmPackage"
  | "pypiPackage"
  | "redditThread"
  | "youtubeVideo"
  | "qaQuestion"
  | "researchPage"
  | "productPage"
  | "marketplaceItem"
  | "repositoryPage"
  | "chromeWebStoreItem"
  | "figmaCommunityResource"
  | "issuePage"
  | "feedbackPost"
  | "eventPage"
  | "registryPackage"
  | "packageComparisonPage"
  | "modelPage"
  | "showcasePage"
  | "kaggleResource"
  | "notebookPage"
  | "publicationPage"
  | "wikipediaArticle"
  | "gistSnippet"
  | "docsPage"
  | "blogPost";

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
  reputation?: ContributorReputation | null;
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

export type ProfileActivityItem = {
  id: string;
  type: "comment" | "verdict" | "bookmark";
  createdAt: string;
  pageId: string;
  pageKind: PageKind;
  pageTitle: string;
  canonicalUrl: string;
  summary: string;
  commentId?: string;
  verdict?: Verdict;
};

export type ContributorReputationLevel =
  | "new_voice"
  | "emerging_signal"
  | "steady_contributor"
  | "consistently_useful";

export type ContributorReputationMetrics = {
  publicTakeCount: number;
  helpfulVoteCount: number;
  followerCount: number;
  distinctPageCount: number;
  verdictCount: number;
};

export type ContributorReputation = {
  level: ContributorReputationLevel;
  label: string;
  description: string;
  evidence: string[];
};

export type ProfileSnapshot = {
  id: string;
  handle: string;
  verifiedHuman: boolean;
  reputation?: ContributorReputation;
  interestTags: InterestTag[];
  counts: ProfileCounts;
  recentComments: ProfileCommentSummary[];
  savedPages: PageSummary[];
  activity?: ProfileActivityItem[];
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
  savedByViewer?: boolean;
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
