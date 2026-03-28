import type { PageKind, SupportedDomainRule } from "./types";

export const SUPPORTED_DOMAIN_RULES: SupportedDomainRule[] = [
  {
    id: "github-repo",
    enabled: true,
    hosts: ["github.com"],
    pageKind: "github_repo",
    matchStrategy: "path_prefix",
    normalizer: "githubRepo",
    rolloutStage: "phase_0"
  },
  {
    id: "github-issue",
    enabled: true,
    hosts: ["github.com"],
    pageKind: "github_issue",
    matchStrategy: "path_prefix",
    normalizer: "githubIssue",
    rolloutStage: "phase_0"
  },
  {
    id: "github-pr",
    enabled: true,
    hosts: ["github.com"],
    pageKind: "github_pr",
    matchStrategy: "path_prefix",
    normalizer: "githubPr",
    rolloutStage: "phase_0"
  },
  {
    id: "hn-item",
    enabled: true,
    hosts: ["news.ycombinator.com"],
    pageKind: "hn_item",
    matchStrategy: "query_param",
    normalizer: "hnItem",
    rolloutStage: "phase_0"
  },
  {
    id: "hn-linked-url",
    enabled: true,
    hosts: [],
    pageKind: "hn_linked_url",
    matchStrategy: "db_known_external",
    normalizer: "hnLinkedUrl",
    rolloutStage: "phase_0"
  },
  {
    id: "product-hunt-product",
    enabled: true,
    hosts: ["www.producthunt.com", "producthunt.com"],
    pageKind: "product_hunt_product",
    matchStrategy: "path_prefix",
    normalizer: "productHuntProduct",
    rolloutStage: "phase_0"
  },
  {
    id: "lobsters-story",
    enabled: true,
    hosts: ["lobste.rs"],
    pageKind: "lobsters_story",
    matchStrategy: "path_prefix",
    normalizer: "lobstersStory",
    rolloutStage: "phase_0"
  },
  {
    id: "gitlab-project",
    enabled: true,
    hosts: ["gitlab.com"],
    pageKind: "gitlab_project",
    matchStrategy: "path_prefix",
    normalizer: "gitlabProject",
    rolloutStage: "phase_0"
  },
  {
    id: "gitlab-issue",
    enabled: true,
    hosts: ["gitlab.com"],
    pageKind: "gitlab_issue",
    matchStrategy: "path_prefix",
    normalizer: "gitlabIssue",
    rolloutStage: "phase_0"
  },
  {
    id: "gitlab-merge-request",
    enabled: true,
    hosts: ["gitlab.com"],
    pageKind: "gitlab_merge_request",
    matchStrategy: "path_prefix",
    normalizer: "gitlabMergeRequest",
    rolloutStage: "phase_0"
  },
  {
    id: "hugging-face-model",
    enabled: true,
    hosts: ["huggingface.co"],
    pageKind: "hugging_face_model",
    matchStrategy: "path_prefix",
    normalizer: "huggingFaceModel",
    rolloutStage: "phase_0"
  },
  {
    id: "hugging-face-dataset",
    enabled: true,
    hosts: ["huggingface.co"],
    pageKind: "hugging_face_dataset",
    matchStrategy: "path_prefix",
    normalizer: "huggingFaceDataset",
    rolloutStage: "phase_0"
  },
  {
    id: "hugging-face-space",
    enabled: true,
    hosts: ["huggingface.co"],
    pageKind: "hugging_face_space",
    matchStrategy: "path_prefix",
    normalizer: "huggingFaceSpace",
    rolloutStage: "phase_0"
  },
  {
    id: "npm-package",
    enabled: true,
    hosts: ["www.npmjs.com", "npmjs.com"],
    pageKind: "npm_package",
    matchStrategy: "path_prefix",
    normalizer: "npmPackage",
    rolloutStage: "phase_0"
  },
  {
    id: "pypi-package",
    enabled: true,
    hosts: ["pypi.org"],
    pageKind: "pypi_package",
    matchStrategy: "path_prefix",
    normalizer: "pypiPackage",
    rolloutStage: "phase_0"
  },
  {
    id: "docs-pages",
    enabled: false,
    hosts: [],
    pageKind: "docs_page",
    matchStrategy: "db_known_external",
    normalizer: "hnLinkedUrl",
    rolloutStage: "later_v1"
  },
  {
    id: "blog-posts",
    enabled: true,
    hosts: [
      "dev.to",
      "medium.com",
      "*.medium.com",
      "hashnode.com",
      "*.hashnode.dev",
      "*.substack.com"
    ],
    pageKind: "blog_post",
    matchStrategy: "path_prefix",
    normalizer: "blogPost",
    rolloutStage: "phase_0"
  }
];

export function isPhase0EnabledPageKind(pageKind: PageKind): boolean {
  return SUPPORTED_DOMAIN_RULES.some(
    (rule) => rule.enabled && rule.rolloutStage === "phase_0" && rule.pageKind === pageKind
  );
}
