import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import { getUnreadNotificationCount } from '@human-layer/db';

import { getAuthenticatedProfileFromCookies, isAdminProfile } from './lib/auth';

const sans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', weight: ['400', '600', '700'] });

export const metadata: Metadata = {
  title: 'Human Layer',
  description: 'Verified-human context layer for the web',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const viewer = await getAuthenticatedProfileFromCookies();
  const canReview = isAdminProfile(viewer);
  const unreadNotifications = viewer ? await getUnreadNotificationCount(viewer.id) : 0;

  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <nav className="top-nav">
          <div className="top-nav-inner">
            <Link className="top-nav-brand" href="/">
              Human Layer
            </Link>
            <div className="top-nav-links">
              <Link className="top-nav-link" href="/">
                Discover
              </Link>
              <Link className="top-nav-link" href="/search">
                Search
              </Link>
              <Link className="top-nav-link" href="/topics">
                Topics
              </Link>
              <Link className="top-nav-link" href="/metrics">
                Metrics
              </Link>
              <Link className="top-nav-link" href="/verify">
                Verify
              </Link>
              <Link className="top-nav-link" href="/bookmarks">
                Bookmarks
              </Link>
              <Link className="top-nav-link top-nav-link-with-badge" href="/notifications">
                Notifications
                {unreadNotifications > 0 ? (
                  <span className="top-nav-link-badge">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
              {canReview ? (
                <Link className="top-nav-link" href="/moderation">
                  Moderation
                </Link>
              ) : null}
              <Link className="top-nav-link" href="/privacy">
                Privacy
              </Link>
              <Link className="top-nav-link" href="/support">
                Support
              </Link>
              <Link className="top-nav-link" href="/dev-login">
                Dev Login
              </Link>
            </div>
          </div>
        </nav>
        <main id="main-content">{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span className="site-footer-brand">Human Layer beta</span>
            <div className="site-footer-links">
              <Link className="site-footer-link" href="/">
                Discover
              </Link>
              <Link className="site-footer-link" href="/search">
                Search
              </Link>
              <Link className="site-footer-link" href="/topics">
                Topics
              </Link>
              <Link className="site-footer-link" href="/metrics">
                Metrics
              </Link>
              <Link className="site-footer-link" href="/bookmarks">
                Bookmarks
              </Link>
              <Link className="site-footer-link" href="/notifications">
                Notifications
              </Link>
              <Link className="site-footer-link" href="/integrations">
                Propose integration
              </Link>
              <Link className="site-footer-link" href="/requested-integrations">
                Request board
              </Link>
              <Link className="site-footer-link" href="/privacy">
                Privacy
              </Link>
              {canReview ? (
                <Link className="site-footer-link" href="/moderation">
                  Moderation
                </Link>
              ) : null}
              <Link className="site-footer-link" href="/terms">
                Terms
              </Link>
              <Link className="site-footer-link" href="/support">
                Support
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
