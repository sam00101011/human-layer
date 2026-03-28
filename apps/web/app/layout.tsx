import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';

const sans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', weight: ['400', '600', '700'] });

export const metadata: Metadata = {
  title: 'Human Layer',
  description: 'Verified-human context layer for the web',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <nav className="top-nav">
          <div className="top-nav-inner">
            <Link className="top-nav-brand" href="/">
              Human Layer
            </Link>
            <div className="top-nav-links">
              <Link className="top-nav-link" href="/verify">
                Verify
              </Link>
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
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span className="site-footer-brand">Human Layer beta</span>
            <div className="site-footer-links">
              <Link className="site-footer-link" href="/privacy">
                Privacy
              </Link>
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
