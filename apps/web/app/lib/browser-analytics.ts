import type { AnalyticsEventName } from "@human-layer/core";

const browserAnalyticsDistinctIdKey = "human-layer/browser-analytics-id";

function getOrCreateBrowserDistinctId() {
  if (typeof window === "undefined") {
    return "server-render";
  }

  const existing = window.localStorage.getItem(browserAnalyticsDistinctIdKey);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(browserAnalyticsDistinctIdKey, created);
  return created;
}

export async function captureBrowserAnalyticsEvent(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        event,
        distinctId: getOrCreateBrowserDistinctId(),
        properties
      })
    });
  } catch {
    // Analytics should never block the primary product flow.
  }
}
