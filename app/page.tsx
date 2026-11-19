"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Title } from "@/lib/types";
import { ApiError, apiDiscover, apiSeasonEpisodes, apiTitle, apiTrending } from "@/lib/api.ts";
import { nextUnseenEpisode } from "@/lib/prefs.ts";
import { isOnMyServicesEntries, usePrefs } from "@/lib/store";
import { scoreTitles } from "@/lib/prefs.ts";
import Hero from "@/components/hero";
import SetupNotice from "@/components/setup-notice";
import TitleRow from "@/components/title-row";

export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [trending, setTrending] = useState<Title[]>([]);
  const [household, setHousehold] = useState<Title[]>([]);
  const [hero, setHero] = useState<Title | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "setup" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const { prefs, loaded, watchlist, seen } = usePrefs();
  const [continueWatching, setContinueWatching] = useState<Array<{ title: Title; label: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      try {
        const t = await apiTrending();
        if (cancelled) return;
        setTrending(t);
        // Hero mit vollständigen Details (inkl. IMDb-ID) anreichern
        const pick = t.find((x) => x.backdropPath) ?? t[0];
        if (pick) {
          try {
            const full = await apiTitle(pick.id);
            if (!cancelled) setHero(full);
          } catch {
            if (!cancelled) setHero(pick);
          }
        }
        setStatus("ok");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.notConfigured) setStatus("setup");
        else {
          setStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "Feed konnte nicht geladen werden.");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || prefs.services.length === 0 || status !== "ok") {
      setHousehold([]);
      return;
    }
    let cancelled = false;
    apiDiscover(prefs.services)
      .then((r) => {
        if (!cancelled) setHousehold(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loaded, prefs.services, status]);

  // „Weiterschauen“: teilweise gesehene Serien mit nächster offener Episode.
  // Reiner lokaler Merkstand – kein Abgleich mit dem Anbieter.
  useEffect(() => {
    if (!loaded || status !== "ok") return;
    let cancelled = false;
    async function load() {
      const started = Object.keys(prefs.seenEpisodes).filter(
        (id) => id.startsWith("tmdb-tv-") && !seen.includes(id)
      ).slice(0, 6);
      const out: Array<{ title: Title; label: string }> = [];
      for (const sid of started) {
        try {
          const t = await apiTitle(sid);
          if (cancelled) return;
          const seenIds = prefs.seenEpisodes[sid] ?? [];
          const seasons = (t.tvInfo?.seasons ?? []).filter((s) => s.season_number > 0);
          let found: { season_number: number; episode_number: number; name: string } | null = null;
          for (const s of seasons) {
            const eps = await apiSeasonEpisodes(sid, s.season_number);
            if (cancelled) return;
            found = nextUnseenEpisode(eps, seenIds);
            if (found) break;
          }
          if (found) {
            out.push({
              title: t,
              label: `Weiter: S${found.season_number} E${found.episode_number} „${found.name}“`
            });
          }
        } catch {
          // Serie überspringen, Rest trotzdem zeigen
        }
      }
      if (!cancelled) setContinueWatching(out);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, status, JSON.stringify(Object.keys(prefs.seenEpisodes).sort()), seen.join(",")]);

  const pool = useMemo(() => {
    const map = new Map<string, Title>();
    for (const t of [...trending, ...household]) map.set(t.id, t);
    return [...map.values()];
  }, [trending, household]);

  const forYou = useMemo(() => {
    if (!loaded || status !== "ok") return [];
    return scoreTitles(pool, prefs).filter((s) => s.score > 0).slice(0, 12);
  }, [pool, prefs, loaded, status]);

  const watchTitles = useMemo(
    () => pool.filter((t) => watchlist.some((w) => w.id === t.id)),
    [pool, watchlist]
  );

  const seenSet = useMemo(() => new Set(seen), [seen]);
  const onMineIds = useMemo(
    () => new Set(pool.filter((t) => isOnMyServicesEntries(t.availability, prefs.services)).map((t) => t.id)),
    [pool, prefs.services]
  );

  const householdOnlyMine = useMemo(
    () => household.filter((t) => isOnMyServicesEntries(t.availability, prefs.services)),
    [household, prefs.services]
  );

  function surprise() {
    const candidates = householdOnlyMine.length > 0 ? householdOnlyMine : pool.filter((t) => !seen.includes(t.id));
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    router.push(`/titel?id=${encodeURIComponent(pick.id)}`);
  }

  return (
    <div className="space-y-2">
      <section className="rounded-3xl border border-white/10 bg-ink-800/60 p-5 sm:p-8">
        <h1 className="text-2xl font-black text-white sm:text-4xl">Was läuft heute bei dir?</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
          Echte Verfügbarkeiten deiner Haushalts-Abos in Deutschland (DE). Zum Anschauen wirst du zum Anbieter
          weitergeleitet – nichts wird in dieser App abgespielt.
        </p>
        <form
          className="mt-5 flex flex-col gap-2 sm:flex-row"
          role="search"
          aria-label="Titel suchen"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/suche?q=${encodeURIComponent(q)}`);
          }}
        >
          <label htmlFor="start-suche" className="sr-only">
            Film oder Serie suchen
          </label>
          <input
            id="start-suche"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Film oder Serie suchen …"
            className="w-full flex-1 rounded-2xl border border-white/15 bg-ink-950 px-4 py-3 text-white placeholder:text-slate-500"
          />
          <button type="submit" className="rounded-2xl bg-white px-6 py-3 font-extrabold text-slate-900">
            Suchen
          </button>
          <button
            type="button"
            onClick={surprise}
            disabled={pool.length === 0}
            className="rounded-2xl bg-gold-400 px-6 py-3 font-extrabold text-slate-900 disabled:opacity-40"
          >
            Überrasch mich
          </button>
        </form>
      </section>

      {status === "loading" && <p className="py-10 text-center text-slate-300">Feed wird geladen …</p>}

      {status === "setup" && (
        <div className="py-6">
          <SetupNotice
            title="API-Schlüssel fehlt"
            message="Ohne TMDb-Schlüssel zeigt die App keine Titel – es werden keine Demo-Daten angezeigt. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets; Anleitung in der README). Deine lokal gespeicherte Liste bleibt trotzdem verfügbar."
          />
        </div>
      )}

      {status === "error" && (
        <div className="py-6">
          <SetupNotice title="Feed nicht verfügbar" message={errorMsg} showSettingsLink={false} />
        </div>
      )}

      {status === "ok" && (
        <>
          {hero && <div className="mt-4"><Hero title={hero} kicker="Empfehlung des Tages" /></div>}

          {loaded && prefs.services.length > 0 ? (
            <TitleRow
              heading="Für meinen Haushalt"
              titles={householdOnlyMine}
              onMyServicesIds={onMineIds}
              seenIds={seenSet}
              emptyText="Für deine Dienste wurde aktuell nichts gefunden."
            />
          ) : (
            <section aria-label="Für meinen Haushalt" className="mt-8">
              <h2 className="px-1 text-lg font-extrabold text-white sm:text-xl">Für meinen Haushalt</h2>
              <p className="mt-2 rounded-2xl border border-white/10 bg-ink-800 p-4 text-sm text-slate-300">
                Wähle deine Streaming-Abos unter <Link href="/dienste" className="font-bold text-white underline">Meine Dienste</Link>,
                dann siehst du hier Titel, die dort wirklich verfügbar sind.
              </p>
            </section>
          )}

          {continueWatching.length > 0 && (
            <div>
              <TitleRow
                heading="Weiterschauen"
                titles={continueWatching.map((c) => c.title)}
                reasons={new Map(continueWatching.map((c) => [c.title.id, c.label] as [string, string]))}
                onMyServicesIds={onMineIds}
                seenIds={new Set(seen)}
              />
              <p className="px-1 text-xs text-slate-500">
                Lokaler Merkstand auf diesem Gerät – die App erkennt nicht, was du beim Anbieter tatsächlich
                angesehen hast.
              </p>
            </div>
          )}

          {forYou.length > 0 && (
            <TitleRow
              heading="Für dich"
              titles={forYou.map((s) => s.title)}
              reasons={new Map(forYou.map((s) => [s.title.id, s.reasons[0] ?? ""] as [string, string]))}
              onMyServicesIds={onMineIds}
              seenIds={seenSet}
            />
          )}

          <TitleRow heading="Im Trend" titles={trending} onMyServicesIds={onMineIds} seenIds={seenSet} />

          {watchlist.length > 0 && (
            <TitleRow
              heading="Meine Merkliste"
              titles={watchTitles}
              onMyServicesIds={onMineIds}
              seenIds={seenSet}
              emptyText="Gemerkt, aber aktuell ohne Details – öffne die Liste für mehr."
            />
          )}
        </>
      )}
    </div>
  );
}
