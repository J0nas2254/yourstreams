export default function UeberPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Quellen & Über</h1>
      <section className="rounded-2xl border border-white/10 bg-ink-800 p-5 text-sm text-slate-300">
        <h2 className="font-bold text-white">Was ist StreamFinder?</h2>
        <p className="mt-1">
          StreamFinder hilft deinem Haushalt zu finden, welche Filme und Serien bei euren Streaming-Abos in Deutschland
          verfügbar sind. Es ist ein Finder mit Merkliste – Videos werden nicht in der App abgespielt. Zum Anschauen
          wirst du – sofern ein gültiger Link aus der API vorliegt – zum Anbieter oder den Watch-Optionen weitergeleitet.
        </p>
        <p className="mt-2">
          Keine Anbieter-Logins, keine Streaming-Passwörter, keine Zahlungen, kein Kopierschutz-Umghen, kein Scraping
          und keine inoffiziellen Streaming-APIs. Alle Titel, Bilder, Bewertungen und Verfügbarkeiten sind echte Daten
          der unten genannten Quellen – es werden keine Demo- oder Beispieldaten angezeigt.
        </p>
      </section>
      <section className="rounded-2xl border border-white/10 bg-ink-800 p-5 text-sm text-slate-300">
        <h2 className="font-bold text-white">Datenquellen & vorgeschriebene Hinweise</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            Titel, Bilder und Streaming-Verfügbarkeiten stammen aus der offiziellen{" "}
            <strong className="text-white">TMDb-API</strong> (The Movie Database).
          </li>
          <li>
            This product uses the TMDB API but is not endorsed or certified by TMDB. / Dieses Produkt verwendet die
            TMDB-API, wird aber nicht von TMDB unterstützt oder zertifiziert.
          </li>
          <li>
            Streaming-Verfügbarkeiten enthalten Daten von <strong className="text-white">JustWatch</strong> (über TMDb).
            Bitte beachte zusätzlich die Nutzungsbedingungen und Attributionsvorgaben von JustWatch.
          </li>
          <li>
            IMDb-Bewertungen stammen aus der <strong className="text-white">OMDb API</strong> und werden ausdrücklich
            als „IMDb“ beschriftet. TMDb-Bewertungen werden immer als „TMDb“ beschriftet – niemals umgekehrt.
          </li>
          <li>Verfügbarkeiten können sich ändern und sind ohne Gewähr.</li>
        </ul>
        <p className="mt-3">
          <a className="font-bold text-white underline" href="https://www.themoviedb.org/documentation/api" target="_blank" rel="noreferrer">
            TMDb API-Dokumentation
          </a>{" "}·{" "}
          <a className="font-bold text-white underline" href="https://www.justwatch.com" target="_blank" rel="noreferrer">
            JustWatch
          </a>{" "}·{" "}
          <a className="font-bold text-white underline" href="https://www.omdbapi.com" target="_blank" rel="noreferrer">
            OMDb API
          </a>
        </p>
      </section>
    </div>
  );
}
