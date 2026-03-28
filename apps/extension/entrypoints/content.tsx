import React from "react";
import { createRoot, type Root } from "react-dom/client";

import { OverlayController } from "../components/OverlayController";
import { appUrl } from "../lib/config";
import { getOverlayTarget } from "../lib/overlay-target";

function createHost() {
  const host = document.createElement("div");
  host.id = "human-layer-root";
  host.style.position = "fixed";
  host.style.top = "16px";
  host.style.right = "16px";
  host.style.zIndex = "2147483647";
  return host;
}

export default defineContentScript({
  matches: [
    "https://github.com/*",
    "https://gist.github.com/*",
    "https://news.ycombinator.com/*",
    "https://producthunt.com/*",
    "https://www.producthunt.com/*",
    "https://lobste.rs/*",
    "https://gitlab.com/*",
    "https://huggingface.co/*",
    "https://npmjs.com/*",
    "https://www.npmjs.com/*",
    "https://pypi.org/*",
    "https://www.reddit.com/*",
    "https://reddit.com/*",
    "https://old.reddit.com/*",
    "https://www.youtube.com/*",
    "https://youtube.com/*",
    "https://youtu.be/*",
    "https://stackoverflow.com/*",
    "https://*.stackexchange.com/*",
    "https://serverfault.com/*",
    "https://superuser.com/*",
    "https://askubuntu.com/*",
    "https://stackapps.com/*",
    "https://mathoverflow.net/*",
    "https://arxiv.org/*",
    "https://paperswithcode.com/*",
    "https://openreview.net/*",
    "https://www.semanticscholar.org/*",
    "https://semanticscholar.org/*",
    "https://www.crunchbase.com/*",
    "https://crunchbase.com/*",
    "https://www.indiehackers.com/*",
    "https://indiehackers.com/*",
    "https://betalist.com/*",
    "https://appsumo.com/*",
    "https://marketplace.visualstudio.com/*",
    "https://visualstudiomarketplace.com/*",
    "https://plugins.jetbrains.com/*",
    "https://marketplace.atlassian.com/*",
    "https://addons.mozilla.org/*",
    "https://marketplace.cursor.com/*",
    "https://raycast.com/*",
    "https://www.raycast.com/*",
    "https://obsidian.md/*",
    "https://bitbucket.org/*",
    "https://git.sr.ht/*",
    "https://launchpad.net/*",
    "https://bugs.launchpad.net/*",
    "https://chromewebstore.google.com/*",
    "https://www.figma.com/*",
    "https://figma.com/*",
    "https://linear.app/*",
    "https://*.atlassian.net/*",
    "https://canny.io/*",
    "https://*.canny.io/*",
    "https://lu.ma/*",
    "https://hub.docker.com/*",
    "https://artifacthub.io/*",
    "https://registry.terraform.io/*",
    "https://search.maven.org/*",
    "https://www.nuget.org/*",
    "https://nuget.org/*",
    "https://packagist.org/*",
    "https://rubygems.org/*",
    "https://crates.io/*",
    "https://pkg.go.dev/*",
    "https://hackage.haskell.org/*",
    "https://metacpan.org/*",
    "https://homebrewformulae.brew.sh/*",
    "https://jsr.io/*",
    "https://pub.dev/*",
    "https://hex.pm/*",
    "https://npmtrends.com/*",
    "https://replicate.com/*",
    "https://openrouter.ai/*",
    "https://ollama.com/*",
    "https://fal.ai/*",
    "https://together.ai/*",
    "https://weights.gg/*",
    "https://v0.dev/*",
    "https://lovable.dev/*",
    "https://bolt.new/*",
    "https://www.kaggle.com/*",
    "https://kaggle.com/*",
    "https://observablehq.com/*",
    "https://colab.research.google.com/*",
    "https://codesandbox.io/*",
    "https://stackblitz.com/*",
    "https://replit.com/*",
    "https://www.notion.so/*",
    "https://*.notion.site/*",
    "https://*.readme.io/*",
    "https://*.mintlify.app/*",
    "https://*.gitbook.io/*",
    "https://*.docusaurus.io/*",
    "https://sourcehut.org/*",
    "https://hexdocs.pm/*",
    "https://readthedocs.io/*",
    "https://*.readthedocs.io/*",
    "https://helm.sh/*",
    "https://docs.rs/*",
    "https://docs.google.com/*",
    "https://sourcegraph.com/*",
    "https://modal.com/*",
    "https://dev.to/*",
    "https://medium.com/*",
    "https://*.medium.com/*",
    "https://hashnode.com/*",
    "https://*.hashnode.dev/*",
    "https://substack.com/*",
    "https://*.substack.com/*",
    "https://mirror.xyz/*",
    "https://hackernoon.com/*",
    "https://www.infoq.com/*",
    "https://www.smashingmagazine.com/*",
    "https://css-tricks.com/*",
    "https://dribbble.com/*",
    "https://www.dribbble.com/*",
    "https://behance.net/*",
    "https://www.behance.net/*",
    "https://mobbin.com/*",
    "https://godly.website/*",
    "https://land-book.com/*",
    "https://*.wikipedia.org/*"
  ],
  async main(ctx) {
    let host: HTMLDivElement | null = null;
    let root: Root | null = null;
    let mountedUrl: string | null = null;

    function cleanup() {
      root?.unmount();
      root = null;
      host?.remove();
      host = null;
      mountedUrl = null;
    }

    function renderForUrl(rawUrl: string) {
      const target = getOverlayTarget(rawUrl);
      if (!target || !document.body) {
        cleanup();
        return;
      }

      if (mountedUrl === rawUrl && host && root) return;

      cleanup();

      host = createHost();
      const shadowRoot = host.attachShadow({ mode: "open" });
      document.body.appendChild(host);

      const mountPoint = document.createElement("div");
      shadowRoot.appendChild(mountPoint);

      root = createRoot(mountPoint);
      mountedUrl = rawUrl;

      root.render(
        <OverlayController
          key={rawUrl}
          appUrl={appUrl}
          currentUrl={rawUrl}
          initialLookup={null}
          target={target}
        />
      );
    }

    renderForUrl(window.location.href);

    ctx.addEventListener(window, "wxt:locationchange", () => {
      renderForUrl(window.location.href);
    });

    ctx.onInvalidated(() => {
      cleanup();
    });
  }
});
