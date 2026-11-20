import type { Metadata, Viewport } from "next";
import Link from "next/link";
import TvRedirect from "@/components/tv-redirect";
import StatusBanner from "./status-banner";
import SwRegister from "./sw-register";
import SidebarNav from "./sidebar-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamFinder – Finde Filme & Serien deiner Abos",
  description:
    "StreamFinder hilft dir in Deutschland, Filme und Serien zu finden, die bei deinen Streaming-Abos verfügbar sind.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "StreamFinder" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" }
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="cinema-bg min-h-screen font-display">
        <SwRegister />
        <TvRedirect />
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900"
        >
          Zum Inhalt springen
        </a>
        <div className="sf-shell">
          <aside className="sf-sidebar" aria-label="Seitenleiste">
            <Link href="/" className="sf-brand" aria-label="StreamFinder Startseite">
              <span aria-hidden className="sf-brand-mark">S</span>
              <span>
                Stream<span style={{ fontWeight: 400 }}>Finder</span>
              </span>
            </Link>
            <SidebarNav />
            <div className="sf-sidebar-foot" style={{ marginTop: "auto", padding: "12px 10px 2px", fontSize: "0.75rem", color: "#71717a" }}>
              <p>Region DE · Keine Wiedergabe in der App.</p>
              <Link href="/ueber" style={{ color: "#d4d4d8", fontWeight: 700, textDecoration: "underline" }}>
                Quellen & Über
              </Link>
            </div>
          </aside>
          <div className="sf-main">
            <StatusBanner />
            <main id="inhalt" className="sf-content">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
