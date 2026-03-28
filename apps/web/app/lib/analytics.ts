import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName
} from "@human-layer/core";

export type AnalyticsPayload = {
  event: AnalyticsEventName;
  distinctId: string;
  properties?: Record<string, unknown>;
};

function getPostHogConfig() {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();

  if (!apiKey || !host) {
    return null;
  }

  return {
    apiKey,
    host: host.replace(/\/$/, "")
  };
}

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && ANALYTICS_EVENTS.includes(value as AnalyticsEventName);
}

function normalizeProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function captureAnalyticsEvent(payload: AnalyticsPayload) {
  const config = getPostHogConfig();
  if (!config) {
    return;
  }

  try {
    await fetch(config.host + "/capture/", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        api_key: config.apiKey,
        event: payload.event,
        distinct_id: payload.distinctId,
        properties: {
          ...normalizeProperties(payload.properties),
          distinct_id: payload.distinctId,
          $lib: "human-layer"
        }
      })
    });
  } catch (error) {
    console.warn(
      "Human Layer analytics capture failed",
      error instanceof Error ? error.message : String(error)
    );
  }
}
