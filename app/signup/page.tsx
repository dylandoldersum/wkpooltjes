import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { createSession, getCurrentUser } from "@/lib/auth";
import Link from "next/link";

const SignupSchema = z.object({
  name: z.string().min(2, "Minimaal 2 tekens").max(60),
  email: z.string().email("Geen geldig e-mailadres"),
  password: z.string().min(8, "Minimaal 8 tekens").max(128),
});

async function signupAction(formData: FormData) {
  "use server";
  const parsed = SignupSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return redirect(`/signup?error=${encodeURIComponent(parsed.error.errors[0].message)}`);
  }
  const { name, email, password } = parsed.data;

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing.length > 0) {
    return redirect(`/signup?error=${encodeURIComponent("E-mail is al in gebruik")}`);
  }
  const hash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(schema.users)
    .values({ name, email, passwordHash: hash })
    .returning();
  await createSession(created.id);
  redirect("/wedstrijden");
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/wedstrijden");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Meedoen</h1>
        <p className="mt-1 text-sm text-slate-600">Maak een account om te kunnen voorspellen.</p>
        {sp.error && (
          <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</div>
        )}
        <form action={signupAction} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Naam</label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje"
              placeholder="Jan Jansen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">E-mail</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje"
              placeholder="jan@kantoor.nl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Wachtwoord</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje"
              placeholder="Minimaal 8 tekens"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-oranje px-4 py-2 font-medium text-white hover:bg-oranje-600"
          >
            Account aanmaken
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Al een account?{" "}
          <Link href="/login" className="text-oranje-600 hover:underline">
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
