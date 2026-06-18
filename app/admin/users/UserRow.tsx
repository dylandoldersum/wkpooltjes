"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteUser, toggleAdmin } from "./actions";

type Props = {
  user: {
    id: number;
    name: string;
    email: string;
    isAdmin: boolean;
    createdAt: string;
  };
  isSelf: boolean;
  stats: { predictions: number; bonus: number; bracket: number };
};

export function UserRow({ user, isSelf, stats }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteUser({ userId: user.id });
      if (!res.ok) setError(res.error ?? "Onbekende fout");
      // Bij success laadt de page opnieuw (revalidatePath in action)
    });
  }

  function handleToggleAdmin() {
    setError(null);
    startTransition(async () => {
      const res = await toggleAdmin({ userId: user.id, makeAdmin: !isAdmin });
      if (res.ok) setIsAdmin(!isAdmin);
      else setError(res.error ?? "Onbekende fout");
    });
  }

  const created = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
  }).format(new Date(user.createdAt));

  return (
    <tr className="border-b border-slate-50">
      <td className="px-4 py-2 font-medium">
        {user.name}
        {isSelf && <span className="ml-2 text-xs text-oranje-700">(jij)</span>}
      </td>
      <td className="px-4 py-2 text-slate-600">{user.email}</td>
      <td className="px-4 py-2 text-center">
        {isAdmin ? (
          <span className="rounded bg-oranje-50 px-1.5 py-0.5 text-xs font-medium text-oranje-700">
            admin
          </span>
        ) : (
          <span className="text-xs text-slate-400">user</span>
        )}
      </td>
      <td className="px-4 py-2 text-right text-slate-600">{stats.predictions}</td>
      <td className="px-4 py-2 text-right text-slate-600">{stats.bonus}</td>
      <td className="px-4 py-2 text-right text-slate-600">{stats.bracket}</td>
      <td className="px-4 py-2 text-right text-xs text-slate-400">{created}</td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/predictions/${user.id}`}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            title="Voorspellingen bewerken (omzeilt lock)"
          >
            ✎ Picks
          </Link>
          {!isSelf && (
            <button
              onClick={handleToggleAdmin}
              disabled={pending}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              title={isAdmin ? "Demote tot user" : "Promote tot admin"}
            >
              {isAdmin ? "↓ user" : "↑ admin"}
            </button>
          )}
          {!isSelf && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Verwijder
            </button>
          )}
          {!isSelf && confirming && (
            <>
              <button
                onClick={handleDelete}
                disabled={pending}
                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Bezig…" : "Definitief"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                annuleer
              </button>
            </>
          )}
          {isSelf && <span className="text-xs text-slate-300">—</span>}
        </div>
        {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </td>
    </tr>
  );
}
