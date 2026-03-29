import Link from "next/link";
import { getInterestTagLabel } from "@human-layer/core";
import { getFollowedTopicsForProfile, searchDiscovery } from "@human-layer/db";

import { FollowProfileButton } from "../../components/follow-profile-button";
import { HelpfulButton } from "../../components/helpful-button";
import { ProfileSafetyActions } from "../../components/profile-safety-actions";
import { getAuthenticatedProfileFromCookies } from "../lib/auth";

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

export default async function SearchPage(props: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const query = searchParams.q?.trim() ?? "";
  const viewer = await getAuthenticatedProfileFromCookies();
  const [results, followedTopics] = await Promise.all([
    query
      ? searchDiscovery(query, 8)
      : Promise.resolve({
          pages: [],
          takes: [],
          profiles: [],
          relatedQueries: [],
          queryInsight: null
        }),
    viewer ? getFollowedTopicsForProfile(viewer.id) : Promise.resolve([])
  ]);

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="chip-row">
          <span className="pill">Search</span>
          <span className="trust-badge">Pages, people, takes, and topics</span>
          {viewer && followedTopics.length > 0 ? (
            <span className="trust-badge">Tuned by {followedTopics.length} followed topics</span>
          ) : null}
        </div>
        <div className="stack compact">
          <h1>Search the Human Layer graph</h1>
          <p className="muted">
            Find the strongest pages, verified takes, profiles, and interest clusters with ranking
            that blends match quality and graph signal.
          </p>
        </div>
        <form action="/search" className="discovery-search">
          <label className="field">
            <span className="helper">Search by page title, host, handle, topic, or take text</span>
            <div className="discovery-search-row">
              <input
                className="input"
                defaultValue={query}
                name="q"
                placeholder="Try next.js, youtube, demo_builder, ai, devtools..."
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
        {results.queryInsight ? <p className="muted">{results.queryInsight}</p> : null}
        {results.relatedQueries.length > 0 ? (
          <div className="chip-row">
            <span className="muted small-copy">Related:</span>
            {results.relatedQueries.map((suggestion) => (
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
      </section>

      {!query ? (
        <section className="card stack">
          <div className="section-header">
            <h2>Start with something concrete</h2>
            <span className="muted">Search works best with a page title, handle, host, or interest tag.</span>
          </div>
          <div className="chip-row">
            {["ai", "devtools", "youtube", "spotify", "demo_builder", "github.com"].map((seed) => (
              <Link className="chip" href={`/search?q=${encodeURIComponent(seed)}`} key={seed}>
                {seed}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {query ? (
        <section className="card stack">
          <div className="section-header">
            <h2>Results for “{query}”</h2>
            <span className="muted">
              {results.pages.length + results.takes.length + results.profiles.length} ranked matches
            </span>
          </div>
          {results.pages.length === 0 && results.takes.length === 0 && results.profiles.length === 0 ? (
            <p className="muted">
              No search results yet. Try a different host, handle, page title, or topic.
            </p>
          ) : (
            <div className="stack">
              {results.pages.length > 0 ? (
                <div className="stack">
                  <span className="eyebrow">Pages</span>
                  <div className="discovery-grid">
                    {results.pages.map((page) => (
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
                        <p className="muted small-copy">{page.reason}</p>
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

              {results.takes.length > 0 ? (
                <div className="stack">
                  <span className="eyebrow">Takes</span>
                  <div className="discovery-grid">
                    {results.takes.map((take) => (
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
                </div>
              ) : null}

              {results.profiles.length > 0 ? (
                <div className="stack">
                  <span className="eyebrow">People</span>
                  <div className="discovery-grid">
                    {results.profiles.map((profile) => (
                      <article className="discovery-card" key={profile.id}>
                        <div className="chip-row">
                          <span className="trust-badge">
                            {profile.verifiedHuman ? "Verified human" : "Profile"}
                          </span>
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
    </div>
  );
}
