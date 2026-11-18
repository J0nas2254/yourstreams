import type { Metadata } from "next";
import "./globals.css";
import { TvProvider } from "@/components/tv-provider";
import { SwRegister } from "@/components/sw-register";
import Link from "next/link";

export const metadata: Metadata = {
  title: "StreamFinder",
  description: "Filme und Serien finden – mit Gesehen-Status, Merkliste und Fire-TV-Bedienung",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-black text-white">
        <TvProvider />
        <SwRegister />
        <header className="border-b border-neutral-800">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 p-4" aria-label="Hauptmenü">
            <Link href="/" data-tv className="text-lg font-bold text-green-400 rounded focus:outline-none focus:ring-2 focus:ring-green-400">
              StreamFinder
            </Link>
            <Link href="/" data-tv className="rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400">
              Start
            </Link>
            <Link href="/suche" data-tv className="rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400">
              Suche
            </Link>
            <Link href="/tv" data-tv className="rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400">
              Serien
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
