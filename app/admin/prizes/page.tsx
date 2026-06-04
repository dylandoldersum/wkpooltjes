import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPrizesText, parsePrizes } from "@/lib/prizes";
import { PrizesForm } from "./PrizesForm";

export default async function AdminPrizes() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  const text = await getPrizesText();
  const preview = parsePrizes(text);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin · Prijzen</h1>
        <p className="text-sm text-slate-600">
          Eén prijs per regel. Format: <code className="rounded bg-slate-100 px-1">emoji beschrijving</code>.
          Verschijnt op de homepage.
        </p>
      </div>

      <PrizesForm initial={text} />

      {preview.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-oranje-50 via-white to-oranje-50 p-5 shadow-sm ring-1 ring-oranje-100">
          <div className="mb-3 text-sm font-semibold text-slate-600">Preview</div>
          <ul className="space-y-2">
            {preview.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-lg leading-6">{p.emoji}</span>
                <span className="text-slate-700">{p.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
