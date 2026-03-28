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
    "https://news.ycombinator.com/*",
    "https://producthunt.com/*",
    "https://www.producthunt.com/*",
    "https://lobste.rs/*",
    "https://gitlab.com/*",
    "https://huggingface.co/*",
    "https://npmjs.com/*",
    "https://www.npmjs.com/*",
    "https://pypi.org/*",
    "https://dev.to/*",
    "https://medium.com/*",
    "https://*.medium.com/*",
    "https://hashnode.com/*",
    "https://*.hashnode.dev/*",
    "https://*.substack.com/*"
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
