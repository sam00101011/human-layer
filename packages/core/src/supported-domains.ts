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
    id: "github-discussion",
    enabled: true,
    hosts: ["github.com"],
    pageKind: "github_discussion",
    matchStrategy: "path_prefix",
    normalizer: "githubDiscussion",
    rolloutStage: "phase_0"
  },
  {
    id: "github-release",
    enabled: true,
    hosts: ["github.com"],
    pageKind: "github_release",
    matchStrategy: "path_prefix",
    normalizer: "githubRelease",
    rolloutStage: "phase_0"
  },
  {
    id: "gitlab-epic",
    enabled: true,
    hosts: ["gitlab.com"],
    pageKind: "gitlab_epic",
    matchStrategy: "path_prefix",
    normalizer: "gitlabEpic",
    rolloutStage: "phase_0"
  },
  {
    id: "reddit-thread",
    enabled: true,
    hosts: ["www.reddit.com", "reddit.com", "old.reddit.com"],
    pageKind: "reddit_thread",
    matchStrategy: "path_prefix",
    normalizer: "redditThread",
    rolloutStage: "phase_0"
  },
  {
    id: "youtube-video",
    enabled: true,
    hosts: ["www.youtube.com", "youtube.com", "youtu.be"],
    pageKind: "youtube_video",
    matchStrategy: "query_param",
    normalizer: "youtubeVideo",
    rolloutStage: "phase_0"
  },
  {
    id: "chrome-web-store-item",
    enabled: true,
    hosts: ["chromewebstore.google.com"],
    pageKind: "chrome_web_store_item",
    matchStrategy: "path_prefix",
    normalizer: "chromeWebStoreItem",
    rolloutStage: "phase_0"
  },
  {
    id: "figma-community-resource",
    enabled: true,
    hosts: ["www.figma.com", "figma.com"],
    pageKind: "figma_community_resource",
    matchStrategy: "path_prefix",
    normalizer: "figmaCommunityResource",
    rolloutStage: "phase_0"
  },
  {
    id: "issue-page",
    enabled: true,
    hosts: ["linear.app", "*.atlassian.net"],
    pageKind: "issue_page",
    matchStrategy: "path_prefix",
    normalizer: "issuePage",
    rolloutStage: "phase_0"
  },
  {
    id: "feedback-post",
    enabled: true,
    hosts: ["canny.io", "*.canny.io"],
    pageKind: "feedback_post",
    matchStrategy: "path_prefix",
    normalizer: "feedbackPost",
    rolloutStage: "phase_0"
  },
  {
    id: "event-page",
    enabled: true,
    hosts: ["lu.ma"],
    pageKind: "event_page",
    matchStrategy: "path_prefix",
    normalizer: "eventPage",
    rolloutStage: "phase_0"
  },
  {
    id: "registry-package",
    enabled: true,
    hosts: [
      "hub.docker.com",
      "artifacthub.io",
      "registry.terraform.io",
      "search.maven.org",
      "www.nuget.org",
      "nuget.org",
      "packagist.org",
      "rubygems.org",
      "crates.io",
      "pkg.go.dev",
      "hackage.haskell.org",
      "metacpan.org"
    ],
    pageKind: "registry_package",
    matchStrategy: "path_prefix",
    normalizer: "registryPackage",
    rolloutStage: "phase_0"
  },
  {
    id: "package-comparison-page",
    enabled: true,
    hosts: ["npmtrends.com"],
    pageKind: "package_comparison_page",
    matchStrategy: "path_prefix",
    normalizer: "packageComparisonPage",
    rolloutStage: "phase_0"
  },
  {
    id: "model-page",
    enabled: true,
    hosts: ["replicate.com"],
    pageKind: "model_page",
    matchStrategy: "path_prefix",
    normalizer: "modelPage",
    rolloutStage: "phase_0"
  },
  {
    id: "showcase-page",
    enabled: true,
    hosts: ["v0.dev", "lovable.dev", "bolt.new"],
    pageKind: "showcase_page",
    matchStrategy: "path_prefix",
    normalizer: "showcasePage",
    rolloutStage: "phase_0"
  },
  {
    id: "kaggle-resource",
    enabled: true,
    hosts: ["www.kaggle.com", "kaggle.com"],
    pageKind: "kaggle_resource",
    matchStrategy: "path_prefix",
    normalizer: "kaggleResource",
    rolloutStage: "phase_0"
  },
  {
    id: "notebook-page",
    enabled: true,
    hosts: [
      "observablehq.com",
      "colab.research.google.com",
      "codesandbox.io",
      "stackblitz.com",
      "replit.com"
    ],
    pageKind: "notebook_page",
    matchStrategy: "path_prefix",
    normalizer: "notebookPage",
    rolloutStage: "phase_0"
  },
  {
    id: "publication-page",
    enabled: true,
    hosts: ["dev.to", "hashnode.com", "substack.com", "*.substack.com"],
    pageKind: "publication_page",
    matchStrategy: "path_prefix",
    normalizer: "publicationPage",
    rolloutStage: "phase_0"
  },
  {
    id: "wikipedia-article",
    enabled: true,
    hosts: ["*.wikipedia.org"],
    pageKind: "wikipedia_article",
    matchStrategy: "path_prefix",
    normalizer: "wikipediaArticle",
    rolloutStage: "phase_0"
  },
  {
    id: "gist-snippet",
    enabled: true,
    hosts: ["gist.github.com"],
    pageKind: "gist_snippet",
    matchStrategy: "path_prefix",
    normalizer: "gistSnippet",
    rolloutStage: "phase_0"
  },
  {
    id: "docs-pages",
    enabled: true,
    hosts: [
      "www.notion.so",
      "*.notion.site",
      "*.readme.io",
      "*.mintlify.app",
      "*.gitbook.io",
      "*.docusaurus.io",
      "*.atlassian.net",
      "docs.google.com",
      "sourcegraph.com",
      "modal.com"
    ],
    pageKind: "docs_page",
    matchStrategy: "path_prefix",
    normalizer: "docsPage",
    rolloutStage: "phase_0"
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
      "*.substack.com",
      "linear.app",
      "mirror.xyz",
      "hackernoon.com",
      "www.infoq.com",
      "www.smashingmagazine.com",
      "css-tricks.com"
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
