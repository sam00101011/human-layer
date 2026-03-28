import { describe, expect, it } from "vitest";

import { getOverlayTarget } from "../lib/overlay-target";

describe("getOverlayTarget", () => {
  it("returns a direct overlay target for GitHub repo pages", () => {
    expect(getOverlayTarget("https://github.com/vercel/next.js")?.pageKind).toBe("github_repo");
  });

  it("returns a direct overlay target for Hacker News item pages", () => {
    expect(
      getOverlayTarget("https://news.ycombinator.com/item?id=40843880")?.pageKind
    ).toBe("hn_item");
  });

  it("returns direct overlay targets for newly supported surfaces", () => {
    expect(getOverlayTarget("https://www.producthunt.com/products/raycast")?.pageKind).toBe(
      "product_hunt_product"
    );
    expect(getOverlayTarget("https://lobste.rs/s/abc123/cool_launch")?.pageKind).toBe(
      "lobsters_story"
    );
    expect(getOverlayTarget("https://gitlab.com/gitlab-org/gitlab/-/issues/42")?.pageKind).toBe(
      "gitlab_issue"
    );
    expect(getOverlayTarget("https://huggingface.co/openai/gpt-oss-20b")?.pageKind).toBe(
      "hugging_face_model"
    );
    expect(getOverlayTarget("https://www.npmjs.com/package/react")?.pageKind).toBe("npm_package");
    expect(getOverlayTarget("https://pypi.org/project/fastapi/")?.pageKind).toBe("pypi_package");
    expect(getOverlayTarget("https://dev.to/addyosmani/modern-page-speed-1l2n")?.pageKind).toBe(
      "blog_post"
    );
    expect(getOverlayTarget("https://www.reddit.com/r/reactjs/comments/1abcde/big_release/")?.pageKind).toBe(
      "reddit_thread"
    );
    expect(getOverlayTarget("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.pageKind).toBe(
      "youtube_video"
    );
    expect(getOverlayTarget("https://chromewebstore.google.com/detail/human-layer/abcdefghijklmnop")?.pageKind).toBe(
      "chrome_web_store_item"
    );
    expect(getOverlayTarget("https://linear.app/acme/issue/HL-101/fix-the-overlay")?.pageKind).toBe(
      "issue_page"
    );
    expect(getOverlayTarget("https://hub.docker.com/r/library/nginx")?.pageKind).toBe(
      "registry_package"
    );
    expect(getOverlayTarget("https://observablehq.com/@d3/bar-chart")?.pageKind).toBe(
      "notebook_page"
    );
    expect(getOverlayTarget("https://en.wikipedia.org/wiki/Next.js")?.pageKind).toBe(
      "wikipedia_article"
    );
    expect(getOverlayTarget("https://gist.github.com/gaearon/91df0df1")?.pageKind).toBe(
      "gist_snippet"
    );
  });

  it("rejects unsupported GitHub paths", () => {
    expect(getOverlayTarget("https://github.com/vercel")).toBeNull();
  });

  it("rejects non-overlay external URLs", () => {
    expect(getOverlayTarget("https://x.com/_nicolealonso")).toBeNull();
  });
});
