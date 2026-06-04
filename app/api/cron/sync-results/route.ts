import { NextResponse } from "next/server";
import { syncResultsFromApi } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel cron stuurt automatisch Authorization: Bearer <CRON_SECRET>
  // Externe cron (cron-job.org etc.) moet ook deze header meesturen.
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY ontbreekt" }, { status: 500 });
  }

  try {
    const result = await syncResultsFromApi(apiKey);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
