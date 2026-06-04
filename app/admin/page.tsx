import { redirect } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { SyncButton } from "./sync/SyncButton";
import { SecretButton } from "./ai-predict/SecretButton";

export default async function AdminHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const [lastSync] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "last_sync_at"));
  const lastSyncDate = lastSync ? new Date(lastSync.value) : null;
  const apiConfigured = Boolean(process.env.FOOTBALL_DATA_API_KEY);
  const aiPredictEmail = process.env.AI_PREDICT_EMAIL?.toLowerCase();
  const showSecretButton = Boolean(
    aiPredictEmail &&
      user.email.toLowerCase() === aiPredictEmail &&
      process.env.GEMINI_API_KEY,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm text-slate-600">
        Voer uitslagen in, zet juiste antwoorden voor bonusvragen, en koppel teams aan bracket-slots.
      </p>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Auto-sync uitslagen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Haalt afgeronde wedstrijden op uit football-data.org en kent automatisch punten toe.
        </p>
        <div className="mt-3 text-xs text-slate-500">
          {apiConfigured ? (
            <span className="text-green-700">✓ API key geconfigureerd</span>
          ) : (
            <span className="text-amber-700">
              ⚠ FOOTBALL_DATA_API_KEY niet ingesteld — voeg toe in env vars
            </span>
          )}
          {lastSyncDate && (
            <span className="ml-3">
              Laatste sync:{" "}
              {new Intl.DateTimeFormat("nl-NL", {
                timeZone: "Europe/Amsterdam",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(lastSyncDate)}
            </span>
          )}
        </div>
        {apiConfigured && (
          <div className="mt-3">
            <SyncButton />
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/wedstrijden" className="rounded-xl bg-white p-5 shadow-sm hover:bg-oranje-50">
          <div className="text-2xl">⚽</div>
          <div className="mt-1 font-semibold">Uitslagen handmatig</div>
          <div className="text-xs text-slate-500">Wedstrijden afsluiten + score zetten.</div>
        </Link>
        <Link href="/admin/bonus" className="rounded-xl bg-white p-5 shadow-sm hover:bg-oranje-50">
          <div className="text-2xl">🎯</div>
          <div className="mt-1 font-semibold">Bonusantwoorden</div>
          <div className="text-xs text-slate-500">Juiste antwoorden zetten + lock-tijd.</div>
        </Link>
        <Link href="/admin/bracket" className="rounded-xl bg-white p-5 shadow-sm hover:bg-oranje-50">
          <div className="text-2xl">🥇</div>
          <div className="mt-1 font-semibold">Bracket-resultaten</div>
          <div className="text-xs text-slate-500">Welke teams in welke ronde gehaald.</div>
        </Link>
        <Link href="/admin/users" className="rounded-xl bg-white p-5 shadow-sm hover:bg-oranje-50">
          <div className="text-2xl">👥</div>
          <div className="mt-1 font-semibold">Gebruikers</div>
          <div className="text-xs text-slate-500">Verwijderen, admin rechten geven.</div>
        </Link>
        <Link href="/admin/prizes" className="rounded-xl bg-white p-5 shadow-sm hover:bg-oranje-50">
          <div className="text-2xl">🏆</div>
          <div className="mt-1 font-semibold">Prijzen</div>
          <div className="text-xs text-slate-500">Wat is er te winnen — zichtbaar op homepage.</div>
        </Link>
      </div>

      {showSecretButton && (
        <div className="pt-12 text-right opacity-50 hover:opacity-100">
          <SecretButton />
        </div>
      )}
    </div>
  );
}
