import type { Metadata, Viewport } from "next";
import Link from "next/link";
import TvRedirect from "@/components/tv-redirect";
import StatusBanner from "./status-banner";
import SwRegister from "./sw-register";
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
  themeColor: "#070b16",
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
        <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2.5 sm:py-3">
            <Link href="/" className="text-lg font-black tracking-tight text-white">
              Stream<span className="text-gold-400">Finder</span>
            </Link>
            <nav
              aria-label="Hauptnavigation"
              className="no-scrollbar -mx-1 flex w-full items-center gap-1 overflow-x-auto whitespace-nowrap text-[13px] font-semibold text-slate-200 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:text-sm"
            >
              <Link data-tv className="tv-focusable shrink-0 rounded-lg px-3 py-1.5 hover:bg-white/10" href="/">Start</Link>
              <Link data-tv className="tv-focusable shrink-0 rounded-lg px-3 py-1.5 hover:bg-white/10" href="/suche">Suche</Link>
              <Link data-tv className="tv-focusable shrink-0 rounded-lg px-3 py-1.5 hover:bg-white/10" href="/liste">Liste</Link>
              <Link data-tv className="tv-focusable shrink-0 rounded-lg px-3 py-1.5 hover:bg-white/10" href="/dienste">Dienste</Link>
              <Link data-tv className="tv-focusable shrink-0 rounded-lg px-3 py-1.5 hover:bg-white/10" href="/einstellungen">Einstellungen</Link>
              <Link data-tv className="tv-focusable shrink-0 rounded-lg px-3 py-1.5 hover:bg-white/10" href="/tv">TV</Link>
            </nav>
          </div>
        </header>
        <StatusBanner />
        <main id="inhalt" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
          {children}
        </main>
        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-slate-400">
            <p>StreamFinder · Region Deutschland (DE) · Keine Wiedergabe in der App.</p>
            <Link href="/ueber" className="font-semibold text-slate-200 underline">
              Quellen & Über
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
