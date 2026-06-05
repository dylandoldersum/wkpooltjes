import type { TeamStanding } from "@/lib/standings";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

type Team = { id: number; name: string; flag: string };
type Props = {
  standings: Map<string, TeamStanding[]>;
  teamById: Map<number, Team>;
  matchesPerGroup: Map<string, { total: number; predicted: number }>;
};

export function StandingsSidebar({ standings, teamById, matchesPerGroup }: Props) {
  return (
    <div className="space-y-2">
      <div>
        <h2 className="font-semibold text-slate-800">Voorspelde poulestanden</h2>
        <p className="text-xs text-slate-500">
          Op basis van jouw wedstrijdvoorspellingen
        </p>
      </div>

      <div className="space-y-2">
        {GROUPS.map((g) => {
          const std = standings.get(g);
          const progress = matchesPerGroup.get(g) ?? { total: 6, predicted: 0 };
          return (
            <div key={g} className="rounded-lg bg-white p-2.5 shadow-sm">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-700">Poule {g}</span>
                <span className="text-[10px] text-slate-400">
                  {progress.predicted}/{progress.total}
                </span>
              </div>
              {std && std.length === 4 ? (
                <table className="w-full text-[11px]">
                  <tbody>
                    {std.map((s, i) => {
                      const team = teamById.get(s.teamId);
                      const isQualifying = i < 2;
                      const isPlayoff = i === 2;
                      return (
                        <tr
                          key={s.teamId}
                          className={
                            isQualifying
                              ? "font-semibold text-slate-800"
                              : isPlayoff
                                ? "text-slate-600"
                                : "text-slate-400"
                          }
                        >
                          <td className="w-3 pr-1 text-right text-slate-400">{i + 1}.</td>
                          <td className="pr-1">
                            <span className="mr-1">{team?.flag}</span>
                            {team?.name}
                          </td>
                          <td className="w-7 text-right text-slate-500">
                            {s.goalsFor}-{s.goalsAgainst}
                          </td>
                          <td className="w-5 text-right">{s.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-[11px] italic text-slate-400">
                  Nog {progress.total - progress.predicted} wedstrijd
                  {progress.total - progress.predicted === 1 ? "" : "en"} in te vullen
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-1 text-[10px] text-slate-400">
        <span className="font-semibold text-slate-700">vetgedrukt</span> = top 2 (door),{" "}
        <span className="text-slate-600">grijs</span> = nr. 3 (kans op best 3rd)
      </div>
    </div>
  );
}
