import type { AnalyticsEventName } from "@human-layer/core";

import { sendApiProxyRequest } from "./api";

const extensionAnalyticsDistinctIdKey = "human-layer-extension-analytics-id";

async function getOrCreateExtensionDistinctId() {
  const existing = await chrome.storage.local.get(extensionAnalyticsDistinctIdKey);
  const currentValue = existing[extensionAnalyticsDistinctIdKey];
  if (typeof currentValue === "string" && currentValue.length > 0) {
    return currentValue;
  }

  const created = crypto.randomUUID();
  await chrome.storage.local.set({
    [extensionAnalyticsDistinctIdKey]: created
  });
  return created;
}

export async function captureExtensionAnalyticsEvent(args: {
  appUrl: string;
  event: AnalyticsEventName;
  properties?: Record<string, unknown>;
}) {
  try {
    const distinctId = await getOrCreateExtensionDistinctId();
    await sendApiProxyRequest({
      appUrl: args.appUrl,
      path: "/api/analytics",
      method: "POST",
      body: {
        event: args.event,
        distinctId,
        properties: args.properties
      }
    });
  } catch {
    // Analytics must not block the overlay.
  }
}
