import Link from "next/link";
import { type InterestTag, INTEREST_TAGS, getInterestTagLabel } from "@human-layer/core";
import {
  getFollowedTopicsForProfile,
  getRecentTakesForTopic,
  getTopicFeedFromFollowedProfiles,
  getTopicSurface
} from "@human-layer/db";
import { notFound } from "next/navigation";

import { FollowTopicButton } from "../../../components/follow-topic-button";
import { FollowProfileButton } from "../../../components/follow-profile-button";
import { HelpfulButton } from "../../../components/helpful-button";
import { ProfileSafetyActions } from "../../../components/profile-safety-actions";
import { getAuthenticatedProfileFromCookies } from "../../lib/auth";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function getReputationBadgeClass(level: string | undefined) {
  if (!level) return "reputation-badge";
  return `reputation-badge reputation-badge--${level}`;
}

function parseTopic(value: string): InterestTag | null {
  return INTEREST_TAGS.includes(value as InterestTag) ? (value as InterestTag) : null;
}

export default async function TopicPage(props: {
  params: Promise<{ topic: string }>;
}) {
  const params = await props.params;
  const topic = parseTopic(params.topic);

  if (!topic) {
    notFound();
  }

  const viewer = await getAuthenticatedProfileFromCookies();
  const [surface, recentTakes, followedTopics, trustedTopicFeed] = await Promise.all([
    getTopicSurface(topic, 6, viewer?.id),
    getRecentTakesForTopic(topic, 6),
    viewer ? getFollowedTopicsForProfile(viewer.id) : Promise.resolve([]),
    viewer ? getTopicFeedFromFollowedProfiles(viewer.id, topic, 6) : Promise.resolve([])
  ]);
  const isFollowingTopic = followedTopics.includes(topic);

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Topic surface</span>
              <Link className="inline-link" href="/topics">
                Back to all topics
              </Link>
            </div>
            <div className="stack compact">
              <h1>{surface.label}</h1>
              <p className="muted">{surface.description}</p>
              <p className="muted small-copy">{surface.whyNow}</p>
              {surface.viewerReason ? <p className="muted small-copy">{surface.viewerReason}</p> : null}
            </div>
          </div>
          <div className="action-row">
            {viewer ? (
              <FollowTopicButton initialFollowing={isFollowingTopic} topic={topic} />
            ) : (
              <Link className="button" href={`/verify?returnUrl=/topics/${topic}`}>
                Verify to follow topic
              </Link>
            )}
          </div>
        </div>
        <div className="topic-stat-grid">
          <div className="stat-card">
            <strong>{surface.trendingPages.length}</strong>
            <span className="muted">Trending pages</span>
          </div>
          <div className="stat-card">
            <strong>{recentTakes.length}</strong>
            <span className="muted">Recent takes</span>
          </div>
          <div className="stat-card">
            <strong>{surface.topContributors.length}</strong>
            <span className="muted">Top contributors</span>
          </div>
        </div>
        <div className="stack compact">
          <span className="eyebrow">Related interests</span>
          <div className="chip-row">
            {surface.relatedTopics.map((relatedTag) => (
              <Link className="chip" href={`/topics/${relatedTag}`} key={relatedTag}>
                {getInterestTagLabel(relatedTag)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="card stack home-section">
        <div className="section-header">
          <h2>This week in {surface.label}</h2>
          <span className="muted">The freshest verified takes currently clustering into this topic.</span>
        </div>
        {recentTakes.length === 0 ? (
          <p className="muted">No fresh takes have landed in this topic yet.</p>
        ) : (
          <div className="discovery-grid">
            {recentTakes.map((take) => (
              <article className="discovery-card" key={take.commentId}>
                <div className="chip-row">
                  <span className="trust-badge">This week</span>
                  {take.reputation ? (
                    <span className={getReputationBadgeClass(take.reputation.level)}>
                      {take.reputation.label}
                    </span>
                  ) : null}
                  <Link className="inline-link" href={`/profiles/${take.profileHandle}`}>
                    @{take.profileHandle}
                  </Link>
                </div>
                <strong>{take.pageTitle}</strong>
                <p>{take.body}</p>
                <p className="muted small-copy">{take.reason}</p>
                <p className="muted">
                  Helpful {take.helpfulCount} • {formatDate(take.createdAt)} • {formatPageKind(take.pageKind)}
                </p>
                <HelpfulButton commentId={take.commentId} initialCount={take.helpfulCount} />
                <ProfileSafetyActions
                  profileHandle={take.profileHandle}
                  profileId={take.profileId}
                  viewerProfileId={viewer?.id}
                />
                <div className="link-row">
                  <Link className="inline-link" href={`/pages/${take.pageId}`}>
                    Open Human Layer page
                  </Link>
                  <Link className="inline-link" href={take.canonicalUrl} rel="noreferrer" target="_blank">
                    Open source page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {viewer ? (
        <section className="card stack home-section">
          <div className="section-header">
            <h2>From people you trust in {surface.label}</h2>
            <span className="muted">New takes in this topic from the people you already chose to follow.</span>
          </div>
          {trustedTopicFeed.length === 0 ? (
            <p className="muted">No one you follow has posted in this topic yet. Following the topic now will still keep the topic graph active.</p>
          ) : (
            <div className="discovery-grid">
              {trustedTopicFeed.map((item) => (
                <article className="discovery-card" key={item.commentId}>
                  <div className="chip-row">
                    <span className="trust-badge">People you trust</span>
                    {item.authorReputation ? (
                      <span className={getReputationBadgeClass(item.authorReputation.level)}>
                        {item.authorReputation.label}
                      </span>
                    ) : null}
                    <Link className="inline-link" href={`/profiles/${item.authorHandle}`}>
                      @{item.authorHandle}
                    </Link>
                  </div>
                  <strong>{item.pageTitle}</strong>
                  <p className="muted">{item.reason}</p>
                  <p>{item.body}</p>
                  <p className="muted">
                    Helpful {item.helpfulCount} • {formatDate(item.createdAt)} • {formatPageKind(item.pageKind)}
                  </p>
                  <HelpfulButton commentId={item.commentId} initialCount={item.helpfulCount} />
                  <ProfileSafetyActions
                    profileHandle={item.authorHandle}
                    profileId={item.authorProfileId}
                    viewerProfileId={viewer?.id}
                  />
                  <div className="link-row">
                    <Link className="inline-link" href={`/pages/${item.pageId}`}>
                      Open Human Layer page
                    </Link>
                    <Link className="inline-link" href={item.pageCanonicalUrl} rel="noreferrer" target="_blank">
                      Open source page
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="card stack home-section">
        <div className="section-header">
          <h2>Trending pages in {surface.label}</h2>
          <span className="muted">Pages where this topic already has live verified-human signal.</span>
        </div>
        {surface.trendingPages.length === 0 ? (
          <p className="muted">No pages have clustered into this topic yet. The first useful take here will matter a lot.</p>
        ) : (
          <div className="discovery-grid">
            {surface.trendingPages.map((page) => (
              <article className="discovery-card" key={page.id}>
                <div className="chip-row">
                  <span className="trust-badge">Topic page</span>
                  {page.tags.map((tag) => (
                    <Link className="chip" href={`/topics/${tag}`} key={tag}>
                      {getInterestTagLabel(tag)}
                    </Link>
                  ))}
                </div>
                <strong>{page.title}</strong>
                <p className="muted">{page.summary}</p>
                <p className="muted small-copy">{page.reason}</p>
                <p className="muted">
                  {page.commentCount} takes • {page.verdictCount} verdicts • {page.bookmarkCount} bookmarks • {formatPageKind(page.pageKind)}
                </p>
                <div className="link-row">
                  <Link className="inline-link" href={`/pages/${page.id}`}>
                    Open Human Layer page
                  </Link>
                  <Link className="inline-link" href={page.canonicalUrl} rel="noreferrer" target="_blank">
                    Open source page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card stack home-section">
        <div className="section-header">
          <h2>Top takes in {surface.label}</h2>
          <span className="muted">Verified takes that are currently shaping this interest cluster.</span>
        </div>
        {surface.topTakes.length === 0 ? (
          <p className="muted">No verified takes have broken out in this topic yet.</p>
        ) : (
          <div className="discovery-grid">
            {surface.topTakes.map((take) => (
              <article className="discovery-card" key={take.commentId}>
                <div className="chip-row">
                  <span className="trust-badge">Verified take</span>
                  {take.reputation ? (
                    <span className={getReputationBadgeClass(take.reputation.level)}>
                      {take.reputation.label}
                    </span>
                  ) : null}
                  <Link className="inline-link" href={`/profiles/${take.profileHandle}`}>
                    @{take.profileHandle}
                  </Link>
                </div>
                <strong>{take.pageTitle}</strong>
                <p>{take.body}</p>
                <p className="muted small-copy">{take.reason}</p>
                <p className="muted">
                  Helpful {take.helpfulCount} • {formatDate(take.createdAt)} • {formatPageKind(take.pageKind)}
                </p>
                <HelpfulButton commentId={take.commentId} initialCount={take.helpfulCount} />
                <ProfileSafetyActions
                  profileHandle={take.profileHandle}
                  profileId={take.profileId}
                  viewerProfileId={viewer?.id}
                />
                <div className="link-row">
                  <Link className="inline-link" href={`/pages/${take.pageId}`}>
                    Open Human Layer page
                  </Link>
                  <Link className="inline-link" href={take.canonicalUrl} rel="noreferrer" target="_blank">
                    Open source page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card stack home-section">
        <div className="section-header">
          <h2>Top contributors in {surface.label}</h2>
          <span className="muted">Verified humans with repeated signal in this cluster.</span>
        </div>
        {surface.topContributors.length === 0 ? (
          <p className="muted">No contributor pattern has formed for this topic yet.</p>
        ) : (
          <div className="discovery-grid">
            {surface.topContributors.map((profile) => (
              <article className="discovery-card" key={profile.id}>
                <div className="chip-row">
                  <span className="trust-badge">{profile.verifiedHuman ? "Verified human" : "Profile"}</span>
                  <span className={getReputationBadgeClass(profile.reputation.level)}>
                    {profile.reputation.label}
                  </span>
                  {profile.interestTags.slice(0, 3).map((tag) => (
                    <Link className="chip" href={`/topics/${tag}`} key={tag}>
                      {getInterestTagLabel(tag)}
                    </Link>
                  ))}
                </div>
                <strong>@{profile.handle}</strong>
                <p className="muted">{profile.reason}</p>
                <div className="action-row">
                  <Link className="button secondary subtle" href={`/profiles/${profile.handle}`}>
                    Open profile
                  </Link>
                  {viewer ? <FollowProfileButton profileId={profile.id} /> : null}
                </div>
                <ProfileSafetyActions
                  profileHandle={profile.handle}
                  profileId={profile.id}
                  viewerProfileId={viewer?.id}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
