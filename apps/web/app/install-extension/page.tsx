import Link from "next/link";

const extensionDownloadPath = "/downloads/human-layer-extension-hackathon.zip";

export default async function InstallExtensionPage(props: {
  searchParams: Promise<{ next?: string; source?: string }>;
}) {
  const searchParams = await props.searchParams;
  const nextPath =
    typeof searchParams.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : "/";
  const source = searchParams.source?.trim();

  return (
    <div className="page-shell stack legal-shell">
      <span className="pill">Install extension</span>

      <section className="card hero-card stack">
        <div className="chip-row">
          <span className="trust-badge">Hackathon install flow</span>
          <span className="trust-badge">Chrome unpacked extension</span>
        </div>
        <h1>Your verification is done. Install the Human Layer extension next.</h1>
        <p className="muted">
          Chrome Web Store review may not finish in time for the hackathon, so this flow gives
          people a downloadable extension package they can install locally in developer mode.
        </p>
        <div className="chip-row">
          <a className="button" download href={extensionDownloadPath}>
            Download extension package
          </a>
          <Link className="button secondary" href={nextPath}>
            Continue without extension
          </Link>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>How to install it</h2>
          <span className="muted">This takes about a minute on Chrome.</span>
        </div>
        <ol className="legal-list">
          <li>Download the extension package zip.</li>
          <li>Unzip it somewhere on your computer.</li>
          <li>Open <code>chrome://extensions</code>.</li>
          <li>Turn on Developer mode.</li>
          <li>Click <code>Load unpacked</code>.</li>
          <li>Select the unzipped <code>chrome-mv3</code> folder.</li>
        </ol>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>What you get</h2>
          <span className="muted">Why the extension is worth installing after verification.</span>
        </div>
        <ul className="legal-list">
          <li>Verified-human context directly on supported websites.</li>
          <li>Post takes, bookmark pages, follow people and topics, and vote helpful without leaving the page.</li>
          <li>Quick access to your Human Layer graph while browsing GitHub, YouTube, Spotify, docs, and more.</li>
          <li>If a website is missing, you can request it publicly from the integration board.</li>
        </ul>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>After you install</h2>
          <span className="muted">Next steps for the hackathon demo flow.</span>
        </div>
        <div className="chip-row">
          <Link className="button secondary" href={nextPath}>
            Open your profile
          </Link>
          <Link className="button secondary" href="/">
            Go to Discover
          </Link>
          <Link className="button secondary" href="/requested-integrations">
            Request a new integration
          </Link>
         <Link
           className="button secondary"
            href={source ? "/support?source=" + encodeURIComponent(source) : "/support"}
         >
           Need help?
         </Link>
        </div>
      </section>
    </div>
  );
}
