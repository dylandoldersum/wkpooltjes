import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { TopProgressBar } from "@/components/TopProgressBar";
import { Nav } from "@/components/Nav";

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
        <header className="relative bg-gradient-to-r from-oranje-600 to-oranje-500 text-white shadow">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-base font-bold tracking-tight sm:text-lg">
              🏆 <span className="hidden sm:inline">WK Pooltjes 2026</span>
              <span className="sm:hidden">WK Pool</span>
            </Link>
            <Nav user={user ? { name: user.name, isAdmin: user.isAdmin } : null} />
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-center text-xs text-slate-500">
          WK 2026 · Canada · Mexico · VS · {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
