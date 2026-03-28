import { describe, expect, it } from "vitest";

import { normalizeUrl } from "../src/normalize";

describe("normalizeUrl", () => {
  it("normalizes GitHub repo URLs", () => {
    const result = normalizeUrl("https://github.com/vercel/next.js/?tab=readme-ov-file#top");

    expect(result).toEqual({
      pageKind: "github_repo",
      canonicalUrl: "https://github.com/vercel/next.js",
      canonicalKey: "https://github.com/vercel/next.js",
      host: "github.com",
      title: "vercel/next.js",
      requiresExistingPage: false
    });
  });

  it("normalizes GitHub issue URLs", () => {
    const result = normalizeUrl("https://github.com/vercel/next.js/issues/12345?foo=bar");

    expect(result?.pageKind).toBe("github_issue");
    expect(result?.canonicalUrl).toBe("https://github.com/vercel/next.js/issues/12345");
  });

  it("normalizes GitHub pull request URLs", () => {
    const result = normalizeUrl("https://github.com/vercel/next.js/pull/9999/files");

    expect(result).toBeNull();
    expect(normalizeUrl("https://github.com/vercel/next.js/pull/9999?diff=split")?.canonicalUrl).toBe(
      "https://github.com/vercel/next.js/pull/9999"
    );
  });

  it("rejects unsupported GitHub paths", () => {
    expect(normalizeUrl("https://github.com/vercel")).toBeNull();
    expect(normalizeUrl("https://github.com/vercel/next.js/actions")).toBeNull();
  });

  it("normalizes Hacker News item URLs", () => {
    const result = normalizeUrl("https://news.ycombinator.com/item?id=40843880#comments");

    expect(result).toEqual({
      pageKind: "hn_item",
      canonicalUrl: "https://news.ycombinator.com/item?id=40843880",
      canonicalKey: "https://news.ycombinator.com/item?id=40843880",
      host: "news.ycombinator.com",
      title: "HN item 40843880",
      requiresExistingPage: false
    });
  });

  it("treats external URLs as HN linked candidates", () => {
    const result = normalizeUrl("https://react.dev/reference/react/useTransition?utm_source=hn#overview");

    expect(result).toEqual({
      pageKind: "hn_linked_url",
      canonicalUrl: "https://react.dev/reference/react/useTransition",
      canonicalKey: "https://react.dev/reference/react/useTransition",
      host: "react.dev",
      title: "react.dev/reference/react/useTransition",
      requiresExistingPage: true
    });
  });

  it("distinguishes HN item threads from linked external URLs", () => {
    const item = normalizeUrl("https://news.ycombinator.com/item?id=40843880");
    const linked = normalizeUrl("https://react.dev/reference/react/useTransition");

    expect(item?.pageKind).toBe("hn_item");
    expect(linked?.pageKind).toBe("hn_linked_url");
    expect(item?.canonicalKey).not.toBe(linked?.canonicalKey);
  });

  it("rejects non-http urls", () => {
    expect(normalizeUrl("mailto:test@example.com")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });

  it("normalizes Product Hunt product pages", () => {
    expect(normalizeUrl("https://www.producthunt.com/products/raycast?launch=1")).toEqual({
      pageKind: "product_hunt_product",
      canonicalUrl: "https://www.producthunt.com/products/raycast",
      canonicalKey: "https://www.producthunt.com/products/raycast",
      host: "www.producthunt.com",
      title: "raycast",
      requiresExistingPage: false
    });
  });

  it("normalizes Lobsters story URLs", () => {
    expect(normalizeUrl("https://lobste.rs/s/abc123/cool_launch#comments")).toEqual({
      pageKind: "lobsters_story",
      canonicalUrl: "https://lobste.rs/s/abc123",
      canonicalKey: "https://lobste.rs/s/abc123",
      host: "lobste.rs",
      title: "Lobsters story abc123",
      requiresExistingPage: false
    });
  });

  it("normalizes GitLab projects, issues, and merge requests", () => {
    expect(normalizeUrl("https://gitlab.com/gitlab-org/gitlab")?.pageKind).toBe("gitlab_project");
    expect(
      normalizeUrl("https://gitlab.com/gitlab-org/gitlab/-/issues/42?foo=bar")?.canonicalUrl
    ).toBe("https://gitlab.com/gitlab-org/gitlab/-/issues/42");
    expect(normalizeUrl("https://gitlab.com/gitlab-org/gitlab/-/merge_requests/99/diffs")).toBeNull();
    expect(
      normalizeUrl("https://gitlab.com/gitlab-org/gitlab/-/merge_requests/99")?.pageKind
    ).toBe("gitlab_merge_request");
  });

  it("normalizes Hugging Face models, datasets, and Spaces", () => {
    expect(normalizeUrl("https://huggingface.co/openai/gpt-oss-20b")?.pageKind).toBe(
      "hugging_face_model"
    );
    expect(
      normalizeUrl("https://huggingface.co/datasets/HuggingFaceFW/fineweb")?.pageKind
    ).toBe("hugging_face_dataset");
    expect(
      normalizeUrl("https://huggingface.co/spaces/huggingface-projects/diffuse-the-rest")
        ?.pageKind
    ).toBe("hugging_face_space");
  });

  it("normalizes npm and PyPI package pages", () => {
    expect(normalizeUrl("https://www.npmjs.com/package/react")?.canonicalUrl).toBe(
      "https://www.npmjs.com/package/react"
    );
    expect(normalizeUrl("https://www.npmjs.com/package/@vercel/analytics")?.canonicalUrl).toBe(
      "https://www.npmjs.com/package/@vercel/analytics"
    );
    expect(normalizeUrl("https://pypi.org/project/fastapi/")?.pageKind).toBe("pypi_package");
  });

  it("normalizes supported blog platforms", () => {
    expect(normalizeUrl("https://dev.to/addyosmani/modern-page-speed-1l2n")?.pageKind).toBe(
      "blog_post"
    );
    expect(normalizeUrl("https://builderio.substack.com/p/ai-agents")?.pageKind).toBe("blog_post");
    expect(normalizeUrl("https://samjulien.hashnode.dev/ship-your-next-side-project")?.pageKind).toBe(
      "blog_post"
    );
    expect(
      normalizeUrl("https://medium.com/@dan_abramov/before-you-memo-3c2abf7af0d2")?.pageKind
    ).toBe("blog_post");
  });

  it("normalizes GitHub discussions, releases, and gists", () => {
    expect(normalizeUrl("https://github.com/vercel/next.js/discussions/777")?.pageKind).toBe(
      "github_discussion"
    );
    expect(normalizeUrl("https://github.com/vercel/next.js/releases/tag/v16.0.0")?.pageKind).toBe(
      "github_release"
    );
    expect(normalizeUrl("https://gist.github.com/gaearon/91df0df1")?.pageKind).toBe("gist_snippet");
  });

  it("normalizes Reddit and YouTube pages", () => {
    expect(
      normalizeUrl("https://www.reddit.com/r/reactjs/comments/1abcde/big_release/")?.pageKind
    ).toBe("reddit_thread");
    expect(normalizeUrl("https://youtu.be/dQw4w9WgXcQ")?.canonicalUrl).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
  });

  it("normalizes Chrome Web Store and Figma Community resources", () => {
    expect(
      normalizeUrl("https://chromewebstore.google.com/detail/human-layer/abcdefghijklmnop")
        ?.pageKind
    ).toBe("chrome_web_store_item");
    expect(
      normalizeUrl("https://www.figma.com/community/file/1234567890/sample-community-file")
        ?.pageKind
    ).toBe("figma_community_resource");
  });

  it("normalizes docs-like surfaces", () => {
    expect(normalizeUrl("https://workspace.readme.io/reference/getting-started")?.pageKind).toBe(
      "docs_page"
    );
    expect(normalizeUrl("https://app.mintlify.app/getting-started/overview")?.pageKind).toBe(
      "docs_page"
    );
    expect(normalizeUrl("https://team.gitbook.io/docs/introduction")?.pageKind).toBe("docs_page");
    expect(
      normalizeUrl("https://company.atlassian.net/wiki/spaces/ENG/pages/12345678/Runbook")
        ?.pageKind
    ).toBe("docs_page");
    expect(normalizeUrl("https://docs.google.com/document/d/abc123456789/edit")?.pageKind).toBe(
      "docs_page"
    );
  });

  it("normalizes issue, feedback, and event pages", () => {
    expect(normalizeUrl("https://linear.app/acme/issue/HL-101/fix-the-overlay")?.pageKind).toBe(
      "issue_page"
    );
    expect(normalizeUrl("https://acme.canny.io/feature-requests/p/add-more-sites")?.pageKind).toBe(
      "feedback_post"
    );
    expect(normalizeUrl("https://lu.ma/ship-week")?.pageKind).toBe("event_page");
  });

  it("normalizes more registry surfaces", () => {
    expect(normalizeUrl("https://hub.docker.com/r/library/nginx")?.pageKind).toBe(
      "registry_package"
    );
    expect(
      normalizeUrl("https://registry.terraform.io/providers/hashicorp/aws/latest")?.pageKind
    ).toBe("registry_package");
    expect(normalizeUrl("https://search.maven.org/artifact/org.slf4j/slf4j-api")?.pageKind).toBe(
      "registry_package"
    );
    expect(normalizeUrl("https://www.nuget.org/packages/Newtonsoft.Json")?.pageKind).toBe(
      "registry_package"
    );
    expect(normalizeUrl("https://npmtrends.com/compare/react-vs-vue")?.pageKind).toBe(
      "package_comparison_page"
    );
  });

  it("normalizes replicate, showcase, kaggle, and notebook pages", () => {
    expect(normalizeUrl("https://replicate.com/black-forest-labs/flux-schnell")?.pageKind).toBe(
      "model_page"
    );
    expect(normalizeUrl("https://lovable.dev/projects/abc123")?.pageKind).toBe("showcase_page");
    expect(normalizeUrl("https://www.kaggle.com/datasets/startupsci/titanic-data-set")?.pageKind).toBe(
      "kaggle_resource"
    );
    expect(normalizeUrl("https://observablehq.com/@d3/bar-chart")?.pageKind).toBe(
      "notebook_page"
    );
    expect(normalizeUrl("https://replit.com/@sam00101011/hello-human-layer")?.pageKind).toBe(
      "notebook_page"
    );
  });

  it("normalizes publications, more blogs, wikipedia, and gists", () => {
    expect(normalizeUrl("https://dev.to/vercel")?.pageKind).toBe("publication_page");
    expect(normalizeUrl("https://samstack.substack.com")?.pageKind).toBe("publication_page");
    expect(normalizeUrl("https://mirror.xyz/0xabc/def")?.pageKind).toBe("blog_post");
    expect(normalizeUrl("https://hackernoon.com/how-to-ship-agents")?.pageKind).toBe("blog_post");
    expect(normalizeUrl("https://en.wikipedia.org/wiki/Next.js")?.pageKind).toBe(
      "wikipedia_article"
    );
    expect(normalizeUrl("https://gist.github.com/gaearon/91df0df1")?.pageKind).toBe(
      "gist_snippet"
    );
  });
});
