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
  items: Awaited<ReturnType<typeof getMessagingInboxForProfile>>["incomingPending"];
  emptyCopy: string;
  incoming?: boolean;
};

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
            {incoming
              ? "A verified human wants to open an XMTP chat with you."
              : "You asked to open an XMTP chat with this verified human."}
          </p>
          {item.pageTitle ? (
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
          {incoming ? <MessageRequestActions requestId={item.id} /> : null}
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
          <h2>XMTP session</h2>
          <span className="muted">Start from your linked wallet. Human Layer will save the resulting inbox ID automatically.</span>
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
          <span className="muted">Only verified humans with linked XMTP inboxes can request access.</span>
        </div>
        <MessageList
          emptyCopy="No incoming requests yet."
          incoming
          items={inbox.incomingPending}
        />
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Outgoing requests</h2>
          <span className="muted">Requests you have already sent to other verified humans.</span>
        </div>
        <MessageList emptyCopy="No outgoing requests yet." items={inbox.outgoingPending} />
      </section>

    </div>
  );
}
