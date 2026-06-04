import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { createSession, getCurrentUser } from "@/lib/auth";
import Link from "next/link";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function loginAction(formData: FormData) {
  "use server";
  const parsed = LoginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return redirect(`/login?error=${encodeURIComponent("Vul e-mail en wachtwoord in")}`);
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user) {
    return redirect(`/login?error=${encodeURIComponent("E-mail of wachtwoord onjuist")}`);
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return redirect(`/login?error=${encodeURIComponent("E-mail of wachtwoord onjuist")}`);
  }
  await createSession(user.id);
  redirect("/wedstrijden");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/wedstrijden");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Inloggen</h1>
        {sp.error && (
          <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</div>
        )}
        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">E-mail</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Wachtwoord</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-oranje px-4 py-2 font-medium text-white hover:bg-oranje-600"
          >
            Inloggen
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Nog geen account?{" "}
          <Link href="/signup" className="text-oranje-600 hover:underline">
            Maak er een aan
          </Link>
        </p>
      </div>
    </div>
  );
}
