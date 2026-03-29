"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { getInterestTagLabel, type InterestTag } from "@human-layer/core";

import { NotificationPreferencesForm } from "./notification-preferences-form";

type NotificationsSettingsPanelProps = {
  followedTopics: string[];
  initialBookmarkedPageComments: boolean;
  initialFollowedProfileTakes: boolean;
  initialFollowedTopicTakes: boolean;
};

export function NotificationsSettingsPanel({
  followedTopics,
  initialBookmarkedPageComments,
  initialFollowedProfileTakes,
  initialFollowedTopicTakes
}: NotificationsSettingsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="stack compact" style={{ alignItems: "flex-end" }}>
      <button
        aria-label={open ? "Hide notification settings" : "Show notification settings"}
        className="icon-button"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Settings2 aria-hidden="true" size={16} strokeWidth={2} />
      </button>
      {open ? (
        <div className="settings-panel stack">
          <div className="section-header tight">
            <h2>Notification controls</h2>
            <span className="muted small-copy">Tune what reaches you.</span>
          </div>
          <NotificationPreferencesForm
            initialBookmarkedPageComments={initialBookmarkedPageComments}
            initialFollowedProfileTakes={initialFollowedProfileTakes}
            initialFollowedTopicTakes={initialFollowedTopicTakes}
          />
          {followedTopics.length > 0 ? (
            <div className="stack compact">
              <span className="eyebrow">Following topics</span>
              <div className="chip-row">
                {followedTopics.map((topic) => (
                  <Link className="chip" href={`/topics/${topic}`} key={topic}>
                    {getInterestTagLabel(topic as InterestTag)}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted small-copy">
              You are not following any topics yet. Follow a topic to widen your signal layer.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
