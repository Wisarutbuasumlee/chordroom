import { runIndex } from "@/lib/server/indexer";
import { jsonError } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const maxDuration = 60;

/** Vercel Cron เรียกวันละครั้ง: เก็บเพลงใหม่ที่ยังไม่อยู่ใน index ทีละน้อย */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonError("unauthorized", 401);
  }
  const reports = await runIndex({
    store: getStore(),
    maxPagesPerSource: 150,
    timeBudgetMs: 50_000,
  });
  return Response.json({ reports });
}
