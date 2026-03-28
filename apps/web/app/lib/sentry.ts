type SentryConfig = {
  dsn: string;
  envelopeUrl: string;
};

function getSentryConfig(): SentryConfig | null {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    return null;
  }

  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\//, "");
    if (!projectId) {
      return null;
    }

    return {
      dsn,
      envelopeUrl: parsed.protocol + "//" + parsed.host + "/api/" + projectId + "/envelope/"
    };
  } catch {
    return null;
  }
}

function normalizeExtra(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function captureSentryOperationalEvent(args: {
  event: string;
  level?: "error" | "warning" | "info";
  extra?: Record<string, unknown>;
}) {
  const config = getSentryConfig();
  if (!config) {
    return;
  }

  try {
    const sentAt = new Date().toISOString();
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const payload = {
      event_id: eventId,
      timestamp: sentAt,
      level: args.level ?? "error",
      platform: "javascript",
      message: {
        formatted: args.event
      },
      tags: {
        human_layer_event: args.event,
        service: "human-layer-web"
      },
      extra: normalizeExtra(args.extra),
      environment: process.env.NODE_ENV ?? "development"
    };

    const envelope = [
      JSON.stringify({
        dsn: config.dsn,
        sent_at: sentAt
      }),
      JSON.stringify({ type: "event" }),
      JSON.stringify(payload)
    ].join("\n");

    await fetch(config.envelopeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-sentry-envelope"
      },
      body: envelope
    });
  } catch (error) {
    console.warn(
      "Human Layer Sentry capture failed",
      error instanceof Error ? error.message : String(error)
    );
  }
}
