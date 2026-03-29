import Link from "next/link";
import { FEATURED_TOPIC_TAGS, getInterestTagLabel } from "@human-layer/core";
import {
  getContributorsActiveInViewerInterests,
  getFollowedProfileActivity,
  getFollowedTopicsForProfile,
  getPagesBookmarkedByFollowedProfiles,
  getPeopleSimilarToFollowing,
  getPeopleToFollow,
  getRecommendedTakes,
  getTopicSurface,
  getTrendingPages,
  searchDiscovery
} from "@human-layer/db";

import { FollowProfileButton } from "../components/follow-profile-button";
import { HelpfulButton } from "../components/helpful-button";
import { ProfileSafetyActions } from "../components/profile-safety-actions";
import { getAuthenticatedProfileFromCookies } from "./lib/auth";

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function getReputationBadgeClass(level: string | undefined) {
  if (!level) return "reputation-badge";
  return `reputation-badge reputation-badge--${level}`;
}

export default async function HomePage(props: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const query = searchParams.q?.trim() ?? "";
  const viewer = await getAuthenticatedProfileFromCookies();
  const followedTopics = viewer ? await getFollowedTopicsForProfile(viewer.id) : [];
  const featuredTopics =
    (followedTopics.length > 0 ? followedTopics : FEATURED_TOPIC_TAGS).slice(0, 3);

  const [
    trendingPages,
    recommendedTakes,
    followedFeed,
    peopleToFollow,
    searchResults,
    topicSurfaces,
    similarPeople,
    followedBookmarks,
    contributorsInInterests
  ] = await Promise.all([
    getTrendingPages(6, viewer?.id),
    getRecommendedTakes(6, viewer?.id),
    viewer ? getFollowedProfileActivity(viewer.id, 6) : Promise.resolve([]),
    getPeopleToFollow(6, viewer?.id),
    query
      ? searchDiscovery(query, 5)
      : Promise.resolve({
          pages: [],
          takes: [],
          profiles: [],
          relatedQueries: [],
          queryInsight: null
        }),
    Promise.all(featuredTopics.map((topic) => getTopicSurface(topic, 3, viewer?.id))),
    viewer ? getPeopleSimilarToFollowing(viewer.id, 6) : Promise.resolve([]),
    viewer ? getPagesBookmarkedByFollowedProfiles(viewer.id, 6) : Promise.resolve([]),
    viewer ? getContributorsActiveInViewerInterests(viewer.id, 6) : Promise.resolve([])
  ]);

  return (
    <div className="page-shell stack">
      <span className="pill pill-notify">Discovery is live</span>

      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Discover</span>
              <span className="trust-badge">Topics and graph depth</span>
              {viewer ? <span className="trust-badge">Signed in as @{viewer.handle}</span> : null}
            </div>
            <h1>Find the pages, takes, people, and topics worth paying attention to</h1>
            <p className="muted">
              Search the Human Layer graph, move laterally through topic surfaces like AI and
              Devtools, spot the strongest verified takes, and use your follow graph to discover
              new contributors and pages with actual overlap.
            </p>
          </div>
          <div className="metric-grid compact-grid">
            <div className="stat-card">
              <strong>{trendingPages.length}</strong>
              <span className="muted">Trending pages</span>
            </div>
            <div className="stat-card">
              <strong>{recommendedTakes.length}</strong>
              <span className="muted">Recommended takes</span>
            </div>
            <div className="stat-card">
              <strong>{topicSurfaces.length}</strong>
              <span className="muted">Live topic surfaces</span>
            </div>
          </div>
        </div>

        <form action="/search" className="discovery-search">
          <label className="field">
            <span className="helper">Search pages, people, takes, and themes</span>
            <div className="discovery-search-row">
              <input
                className="input"
                defaultValue={query}
                name="q"
                placeholder="Try next.js, demo_builder, oss, devtools, ai..."
                type="search"
              />
              <button className="button" type="submit">
                Search
              </button>
              {query ? (
                <Link className="button secondary subtle" href="/search">
                  Clear
                </Link>
              ) : null}
            </div>
          </label>
        </form>
        {!query ? (
          <div className="chip-row">
            <span className="muted small-copy">Try:</span>
            {featuredTopics.map((topic) => (
              <Link className="chip" href={`/search?q=${topic}`} key={topic}>
                {getInterestTagLabel(topic)}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {query ? (
        <section className="card stack">
          <div className="section-header">
            <h2>Search results</h2>
            <span className="muted">Results for “{query}”.</span>
          </div>
          {searchResults.queryInsight ? <p className="muted">{searchResults.queryInsight}</p> : null}
          {searchResults.relatedQueries.length > 0 ? (
            <div className="chip-row">
              <span className="muted small-copy">Related:</span>
              {searchResults.relatedQueries.map((suggestion) => (
                <Link
                  className="chip"
                  href={`/search?q=${encodeURIComponent(suggestion.query)}`}
                  key={suggestion.query}
                >
                  {suggestion.label}
                </Link>
              ))}
            </div>
          ) : null}
          {searchResults.pages.length === 0 &&
          searchResults.takes.length === 0 &&
          searchResults.profiles.length === 0 ? (
            <p className="muted">No discovery results yet. Try another page title, handle, host, or keyword.</p>
          ) : (
            <div className="stack">
              <div className="action-row">
                <Link className="button secondary subtle" href={`/search?q=${encodeURIComponent(query)}`}>
                  Open full search page
                </Link>
              </div>
              {searchResults.pages.length > 0 ? (
                <div className="stack">
                  <span className="eyebrow">Pages</span>
                  <div className="discovery-grid">
                    {searchResults.pages.map((page) => (
                      <article className="discovery-card" key={page.id}>
                        <div className="chip-row">
                          <span className="trust-badge">Page</span>
                          {page.tags.map((tag) => (
                            <Link className="chip" href={`/topics/${tag}`} key={tag}>
                              {getInterestTagLabel(tag)}
                            </Link>
                          ))}
                        </div>
                        <strong>{page.title}</strong>
                        <p className="muted">{page.summary}</p>
                        <p className="muted">
                          {formatPageKind(page.pageKind)} • {page.host}
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
                </div>
              ) : null}

              {searchResults.takes.length > 0 ? (
                <div className="stack">
                  <span className="eyebrow">Takes</span>
                  <div className="discovery-grid">
                    {searchResults.takes.map((take) => (
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
                        <p className="muted">
                          Helpful {take.helpfulCount} • {formatDate(take.createdAt)}
                        </p>
                        <HelpfulButton commentId={take.commentId} initialCount={take.helpfulCount} />
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
                </div>
              ) : null}

              {searchResults.profiles.length > 0 ? (
                <div className="stack">
                  <span className="eyebrow">People</span>
                  <div className="discovery-grid">
                    {searchResults.profiles.map((profile) => (
                      <article className="discovery-card" key={profile.id}>
                        <div className="chip-row">
                          <span className="trust-badge">{profile.verifiedHuman ? "Verified human" : "Profile"}</span>
                          <span className={getReputationBadgeClass(profile.reputation.level)}>
                            {profile.reputation.label}
                          </span>
                          {profile.interestTags.map((tag) => (
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
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      <section className="card stack home-section">
        <div className="section-header">
          <h2>{followedTopics.length > 0 ? "This week in your followed topics" : "Weekly digests"}</h2>
          <span className="muted">
            {followedTopics.length > 0
              ? "Topic summaries tuned to the interests you actively follow."
              : "A quick weekly pass over the strongest live interest clusters."}
          </span>
        </div>
        <div className="topic-grid">
          {topicSurfaces.map((surface) => (
            <article className="topic-card" key={surface.topic}>
              <div className="chip-row">
                <span className="trust-badge">This week in {surface.label}</span>
                {surface.clusterTags.slice(0, 3).map((tag) => (
                  <Link className="chip" href={`/topics/${tag}`} key={tag}>
                    {getInterestTagLabel(tag)}
                  </Link>
                ))}
              </div>
              <strong>{surface.label}</strong>
              <p className="muted">{surface.description}</p>
              {surface.trendingPages[0] ? (
                <p className="muted small-copy">
                  Lead page: <strong>{surface.trendingPages[0].title}</strong> • {surface.trendingPages[0].reason}
                </p>
              ) : null}
              {surface.topTakes[0] ? (
                <p className="muted small-copy">
                  Lead take: @{surface.topTakes[0].profileHandle} on {surface.topTakes[0].pageTitle}
                </p>
              ) : null}
              <div className="topic-stat-grid">
                <div className="stat-card">
                  <strong>{surface.trendingPages.length}</strong>
                  <span className="muted">Pages</span>
                </div>
                <div className="stat-card">
                  <strong>{surface.topTakes.length}</strong>
                  <span className="muted">Takes</span>
                </div>
                <div className="stat-card">
                  <strong>{surface.topContributors.length}</strong>
                  <span className="muted">People</span>
                </div>
              </div>
              <p className="muted">
                {surface.whyNow}
              </p>
              {surface.viewerReason ? <p className="muted small-copy">{surface.viewerReason}</p> : null}
              <div className="chip-row">
                {surface.relatedTopics.slice(0, 3).map((tag) => (
                  <Link className="chip" href={`/topics/${tag}`} key={tag}>
                    {getInterestTagLabel(tag)}
                  </Link>
                ))}
              </div>
              <div className="action-row">
                <Link className="button secondary subtle" href={`/topics/${surface.topic}`}>
                  Open topic
                </Link>
                <Link className="button secondary subtle" href="/notifications">
                  Notification settings
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack home-section">
        <div className="section-header">
          <h2>Trending pages</h2>
          <span className="muted">Pages with the strongest mix of takes, verdicts, and bookmarks right now.</span>
        </div>
        <div className="discovery-grid">
          {trendingPages.map((page) => (
            <article className="discovery-card" key={page.id}>
              <div className="chip-row">
                <span className="trust-badge">Trending</span>
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
                {page.commentCount} takes • {page.verdictCount} verdicts • {page.bookmarkCount} bookmarks
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
      </section>

      <section className="card stack home-section">
        <div className="section-header">
          <h2>Recommended takes</h2>
          <span className="muted">Helpful verified perspectives worth reading even if you did not land there first.</span>
        </div>
        <div className="discovery-grid">
          {recommendedTakes.map((take) => (
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
      </section>

      {viewer ? (
        <>
          <section className="card stack home-section">
            <div className="section-header">
              <h2>From people you follow</h2>
              <span className="muted">Fresh takes from the follow graph tied to your verified-human profile.</span>
            </div>
            {followedFeed.length === 0 ? (
              <p className="muted">
                Follow a few people and their new takes will start showing up here. You can also track them from Notifications.
              </p>
            ) : (
              <div className="discovery-grid">
                {followedFeed.map((take) => (
                  <article className="discovery-card" key={take.commentId}>
                    <div className="chip-row">
                      <span className="trust-badge">Following</span>
                      {take.authorReputation ? (
                        <span className={getReputationBadgeClass(take.authorReputation.level)}>
                          {take.authorReputation.label}
                        </span>
                      ) : null}
                      <Link className="inline-link" href={`/profiles/${take.authorHandle}`}>
                        @{take.authorHandle}
                      </Link>
                    </div>
                    <strong>{take.pageTitle}</strong>
                    <p>{take.body}</p>
                    <p className="muted">
                      {take.reason} • Helpful {take.helpfulCount} • {formatDate(take.createdAt)}
                    </p>
                    <HelpfulButton commentId={take.commentId} initialCount={take.helpfulCount} />
                    <ProfileSafetyActions
                      profileHandle={take.authorHandle}
                      profileId={take.authorProfileId}
                      viewerProfileId={viewer?.id}
                    />
                    <div className="link-row">
                      <Link className="inline-link" href={`/pages/${take.pageId}`}>
                        Open Human Layer page
                      </Link>
                      <Link className="inline-link" href={take.pageCanonicalUrl} rel="noreferrer" target="_blank">
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
              <h2>Pages followed people are bookmarking</h2>
              <span className="muted">A cleaner page-discovery view built from the people you already trust.</span>
            </div>
            {followedBookmarks.length === 0 ? (
              <p className="muted">Once people you follow start bookmarking pages, they will show up here.</p>
            ) : (
              <div className="discovery-grid">
                {followedBookmarks.map((page) => (
                  <article className="discovery-card" key={page.id}>
                    <div className="chip-row">
                      <span className="trust-badge">Follow graph</span>
                      {page.tags.map((tag) => (
                        <Link className="chip" href={`/topics/${tag}`} key={tag}>
                          {getInterestTagLabel(tag)}
                        </Link>
                      ))}
                    </div>
                    <strong>{page.title}</strong>
                    <p className="muted">{page.summary}</p>
                    <p className="muted">
                      {page.reason} • {page.bookmarkedByCount} bookmark{page.bookmarkedByCount === 1 ? "" : "s"} from people you follow
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
              <h2>People similar to who you follow</h2>
              <span className="muted">Profiles that overlap with the people you already decided are worth tracking.</span>
            </div>
            {similarPeople.length === 0 ? (
              <p className="muted">Follow a few more people and this part of the graph will start learning your pattern.</p>
            ) : (
              <div className="discovery-grid">
                {similarPeople.map((profile) => (
                  <article className="discovery-card" key={profile.id}>
                    <div className="chip-row">
                      <span className="trust-badge">Similar people</span>
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
                      <FollowProfileButton profileId={profile.id} />
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

          <section className="card stack home-section">
            <div className="section-header">
              <h2>Contributors active in your interests</h2>
              <span className="muted">People already producing visible takes across the interests in your graph.</span>
            </div>
            {contributorsInInterests.length === 0 ? (
              <p className="muted">Add more topic interests during verification and this section will start filling in.</p>
            ) : (
              <div className="discovery-grid">
                {contributorsInInterests.map((profile) => (
                  <article className="discovery-card" key={profile.id}>
                    <div className="chip-row">
                      <span className="trust-badge">Interest graph</span>
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
                      <FollowProfileButton profileId={profile.id} />
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
        </>
      ) : null}

      <section className="card stack home-section">
        <div className="section-header">
          <h2>People to follow</h2>
          <span className="muted">Pseudonymous verified humans with visible signal and activity.</span>
        </div>
        <div className="discovery-grid">
          {peopleToFollow.map((profile) => (
            <article className="discovery-card" key={profile.id}>
              <div className="chip-row">
                <span className="trust-badge">{profile.verifiedHuman ? "Verified human" : "Profile"}</span>
                <span className={getReputationBadgeClass(profile.reputation.level)}>
                  {profile.reputation.label}
                </span>
                {profile.interestTags.map((tag) => (
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
      </section>

      <section className="card stack home-section">
        <h2>Beta links</h2>
        <div className="chip-row">
          <Link className="button" href="/verify">
            Verify
          </Link>
          <Link className="button secondary" href="/topics">
            Topics
          </Link>
          <Link className="button secondary" href="/bookmarks">
            Bookmarks
          </Link>
          {viewer ? (
            <Link className="button secondary" href="/notifications">
              Notifications
            </Link>
          ) : null}
          <Link className="button secondary" href="/support">
            Support
          </Link>
          <Link className="button secondary" href="/privacy">
            Privacy
          </Link>
        </div>
      </section>
    </div>
  );
}
