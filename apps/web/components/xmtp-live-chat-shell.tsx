"use client";

import type { MessagingInboxSnapshot } from "@human-layer/db";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useChainId, useConnect, useWalletClient } from "wagmi";

import { getWalletConnectErrorMessage } from "../app/lib/wallet-connect-errors";

type AcceptedConnection = MessagingInboxSnapshot["accepted"][number];

type LiveMessage = {
  id: string;
  body: string;
  sentAt: string;
  own: boolean;
};

type XmtpClientLike = {
  inboxId?: string;
  close(): void;
  conversations: {
    getDmByInboxId(inboxId: string): Promise<XmtpConversationLike | undefined>;
    createDm(inboxId: string): Promise<XmtpConversationLike>;
  };
};

type XmtpConversationLike = {
  sync(): Promise<unknown>;
  messages(): Promise<Array<Record<string, unknown>>>;
  stream(): Promise<AsyncIterable<Record<string, unknown>> & { return?(): Promise<unknown> }>;
  sendText(text: string, isOptimistic?: boolean): Promise<string>;
};

type XmtpBrowserSdkModule = {
  Client: {
    create(
      signer: unknown,
      options?: Record<string, unknown>
    ): Promise<XmtpClientLike>;
  };
  createSCWSigner(
    address: `0x${string}`,
    signMessage: (message: string) => Promise<string> | string,
    chainId: bigint
  ): unknown;
};

type XmtpLiveChatShellProps = {
  accepted: AcceptedConnection[];
  initialInboxId?: string | null;
  linkedWalletAddress?: string | null;
};

function formatAddress(value: string) {
  return value.slice(0, 6) + "..." + value.slice(-4);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function toMessageBody(message: Record<string, unknown>) {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }

  if (typeof message.fallback === "string" && message.fallback.trim()) {
    return message.fallback;
  }

  try {
    return JSON.stringify(message.content);
  } catch {
    return "[Unsupported XMTP message]";
  }
}

function mapMessages(items: Array<Record<string, unknown>>, ownInboxId: string | null): LiveMessage[] {
  return items
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : Math.random().toString(36).slice(2);
      const sentAt =
        item.sentAt instanceof Date
          ? item.sentAt.toISOString()
          : typeof item.sentAt === "string"
            ? item.sentAt
            : new Date().toISOString();
      const senderInboxId = typeof item.senderInboxId === "string" ? item.senderInboxId : null;

      return {
        id,
        body: toMessageBody(item),
        sentAt,
        own: Boolean(ownInboxId && senderInboxId && ownInboxId === senderInboxId)
      };
    })
    .sort((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime());
}

export function XmtpLiveChatShell({
  accepted,
  initialInboxId,
  linkedWalletAddress
}: XmtpLiveChatShellProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending } = useConnect();
  const { data: walletClient } = useWalletClient();
  const clientRef = useRef<XmtpClientLike | null>(null);
  const conversationRef = useRef<XmtpConversationLike | null>(null);
  const streamRef = useRef<{ return?(): Promise<unknown> } | null>(null);
  const autoStartAttemptedRef = useRef(false);
  const sessionRequestedRef = useRef(false);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "connecting" | "initializing" | "ready">("idle");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [linkedInboxId, setLinkedInboxId] = useState(initialInboxId ?? null);
  const [activePeerInboxId, setActivePeerInboxId] = useState<string | null>(accepted[0]?.peerInboxId ?? null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);

  const connectedAddress = address?.toLowerCase() ?? null;
  const expectedAddress = linkedWalletAddress?.toLowerCase() ?? null;
  const coinbaseConnector = connectors[0] ?? null;
  const activeConnection = useMemo(
    () => accepted.find((item) => item.peerInboxId === activePeerInboxId) ?? null,
    [accepted, activePeerInboxId]
  );

  useEffect(() => {
    return () => {
      void streamRef.current?.return?.();
      clientRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!linkedWalletAddress || autoStartAttemptedRef.current) {
      return;
    }

    autoStartAttemptedRef.current = true;
    sessionRequestedRef.current = true;
    void initializeSession();
  }, [linkedWalletAddress]);

  useEffect(() => {
    if (!sessionRequestedRef.current) {
      return;
    }

    if (sessionStatus === "ready" || sessionStatus === "initializing") {
      return;
    }

    if (!connectedAddress || !walletClient) {
      return;
    }

    void initializeSession();
  }, [connectedAddress, sessionStatus, walletClient]);

  async function ensureConnectedAddress(): Promise<`0x${string}` | null> {
    if (connectedAddress) {
      return connectedAddress as `0x${string}`;
    }

    if (!coinbaseConnector) {
      setSessionError("Coinbase Smart Wallet is not available in this browser.");
      return null;
    }

    setSessionStatus("connecting");
    setSessionError(null);

    try {
      const result = await connectAsync({ connector: coinbaseConnector });
      const nextAddress = result.accounts[0]?.toLowerCase();
      if (!nextAddress) {
        setSessionStatus("idle");
        setSessionError("Wallet connected, but no address was returned.");
        return null;
      }

      setSessionStatus("idle");
      return nextAddress as `0x${string}`;
    } catch (error) {
      setSessionStatus("idle");
      setSessionError(getWalletConnectErrorMessage(error));
      return null;
    }
  }

  async function bindInbox(inboxId: string) {
    const response = await fetch("/api/messages/bind", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        inboxId
      })
    }).catch(() => null);

    if (!response) {
      throw new Error("Could not reach the XMTP binding route.");
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Could not link your XMTP inbox.");
    }
  }

  async function initializeSession() {
    if (sessionStatus === "initializing" || sessionStatus === "ready") {
      return;
    }

    sessionRequestedRef.current = true;

    const nextAddress = await ensureConnectedAddress();
    if (!nextAddress) {
      return;
    }

    if (expectedAddress && expectedAddress !== nextAddress) {
      setSessionError(
        "This wallet does not match the address linked to your Human Layer account. Connect " +
          formatAddress(expectedAddress) +
          " instead."
      );
      return;
    }

    if (!walletClient) {
      setSessionStatus("connecting");
      setSessionError(null);
      return;
    }

    setSessionStatus("initializing");
    setSessionError(null);

    try {
      const xmtp = (await import("@xmtp/browser-sdk")) as unknown as XmtpBrowserSdkModule;
      const signer = xmtp.createSCWSigner(
        nextAddress,
        (message) =>
          walletClient.signMessage({
            account: walletClient.account?.address ?? nextAddress,
            message
          }),
        BigInt(chainId || 8453)
      );

      const client = await xmtp.Client.create(signer, {
        env: "production",
        dbPath: `human-layer-xmtp-${nextAddress.toLowerCase()}.db3`
      });

      clientRef.current?.close();
      clientRef.current = client;
      setSessionStatus("ready");
      setSessionError(null);

      if (client.inboxId && client.inboxId !== linkedInboxId) {
        await bindInbox(client.inboxId);
        setLinkedInboxId(client.inboxId);
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `human-layer-secure-chat:${nextAddress.toLowerCase()}`,
          "ready"
        );
      }

      if (activePeerInboxId) {
        await openConversation(activePeerInboxId);
      }
    } catch (error) {
      setSessionStatus("idle");
      setSessionError(error instanceof Error ? error.message : "Could not start XMTP.");
    }
  }

  async function openConversation(peerInboxId: string) {
    const client = clientRef.current;
    if (!client) {
      setChatError("Start your XMTP session first.");
      return;
    }

    setActivePeerInboxId(peerInboxId);
    setChatLoading(true);
    setChatError(null);

    try {
      await streamRef.current?.return?.();
      streamRef.current = null;

      const conversation =
        (await client.conversations.getDmByInboxId(peerInboxId)) ??
        (await client.conversations.createDm(peerInboxId));

      conversationRef.current = conversation;
      await conversation.sync();
      const conversationMessages = await conversation.messages();
      setMessages(mapMessages(conversationMessages, client.inboxId ?? null));

      const stream = await conversation.stream();
      streamRef.current = stream;

      (async () => {
        for await (const nextMessage of stream) {
          setMessages((current) => {
            const combined = mapMessages(
              [...current.map((item) => ({
                id: item.id,
                content: item.body,
                senderInboxId: item.own ? client.inboxId ?? "" : peerInboxId,
                sentAt: item.sentAt
              })), nextMessage],
              client.inboxId ?? null
            );
            return combined;
          });
        }
      })().catch(() => {
        // Stream restarts can fail if the tab sleeps. The user can still reload the thread manually.
      });
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Could not open the conversation.");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleSend() {
    const conversation = conversationRef.current;
    const body = composer.trim();
    if (!conversation || !body || sending) {
      return;
    }

    setSending(true);
    setChatError(null);

    try {
      await conversation.sendText(body);
      setComposer("");
      const refreshedMessages = await conversation.messages();
      setMessages(mapMessages(refreshedMessages, clientRef.current?.inboxId ?? null));
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-shell">
      <div className="chip-row">
        <span className="trust-badge">
          {linkedInboxId ? "Inbox linked" : "Inbox not linked yet"}
        </span>
        <span className={sessionStatus === "ready" ? "pill" : "trust-badge soft"}>
          {sessionStatus === "ready" ? "Secure chat ready" : "Secure chat offline"}
        </span>
        {linkedWalletAddress ? <span className="trust-badge soft">{formatAddress(linkedWalletAddress)}</span> : null}
      </div>

      {linkedInboxId ? (
        <div className="wallet-meta-card">
          <span className="muted small-copy">Linked secure chat inbox</span>
          <code>{linkedInboxId}</code>
        </div>
      ) : (
        <p className="muted">
          Human Layer will auto-connect secure chat from your linked wallet on this device and
          save the resulting inbox ID automatically.
        </p>
      )}

      {sessionStatus !== "ready" ? (
        <div className="action-row">
          <button
            className="button"
            disabled={isPending || sessionStatus === "initializing"}
            onClick={() => void initializeSession()}
            type="button"
          >
            {sessionStatus === "connecting"
              ? "Connecting secure chat..."
              : sessionStatus === "initializing"
                ? "Starting secure chat..."
                : "Connect secure chat"}
          </button>
          {!linkedWalletAddress ? (
            <Link className="button secondary subtle" href="/wallet">
              Open wallet
            </Link>
          ) : null}
        </div>
      ) : null}

      {sessionError ? <span className="error-message">{sessionError}</span> : null}

      <div className="chat-layout">
        <div className="chat-sidebar stack compact">
          <div className="section-header tight">
            <h2>Accepted connections</h2>
            <span className="muted small-copy">{accepted.length}</span>
          </div>
          {accepted.length === 0 ? (
            <div className="chat-empty-state">
              <p className="muted">No accepted connections yet.</p>
            </div>
          ) : (
            accepted.map((item) => (
              <button
                className={
                  "chat-connection-button" +
                  (activePeerInboxId === item.peerInboxId ? " active" : "")
                }
                disabled={!item.peerInboxId}
                key={item.id}
                onClick={() => item.peerInboxId ? void openConversation(item.peerInboxId) : undefined}
                type="button"
              >
                <strong>@{item.peerHandle}</strong>
                <span className="muted small-copy">{formatDateTime(item.createdAt)}</span>
                {item.pageTitle ? <span className="muted small-copy">{item.pageTitle}</span> : null}
              </button>
            ))
          )}
        </div>

        <div className="chat-thread stack">
          <div className="section-header tight">
            <div className="stack compact">
              <h2>{activeConnection ? `Chat with @${activeConnection.peerHandle}` : "Live chat"}</h2>
              <span className="muted small-copy">
                {activeConnection
                  ? "Messages are exchanged through XMTP and stay off the Human Layer database."
                  : "Pick an accepted connection to open a live XMTP thread."}
              </span>
            </div>
          </div>

          {!activeConnection ? (
            <div className="chat-empty-state">
              <p className="muted">Select a connection from the left to start chatting.</p>
            </div>
          ) : sessionStatus !== "ready" ? (
            <div className="chat-empty-state">
              <p className="muted">
                Secure chat is connecting now. If a wallet prompt appears, approve it once and
                this browser will keep restoring chat until local storage is cleared.
              </p>
            </div>
          ) : (
            <>
              {chatLoading ? <p className="muted">Loading conversation…</p> : null}
              {chatError ? <span className="error-message">{chatError}</span> : null}
              <div className="chat-message-list">
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <p className="muted">No live messages yet. Send the first one below.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <article
                      className={"chat-message-card" + (message.own ? " own" : "")}
                      key={message.id}
                    >
                      <strong>{message.own ? "You" : `@${activeConnection.peerHandle}`}</strong>
                      <p>{message.body}</p>
                      <span className="muted small-copy">{formatDateTime(message.sentAt)}</span>
                    </article>
                  ))
                )}
              </div>
              <div className="chat-composer">
                <textarea
                  className="textarea"
                  onChange={(event) => setComposer(event.target.value)}
                  placeholder={`Send a message to @${activeConnection.peerHandle}`}
                  rows={4}
                  value={composer}
                />
                <div className="action-row">
                  <button
                    className="button"
                    disabled={sending || composer.trim().length === 0}
                    onClick={() => void handleSend()}
                    type="button"
                  >
                    {sending ? "Sending..." : "Send via XMTP"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
