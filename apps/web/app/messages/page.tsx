import Link from "next/link";
import { getManagedWalletSnapshot, getMessagingInboxForProfile } from "@human-layer/db";
import { redirect } from "next/navigation";

import { MessageRequestActions } from "../../components/message-request-actions";
import { ProfileHandleLink } from "../../components/profile-handle-link";
import { XmtpLiveChatShell } from "../../components/xmtp-live-chat-shell";
import { getAuthenticatedProfileFromCookies } from "../lib/auth";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

type MessageListProps = {
  items: MessageListItem[];
  emptyCopy: string;
  incoming?: boolean;
};

type MessageListItem = Awaited<ReturnType<typeof getMessagingInboxForProfile>>["incomingPending"][number] & {
  demo?: boolean;
  summary?: string | null;
};

type DemoConversationPreview = {
  id: string;
  peerHandle: string;
  createdAt: string;
  preview: string;
};

function buildDemoMessagingState(viewerHandle: string | null) {
  const normalizedViewerHandle = viewerHandle?.toLowerCase() ?? null;
  const demoHandles = [
    "maya_rivera",
    "kenji_ito",
    "clara_singh",
    "sofia_walker",
    "omar_brooks",
    "julian_ito"
  ].filter((handle) => handle !== normalizedViewerHandle);
  const now = Date.now();

  const conversations: DemoConversationPreview[] = [
    {
      id: "demo-conversation-1",
      peerHandle: demoHandles[0] ?? "maya_rivera",
      createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
      preview:
        "I just left a take on the repo. The product is strong, but the onboarding copy still hides the wallet magic a bit too much."
    },
    {
      id: "demo-conversation-2",
      peerHandle: demoHandles[1] ?? "kenji_ito",
      createdAt: new Date(now - 1000 * 60 * 42).toISOString(),
      preview:
        "The YouTube angle is compelling. Timestamped takes would make the extension feel instantly different from ordinary comments."
    },
    {
      id: "demo-conversation-3",
      peerHandle: demoHandles[2] ?? "clara_singh",
      createdAt: new Date(now - 1000 * 60 * 95).toISOString(),
      preview:
        "I bookmarked the Hugging Face page after your note. The human summary helped me decide faster than the model card alone."
    }
  ];

  const incomingPending: MessageListItem[] = [
    {
      id: "demo-incoming-1",
      status: "pending",
      createdAt: new Date(now - 1000 * 60 * 11).toISOString(),
      senderProfileId: "demo-profile-incoming-1",
      senderHandle: demoHandles[3] ?? "sofia_walker",
      recipientProfileId: "viewer-profile",
      recipientHandle: normalizedViewerHandle ?? "you",
      peerProfileId: "demo-profile-incoming-1",
      peerHandle: demoHandles[3] ?? "sofia_walker",
      peerInboxId: null,
      pageId: null,
      pageTitle: "Next.js repo discussion",
      pageCanonicalUrl: "https://github.com/vercel/next.js",
      pageHost: "github.com",
      demo: true,
      summary: "Wants to compare notes on the repo discussion and swap quick product feedback."
    },
    {
      id: "demo-incoming-2",
      status: "pending",
      createdAt: new Date(now - 1000 * 60 * 37).toISOString(),
      senderProfileId: "demo-profile-incoming-2",
      senderHandle: demoHandles[4] ?? "omar_brooks",
      recipientProfileId: "viewer-profile",
      recipientHandle: normalizedViewerHandle ?? "you",
      peerProfileId: "demo-profile-incoming-2",
      peerHandle: demoHandles[4] ?? "omar_brooks",
      peerInboxId: null,
      pageId: null,
      pageTitle: "Chrome Web Store listing",
      pageCanonicalUrl: "https://chromewebstore.google.com",
      pageHost: "chromewebstore.google.com",
      demo: true,
      summary: "Wants to talk about whether the extension pitch is clear enough for first-time users."
    }
  ];

  const outgoingPending: MessageListItem[] = [
    {
      id: "demo-outgoing-1",
      status: "pending",
      createdAt: new Date(now - 1000 * 60 * 63).toISOString(),
      senderProfileId: "viewer-profile",
      senderHandle: normalizedViewerHandle ?? "you",
      recipientProfileId: "demo-profile-outgoing-1",
      recipientHandle: demoHandles[5] ?? "julian_ito",
      peerProfileId: "demo-profile-outgoing-1",
      peerHandle: demoHandles[5] ?? "julian_ito",
      peerInboxId: null,
      pageId: null,
      pageTitle: "Spotify episode page",
      pageCanonicalUrl: "https://open.spotify.com",
      pageHost: "open.spotify.com",
      demo: true,
      summary: "You asked this person to open a secure chat about the media-layer experience."
    }
  ];

  return {
    conversations,
    incomingPending,
    outgoingPending
  };
}

function MessageList({ items, emptyCopy, incoming = false }: MessageListProps) {
  if (items.length === 0) {
    return <p className="muted">{emptyCopy}</p>;
  }

  return (
    <div className="stack compact">
      {items.map((item) => (
        <article className="comment-card interactive stack" key={item.id}>
          <div className="section-header">
            <div className="chip-row">
              <span className="trust-badge">{item.status}</span>
              <ProfileHandleLink handle={item.peerHandle} />
            </div>
            <span className="muted small-copy">{formatDateTime(item.createdAt)}</span>
          </div>
          <p className="muted">
            {item.summary ??
              (incoming
                ? "A verified human wants to open an XMTP chat with you."
                : "You asked to open an XMTP chat with this verified human.")}
          </p>
          {item.pageTitle && !item.demo ? (
            <div className="wallet-meta-card">
              <span className="muted small-copy">Context</span>
              <strong>{item.pageTitle}</strong>
              <span className="muted">{item.pageHost}</span>
              {item.pageId ? (
                <Link className="inline-link" href={`/pages/${item.pageId}`}>
                  Open Human Layer page
                </Link>
              ) : null}
            </div>
          ) : null}
          {item.peerInboxId ? (
            <div className="wallet-meta-card">
              <span className="muted small-copy">Peer inbox ID</span>
              <code>{item.peerInboxId}</code>
            </div>
          ) : null}
          {incoming && !item.demo ? <MessageRequestActions requestId={item.id} /> : null}
        </article>
      ))}
    </div>
  );
}

export default async function MessagesPage() {
  const viewer = await getAuthenticatedProfileFromCookies();
  if (!viewer) {
    redirect("/verify?returnUrl=/messages");
  }

  const [inbox, wallet] = await Promise.all([
    getMessagingInboxForProfile(viewer.id),
    getManagedWalletSnapshot(viewer.id)
  ]);
  const demoMessaging = buildDemoMessagingState(viewer.handle ?? null);
  const incomingItems: MessageListItem[] = [...demoMessaging.incomingPending, ...inbox.incomingPending];
  const outgoingItems: MessageListItem[] = [...demoMessaging.outgoingPending, ...inbox.outgoingPending];

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">XMTP</span>
              <span className="trust-badge">Verified-human messaging</span>
            </div>
            <h1>Messages</h1>
            <p className="muted">
              Send verified-human message requests, then open a live XMTP thread from the wallet-linked browser session. Human Layer stores request state and inbox bindings, not chat contents.
            </p>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Recent conversations</h2>
        </div>
        <div className="stack compact">
          {demoMessaging.conversations.map((conversation) => (
            <article className="comment-card interactive stack" key={conversation.id}>
              <div className="section-header">
                <div className="chip-row">
                  <ProfileHandleLink handle={conversation.peerHandle} />
                </div>
                <span className="muted small-copy">{formatDateTime(conversation.createdAt)}</span>
              </div>
              <p>{conversation.preview}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Secure chat</h2>
          <span className="muted">Messages will auto-connect from your linked wallet on this device and reopen on future visits unless browser storage is cleared.</span>
        </div>
        <XmtpLiveChatShell
          accepted={inbox.accepted}
          initialInboxId={inbox.binding?.inboxId ?? null}
          linkedWalletAddress={wallet?.walletAddress ?? null}
        />
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Incoming requests</h2>
          <span className="muted">Two demo requests are shown here as a preview, then any real verified-human requests appear below them.</span>
        </div>
        <MessageList emptyCopy="No incoming requests yet." incoming items={incomingItems} />
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Outgoing requests</h2>
          <span className="muted">One demo request is shown first, then your real verified-human requests.</span>
        </div>
        <MessageList emptyCopy="No outgoing requests yet." items={outgoingItems} />
      </section>

    </div>
  );
}
