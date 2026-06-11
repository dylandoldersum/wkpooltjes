"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

const LINKS: NavLink[] = [
  { href: "/wedstrijden", label: "Wedstrijden" },
  { href: "/poules", label: "Poules" },
  { href: "/bonus", label: "Bonusvragen" },
  { href: "/bracket", label: "Bracket" },
  { href: "/ranglijst", label: "Ranglijst" },
];

type Props = {
  user: { name: string; isAdmin: boolean } | null;
};

export function Nav({ user }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Sluit menu automatisch bij navigatie
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="hover:underline">
          Inloggen
        </Link>
        <Link
          href="/signup"
          className="rounded bg-white px-3 py-1 font-medium text-oranje-700 hover:bg-white/90"
        >
          Meedoen
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: horizontaal */}
      <div className="hidden items-center gap-4 text-sm md:flex">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:underline">
            {l.label}
          </Link>
        ))}
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
      </div>

      {/* Mobiel: hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="rounded p-1.5 hover:bg-white/15 md:hidden"
        aria-label="Menu"
        aria-expanded={open}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M6 18L18 6" />
            </>
          ) : (
            <>
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobiel uitklap-menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 bg-oranje-600 shadow-lg md:hidden">
          <div className="mx-auto max-w-7xl space-y-0.5 px-4 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded px-3 py-2.5 text-sm font-medium hover:bg-white/15 ${
                  pathname === l.href ? "bg-white/20" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user.isAdmin && (
              <Link
                href="/admin"
                className={`block rounded px-3 py-2.5 text-sm font-medium hover:bg-white/15 ${
                  pathname.startsWith("/admin") ? "bg-white/20" : ""
                }`}
              >
                Admin
              </Link>
            )}
            <form action="/api/logout" method="post" className="pt-2">
              <button className="block w-full rounded bg-white/15 px-3 py-2.5 text-left text-sm font-medium hover:bg-white/25">
                Uitloggen ({user.name})
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
