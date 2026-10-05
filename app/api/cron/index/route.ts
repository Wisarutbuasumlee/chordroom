import { checkEmbedsAndAlert, checkFreshnessAndAlert } from "@/lib/server/health";
import { jsonError } from "@/lib/server/http";
import { runIndex } from "@/lib/server/indexer";
import { getStore } from "@/lib/server/store";

export const maxDuration = 60;

/**
 * Vercel Cron เรียกวันละครั้ง
 * 1. ตรวจสุขภาพ (แจ้ง Discord ถ้าตั้ง DISCORD_WEBHOOK_URL ใน Vercel):
 *    - เว็บคอร์ดเริ่มไม่ยอมให้ฝังหน้า (หน้าคอร์ดในห้องจะว่าง)
 *    - GitHub Actions ไม่ได้เก็บ index / ไม่มีเพลงใหม่ เกิน 3 วัน
 * 2. เก็บเพลงใหม่ที่ยังไม่อยู่ใน index ทีละน้อย (ตัวสำรองของ GitHub Actions)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonError("unauthorized", 401);
  }
  const store = getStore();
  const started = Date.now();
  const embeds = await checkEmbedsAndAlert(store).catch((e) => ({ error: String(e) }));
  const freshness = await checkFreshnessAndAlert(store).catch((e) => ({ error: String(e) }));
  const reports = await runIndex({
    store,
    maxPagesPerSource: 150,
    // เหลือเวลาไว้ให้ปิดงานก่อนครบ 60 วินาที
    timeBudgetMs: Math.max(10_000, 50_000 - (Date.now() - started)),
  });
  return Response.json({ embeds, freshness, reports });
}
