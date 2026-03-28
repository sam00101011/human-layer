import Link from "next/link";
import { getInterestTagLabel } from "@human-layer/core";
import {
  getPeopleToFollow,
  getRecommendedTakes,
  getTrendingPages,
  searchDiscovery
} from "@human-layer/db";

import { FollowProfileButton } from "../components/follow-profile-button";
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

  const [trendingPages, recommendedTakes, peopleToFollow, searchResults] = await Promise.all([
    getTrendingPages(6),
    getRecommendedTakes(6),
    getPeopleToFollow(6, viewer?.id),
    query ? searchDiscovery(query, 5) : Promise.resolve({ pages: [], takes: [], profiles: [] })
  ]);

  return (
    <main className="page-shell stack">
      <span className="pill">Discovery is live</span>

      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Discover</span>
              {viewer ? <span className="trust-badge">Signed in as @{viewer.handle}</span> : null}
            </div>
            <h1>Find the pages, takes, and people worth paying attention to</h1>
            <p className="muted">
              Search the Human Layer graph, see what is trending across supported websites, spot
              the strongest verified takes, and discover pseudonymous verified humans to follow.
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
          </div>
        </div>

        <form action="/" className="discovery-search">
          <label className="field">
            <span className="helper">Search pages, people, and takes</span>
            <div className="discovery-search-row">
              <input
                className="input"
                defaultValue={query}
                name="q"
                placeholder="Try next.js, demo_builder, oss, devtools..."
                type="search"
              />
              <button className="button" type="submit">
                Search
              </button>
              {query ? (
                <Link className="button secondary subtle" href="/">
                  Clear
                </Link>
              ) : null}
            </div>
          </label>
        </form>
      </section>

      {query ? (
        <section className="card stack">
          <div className="section-header">
            <h2>Search results</h2>
            <span className="muted">Results for “{query}”.</span>
          </div>
          {searchResults.pages.length === 0 &&
          searchResults.takes.length === 0 &&
          searchResults.profiles.length === 0 ? (
            <p className="muted">No discovery results yet. Try another page title, handle, host, or keyword.</p>
          ) : (
            <div className="stack">
              {searchResults.pages.length > 0 ? (
                <div className="stack">
                  <span className="eyebrow">Pages</span>
                  <div className="discovery-grid">
                    {searchResults.pages.map((page) => (
                      <article className="discovery-card" key={page.id}>
                        <div className="chip-row">
                          <span className="trust-badge">Page</span>
                          {page.tags.map((tag) => (
                            <span className="chip" key={tag}>
                              {tag}
                            </span>
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
                            <span className="chip" key={tag}>
                              {getInterestTagLabel(tag)}
                            </span>
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

      <section className="card stack">
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
                  <span className="chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <strong>{page.title}</strong>
              <p className="muted">{page.summary}</p>
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

      <section className="card stack">
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
              <p className="muted">
                Helpful {take.helpfulCount} • {formatDate(take.createdAt)} • {formatPageKind(take.pageKind)}
              </p>
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

      <section className="card stack">
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
                  <span className="chip" key={tag}>
                    {getInterestTagLabel(tag)}
                  </span>
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
      </section>

      <section className="card stack">
        <h2>Beta links</h2>
        <div className="chip-row">
          <Link className="button" href="/verify">
            Verify
          </Link>
          <Link className="button secondary" href="/bookmarks">
            Bookmarks
          </Link>
          <Link className="button secondary" href="/support">
            Support
          </Link>
          <Link className="button secondary" href="/privacy">
            Privacy
          </Link>
        </div>
      </section>
    </main>
  );
}
