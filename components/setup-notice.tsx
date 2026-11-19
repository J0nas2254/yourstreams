import Link from "next/link";

// Klare Einrichtungs-/Fehlermeldung statt Demo-Daten.
export default function SetupNotice({
  title,
  message,
  showSettingsLink = true
}: {
  title: string;
  message: string;
  showSettingsLink?: boolean;
}) {
  return (
    <div role="alert" className="mx-auto max-w-2xl rounded-3xl border border-ink-700 bg-ink-800 p-6 sm:p-8">
      <h2 className="text-xl font-extrabold text-white">{title}</h2>
      <p className="mt-2 text-slate-300">{message}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
        {showSettingsLink && (
          <Link href="/einstellungen" className="rounded-full bg-white px-5 py-2.5 text-slate-900">
            Zu den Einstellungen
          </Link>
        )}
        <Link href="/ueber" className="rounded-full border border-slate-500 px-5 py-2.5 text-white">
          Quellen & Hinweise
        </Link>
      </div>
    </div>
  );
}
