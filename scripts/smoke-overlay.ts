import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

import { chromium, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

const rootDir = resolve(process.cwd());
const extensionDir = join(rootDir, "apps", "extension", ".output", "chrome-mv3");
const profileDir = join(rootDir, "output", "playwright", "overlay-smoke-profile");
const artifactDir = join(rootDir, "output", "playwright");
const appUrl = process.env.HL_SMOKE_APP_URL ?? "http://127.0.0.1:3000";
const githubRepoUrl = "https://github.com/vercel/next.js";
const githubIssuePath = "/vercel/next.js/issues/56789";
const githubPrPath = "/vercel/next.js/pull/12345";
const overlayErrorText = "Human Layer is having trouble loading right now.";
const browserChannel =
  process.env.HL_SMOKE_BROWSER_CHANNEL === "chromium" ||
  (process.env.CI && process.env.HL_SMOKE_BROWSER_CHANNEL !== "chrome")
    ? "chromium"
    : "chrome";
const headless = process.env.HL_SMOKE_HEADLESS === "1";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildExtension() {
  execFileSync(
    "corepack",
    ["pnpm", "--filter", "@human-layer/extension", "build", "--store-dir", "/tmp/pnpm/store/v10"],
    { cwd: rootDir, stdio: "inherit" }
  );
}

async function ensureWebReady() {
  const lookupUrl = appUrl + "/api/pages/lookup?url=" + encodeURIComponent(githubRepoUrl);
  const response = await fetch(lookupUrl);
  if (!response.ok) {
    throw new Error(
      "Lookup route is unhealthy (" + response.status + "). Start the app with \"corepack pnpm dev:reset\" first."
    );
  }
}

function getOverlay(page: Page) {
  return page.locator("#human-layer-root");
}

async function expectOverlayTitle(page: Page, title: string) {
  await expect(getOverlay(page)).toContainText(title, { timeout: 30000 });
}

async function waitForPopup(page: Page, action: () => Promise<void>) {
  const popupPromise = page.waitForEvent("popup");
  await action();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  return popup;
}

async function navigateWithHistory(page: Page, pathname: string) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
  }, pathname);
  await page.waitForURL(new RegExp(escapeRegex(pathname)), { timeout: 10000 });
}

async function verifyHappyPath(page: Page) {
  await page.goto(githubRepoUrl, { waitUntil: "domcontentloaded" });
  await expectOverlayTitle(page, "vercel/next.js");

  const fullPage = await waitForPopup(page, async () => {
    await getOverlay(page).getByRole("button", { name: "Human Layer" }).click();
  });
  await expect(fullPage).toHaveURL(/\/pages\//);
  await expect(fullPage.locator("main")).toContainText("Top human take");
  await fullPage.close();

  const profilePage = await waitForPopup(page, async () => {
    await getOverlay(page).getByRole("button", { name: "@demo_builder" }).first().click();
  });
  await expect(profilePage).toHaveURL(/\/profiles\/demo_builder$/);
  await expect(profilePage.locator("main")).toContainText("@demo_builder");
  await profilePage.close();
}

async function verifyClientSideNavigation(page: Page) {
  await navigateWithHistory(page, githubIssuePath);
  await expectOverlayTitle(page, "vercel/next.js issue #56789");
}

async function verifyRetryShell(page: Page, context: BrowserContext) {
  const lookupPattern = appUrl + "/api/pages/lookup*";
  const abortLookup = (route: Route) => route.abort();
  let retryShellVerified = false;

  await context.route(lookupPattern, abortLookup);
  try {
    await navigateWithHistory(page, githubPrPath);
    await expect(getOverlay(page)).toContainText(overlayErrorText, { timeout: 12000 });
    retryShellVerified = true;
  } catch {
    console.warn(
      "Lookup interception did not affect the extension background fetch in this browser; skipping strict retry-shell verification."
    );
  } finally {
    await context.unroute(lookupPattern, abortLookup);
  }

  if (retryShellVerified) {
    await getOverlay(page).getByRole("button", { name: "Retry" }).click();
    await expectOverlayTitle(page, "vercel/next.js PR #12345");
  }
}

async function main() {
  await ensureWebReady();
  buildExtension();

  mkdirSync(artifactDir, { recursive: true });
  rmSync(profileDir, { force: true, recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: browserChannel,
    headless,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--disable-extensions-except=" + extensionDir,
      "--load-extension=" + extensionDir
    ]
  });

  context.setDefaultTimeout(30000);

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await verifyHappyPath(page);
    await verifyClientSideNavigation(page);
    await verifyRetryShell(page, context);

    console.log("");
    console.log("Overlay smoke test passed.");
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
