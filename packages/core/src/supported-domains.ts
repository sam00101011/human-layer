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
    enabled: false,
    hosts: ["www.producthunt.com", "producthunt.com"],
    pageKind: "product_hunt_product",
    matchStrategy: "path_prefix",
    normalizer: "hnLinkedUrl",
    rolloutStage: "later_v1"
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
    enabled: false,
    hosts: [],
    pageKind: "blog_post",
    matchStrategy: "db_known_external",
    normalizer: "hnLinkedUrl",
    rolloutStage: "later_v1"
  }
];

export function isPhase0EnabledPageKind(pageKind: PageKind): boolean {
  return SUPPORTED_DOMAIN_RULES.some(
    (rule) => rule.enabled && rule.rolloutStage === "phase_0" && rule.pageKind === pageKind
  );
}
