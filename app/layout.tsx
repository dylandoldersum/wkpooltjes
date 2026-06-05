import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { TopProgressBar } from "@/components/TopProgressBar";

export const metadata: Metadata = {
  title: "WK Pooltjes 2026",
  description: "Interne WK 2026 pool",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="nl">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <header className="bg-gradient-to-r from-oranje-600 to-oranje-500 text-white shadow">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              🏆 WK Pooltjes 2026
            </Link>
            <div className="flex items-center gap-4 text-sm">
              {user ? (
                <>
                  <Link href="/wedstrijden" className="hover:underline">
                    Wedstrijden
                  </Link>
                  <Link href="/poules" className="hover:underline">
                    Poules
                  </Link>
                  <Link href="/bonus" className="hover:underline">
                    Bonusvragen
                  </Link>
                  <Link href="/bracket" className="hover:underline">
                    Bracket
                  </Link>
                  <Link href="/ranglijst" className="hover:underline">
                    Ranglijst
                  </Link>
                  {user.isAdmin && (
                    <Link href="/admin" className="hover:underline">
                      Admin
                    </Link>
                  )}
                  <form action="/api/logout" method="post" className="inline">
                    <button className="rounded bg-white/15 px-3 py-1 text-xs hover:bg-white/25">
                      Uitloggen ({user.name})
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:underline">
                    Inloggen
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded bg-white px-3 py-1 text-oranje-700 font-medium hover:bg-white/90"
                  >
                    Meedoen
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-center text-xs text-slate-500">
          WK 2026 · Canada · Mexico · VS · {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
