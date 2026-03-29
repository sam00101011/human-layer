"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const installStorageKey = "human-layer-extension-installed";
const installMessageType = "human-layer-extension-installed";

type InstallExtensionStatusProps = {
  downloadPath: string;
  nextPath: string;
  source?: string;
};

export function InstallExtensionStatus({
  downloadPath,
  nextPath,
  source
}: InstallExtensionStatusProps) {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(installStorageKey);
    if (stored === "1") {
      setInstalled(true);
    }

    function handleMessage(event: MessageEvent) {
      if (
        event.source === window &&
        typeof event.data === "object" &&
        event.data !== null &&
        "type" in event.data &&
        event.data.type === installMessageType
      ) {
        window.localStorage.setItem(installStorageKey, "1");
        setInstalled(true);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  function markInstalled() {
    window.localStorage.setItem(installStorageKey, "1");
    setInstalled(true);
  }

  return (
    <>
      <section className="card hero-card stack">
        <div className="chip-row">
          <span className="trust-badge">Hackathon install flow</span>
          <span className={installed ? "pill" : "trust-badge"}>
            {installed ? "Extension detected" : "Chrome unpacked extension"}
          </span>
        </div>
        <h1>
          {installed
            ? "Your extension is installed. You can skip the setup guide."
            : "Your verification is done. Install the Human Layer extension next."}
        </h1>
        <p className="muted">
          {installed
            ? "Human Layer detected the extension on this browser. Open your wallet, profile, or Discover and keep going."
            : "Chrome Web Store review may not finish in time for the hackathon, so this flow gives people a downloadable extension package they can install locally in developer mode."}
        </p>
        <div className="chip-row">
          {!installed ? (
            <a className="button" download href={downloadPath}>
              Download extension package
            </a>
          ) : null}
          {!installed ? (
            <button className="button secondary" onClick={markInstalled} type="button">
              I've installed the extension
            </button>
          ) : null}
          <Link className="button secondary" href={nextPath}>
            Continue without extension
          </Link>
        </div>
      </section>

      {!installed ? (
        <>
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
        </>
      ) : null}

      <section className="card stack">
        <div className="section-header">
          <h2>After you install</h2>
          <span className="muted">Next steps for the hackathon demo flow.</span>
        </div>
        <div className="chip-row">
          <Link className="button secondary" href={nextPath}>
            Open your profile
          </Link>
          <Link className="button secondary" href="/wallet">
            Open wallet
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
    </>
  );
}
