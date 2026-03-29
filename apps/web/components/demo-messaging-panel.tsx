"use client";

import { useEffect, useMemo, useState } from "react";

type DemoConversationPreview = {
  id: string;
  peerHandle: string;
  createdAt: string;
  preview: string;
};

type DemoRequestPreview = {
  id: string;
  peerHandle: string;
  createdAt: string;
  summary?: string | null;
};

type DemoMessagingPanelProps = {
  availableHandles: string[];
  initialComposeHandle?: string | null;
  initialConversations: DemoConversationPreview[];
  initialIncomingRequests: DemoRequestPreview[];
  initialOutgoingRequests: DemoRequestPreview[];
  viewerHandle?: string | null;
};

type DemoMessage = {
  id: string;
  body: string;
  own: boolean;
  sentAt: string;
};

type DemoConversation = {
  id: string;
  peerHandle: string;
  messages: DemoMessage[];
  updatedAt: string;
  unread: boolean;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildConversationFromPreview(conversation: DemoConversationPreview): DemoConversation {
  return {
    id: conversation.id,
    peerHandle: conversation.peerHandle,
    updatedAt: conversation.createdAt,
    unread: true,
    messages: [
      {
        id: conversation.id + "-seed",
        body: conversation.preview,
        own: false,
        sentAt: conversation.createdAt
      }
    ]
  };
}

function buildConversationFromRequest(request: DemoRequestPreview, own: boolean): DemoConversation {
  return {
    id: request.id,
    peerHandle: request.peerHandle,
    updatedAt: request.createdAt,
    unread: !own,
    messages: [
      {
        id: request.id + "-seed",
        body:
          request.summary ??
          (own
            ? "I wanted to follow up in a quick private thread."
            : "Would love to compare notes in a secure chat."),
        own,
        sentAt: request.createdAt
      }
    ]
  };
}

function buildInitialConversations(props: DemoMessagingPanelProps): DemoConversation[] {
  const map = new Map<string, DemoConversation>();

  for (const conversation of props.initialConversations) {
    map.set(conversation.peerHandle, buildConversationFromPreview(conversation));
  }

  for (const request of props.initialIncomingRequests) {
    if (!map.has(request.peerHandle)) {
      map.set(request.peerHandle, buildConversationFromRequest(request, false));
    }
  }

  for (const request of props.initialOutgoingRequests) {
    if (!map.has(request.peerHandle)) {
      map.set(request.peerHandle, buildConversationFromRequest(request, true));
    }
  }

  return [...map.values()].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

function getStorageKey(viewerHandle: string | null | undefined) {
  return "human-layer/demo-messages/" + (viewerHandle ?? "viewer");
}

function ensureConversation(current: DemoConversation[], handle: string): DemoConversation[] {
  const normalizedHandle = handle.trim().toLowerCase();
  if (!normalizedHandle) return current;

  const existing = current.find((conversation) => conversation.peerHandle === normalizedHandle);
  if (existing) return current;

  return [
    {
      id: "demo-new-" + normalizedHandle,
      peerHandle: normalizedHandle,
      updatedAt: new Date().toISOString(),
      unread: false,
      messages: []
    },
    ...current
  ];
}

export function DemoMessagingPanel(props: DemoMessagingPanelProps) {
  const initialConversations = useMemo(() => buildInitialConversations(props), [props]);
  const [conversations, setConversations] = useState<DemoConversation[]>(initialConversations);
  const [activeHandle, setActiveHandle] = useState<string | null>(
    props.initialComposeHandle ?? initialConversations[0]?.peerHandle ?? null
  );
  const [composer, setComposer] = useState("");
  const [newHandle, setNewHandle] = useState(props.initialComposeHandle ?? "");

  useEffect(() => {
    const storedValue = window.localStorage.getItem(getStorageKey(props.viewerHandle));
    if (storedValue) {
      try {
        const parsed = JSON.parse(storedValue) as DemoConversation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveHandle((current) => current ?? parsed[0]?.peerHandle ?? null);
          return;
        }
      } catch {
        // Ignore invalid state and fall back to the seeded demo threads.
      }
    }

    if (props.initialComposeHandle) {
      setConversations((current) => ensureConversation(current, props.initialComposeHandle as string));
      setActiveHandle(props.initialComposeHandle);
    }
  }, [props.initialComposeHandle, props.viewerHandle]);

  useEffect(() => {
    window.localStorage.setItem(getStorageKey(props.viewerHandle), JSON.stringify(conversations));
  }, [conversations, props.viewerHandle]);

  useEffect(() => {
    if (!activeHandle && conversations[0]?.peerHandle) {
      setActiveHandle(conversations[0].peerHandle);
    }
  }, [activeHandle, conversations]);

  const activeConversation =
    conversations.find((conversation) => conversation.peerHandle === activeHandle) ?? null;

  function openConversation(handle: string) {
    const normalizedHandle = handle.trim().toLowerCase();
    if (!normalizedHandle) return;

    setConversations((current) =>
      ensureConversation(current, normalizedHandle).map((conversation) =>
        conversation.peerHandle === normalizedHandle
          ? { ...conversation, unread: false }
          : conversation
      )
    );
    setActiveHandle(normalizedHandle);
    setNewHandle("");
  }

  function handleStartConversation() {
    if (!newHandle.trim()) return;
    openConversation(newHandle);
  }

  function handleSend() {
    const body = composer.trim();
    if (!activeConversation || !body) return;

    const sentAt = new Date().toISOString();
    setConversations((current) =>
      current
        .map((conversation) =>
          conversation.peerHandle === activeConversation.peerHandle
            ? {
                ...conversation,
                updatedAt: sentAt,
                unread: false,
                messages: [
                  ...conversation.messages,
                  {
                    id: conversation.id + "-own-" + sentAt,
                    body,
                    own: true,
                    sentAt
                  }
                ]
              }
            : conversation
        )
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    );
    setComposer("");
  }

  return (
    <div className="stack">
      <div className="section-header">
        <h2>Recent conversations</h2>
        <span className="muted small-copy">{conversations.length}</span>
      </div>

      <div className="chat-layout">
        <div className="chat-sidebar stack compact">
          <div className="stack compact">
            <span className="eyebrow">New message</span>
            <div className="wallet-command-bar compact">
              <span className="wallet-command-prompt">to</span>
              <input
                className="wallet-command-input"
                list="demo-message-handles"
                onChange={(event) => setNewHandle(event.target.value)}
                placeholder="maya_rivera"
                value={newHandle}
              />
              <button className="button secondary subtle" onClick={handleStartConversation} type="button">
                Open
              </button>
            </div>
            <datalist id="demo-message-handles">
              {props.availableHandles.map((handle) => (
                <option key={handle} value={handle} />
              ))}
            </datalist>
            <div className="chip-row">
              {props.availableHandles.slice(0, 6).map((handle) => (
                <button className="chip" key={handle} onClick={() => openConversation(handle)} type="button">
                  {"@" + handle}
                </button>
              ))}
            </div>
          </div>

          {conversations.map((conversation) => {
            const preview = conversation.messages[conversation.messages.length - 1]?.body ?? "Start the chat.";
            return (
              <button
                className={
                  "chat-connection-button" +
                  (activeConversation?.peerHandle === conversation.peerHandle ? " active" : "")
                }
                key={conversation.id}
                onClick={() => openConversation(conversation.peerHandle)}
                type="button"
              >
                <div className="chip-row">
                  <strong>{"@" + conversation.peerHandle}</strong>
                  {conversation.unread ? <span className="trust-badge">Unread</span> : null}
                </div>
                <span className="muted small-copy">{formatDateTime(conversation.updatedAt)}</span>
                <span className="muted small-copy">{preview}</span>
              </button>
            );
          })}
        </div>

        <div className="chat-thread stack">
          <div className="section-header tight">
            <div className="stack compact">
              <h2>
                {activeConversation ? "Chat with @" + activeConversation.peerHandle : "Open a conversation"}
              </h2>
              <span className="muted small-copy">
                {activeConversation
                  ? "This demo thread lets you reply and start new conversations during the hackathon build."
                  : "Pick a profile on the left or start a new demo conversation."}
              </span>
            </div>
          </div>

          {!activeConversation ? (
            <div className="chat-empty-state">
              <p className="muted">Choose someone to start chatting.</p>
            </div>
          ) : (
            <>
              <div className="chat-message-list">
                {activeConversation.messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <p className="muted">No replies yet. Send the first message below.</p>
                  </div>
                ) : (
                  activeConversation.messages.map((message) => (
                    <article className={"chat-message-card" + (message.own ? " own" : "")} key={message.id}>
                      <strong>{message.own ? "You" : "@" + activeConversation.peerHandle}</strong>
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
                  placeholder={"Reply to @" + activeConversation.peerHandle}
                  rows={4}
                  value={composer}
                />
                <div className="action-row">
                  <button
                    className="button"
                    disabled={composer.trim().length === 0}
                    onClick={handleSend}
                    type="button"
                  >
                    Send reply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="stack">
        <div className="section-header">
          <h2>Incoming requests</h2>
        </div>
        <div className="stack compact">
          {props.initialIncomingRequests.map((request) => (
            <article className="comment-card interactive stack" key={request.id}>
              <div className="section-header">
                <div className="chip-row">
                  <span className="trust-badge">pending</span>
                  <strong>{"@" + request.peerHandle}</strong>
                </div>
                <span className="muted small-copy">{formatDateTime(request.createdAt)}</span>
              </div>
              <p>{request.summary ?? "A verified human wants to open a secure chat with you."}</p>
              <div className="action-row">
                <button
                  className="button secondary subtle"
                  onClick={() => openConversation(request.peerHandle)}
                  type="button"
                >
                  Reply
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="stack">
        <div className="section-header">
          <h2>Outgoing requests</h2>
        </div>
        <div className="stack compact">
          {props.initialOutgoingRequests.map((request) => (
            <article className="comment-card interactive stack" key={request.id}>
              <div className="section-header">
                <div className="chip-row">
                  <span className="trust-badge">pending</span>
                  <strong>{"@" + request.peerHandle}</strong>
                </div>
                <span className="muted small-copy">{formatDateTime(request.createdAt)}</span>
              </div>
              <p>{request.summary ?? "You opened a secure chat request with this verified human."}</p>
              <div className="action-row">
                <button
                  className="button secondary subtle"
                  onClick={() => openConversation(request.peerHandle)}
                  type="button"
                >
                  Open chat
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
