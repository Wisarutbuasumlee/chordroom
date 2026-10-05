/**
 * เก็บ index ชื่อเพลงจากเครื่องตัวเอง (ครั้งแรกมีหลายหมื่นหน้า ใช้สคริปต์นี้แทน cron)
 *
 *   npm run index                       ทุกเว็บ เว็บละ 200 หน้า
 *   npm run index -- --max 5000         เว็บละ 5000 หน้า
 *   npm run index -- --source chordtabs --max 0   (0 = ทั้งหมด)
 *   npm run index -- --max 0 --minutes 330        หยุดเองเมื่อครบ 330 นาที (ใช้ใน GitHub Actions)
 *   npm run index -- --concurrency 3 --delay 400  จำนวนการเชื่อมต่อต่อเว็บ / พักกี่มิลลิวินาทีต่อหน้า
 *
 * มี SUPABASE ใน .env.local → เขียนลง Supabase · ไม่มี → data/songs.local.json
 * หยุดกลางทางได้ รอบหน้าจะทำต่อจากที่ค้าง
 * รันครบทุกเว็บ (ไม่ใส่ --source, --max 0) แล้วไม่มีหน้าค้าง → แจ้งเข้า Discord ครั้งเดียว (DISCORD_WEBHOOK_URL)
 */
import { getStore } from "../lib/server/store";
import { runIndex } from "../lib/server/indexer";
import { notifyDiscord } from "../lib/server/notify";
import { isSourceId } from "../lib/sources";
import type { SourceId } from "../lib/types";

try {
  process.loadEnvFile(".env.local");
} catch {}

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const max = Number(flag("max") ?? 200);
const minutes = Number(flag("minutes") ?? 0);
const concurrency = Number(flag("concurrency") ?? 2);
const delayMs = Number(flag("delay") ?? 500);
const sourceArg = flag("source");
if (sourceArg && !isSourceId(sourceArg)) {
  console.error(`ไม่รู้จักเว็บ ${sourceArg}`);
  process.exit(1);
}

const store = getStore();
if (process.env.GITHUB_ACTIONS && store.kind !== "supabase") {
  console.error("ไม่พบ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ใน GitHub secrets");
  process.exit(1);
}
console.log(`เขียน index ลง: ${store.kind === "supabase" ? "Supabase" : "data/songs.local.json"}`);

const reports = await runIndex({
  store,
  sources: sourceArg ? [sourceArg as SourceId] : undefined,
  maxPagesPerSource: max > 0 ? max : Infinity,
  timeBudgetMs: minutes > 0 ? minutes * 60_000 : Infinity,
  concurrency: concurrency > 0 ? Math.min(concurrency, 4) : 2,
  delayMs: delayMs >= 200 ? delayMs : 500,
  log: (m) => console.log(m),
});
console.table(reports);

// index ครบ (ทุกเว็บอ่านหน้าที่ค้างจนหมด) → แจ้งเตือนครั้งเดียว จำไว้ใน app_state
// จำเฉพาะตอนส่งสำเร็จ: ถ้าตอนครบยังไม่ได้ตั้ง webhook (หรือส่งไม่ผ่าน) รอบหน้าจะส่งให้
const COMPLETE_KEY = "index_complete_notified";
const fullRun = !sourceArg && max <= 0;
const complete = reports.every((r) => !r.skippedReason && r.remaining === 0);
if (fullRun && complete && !(await store.getState(COMPLETE_KEY))) {
  const lines = await Promise.all(
    reports.map(async (r) => {
      const n = (await store.countSongs(r.source)).toLocaleString("th-TH");
      return `• ${r.source}: ${n} เพลง${r.failed ? ` (ยังดึงไม่ได้ ${r.failed} หน้า จะลองใหม่รอบหน้า)` : ""}`;
    }),
  );
  const sent = await notifyDiscord(
    ["✅ **index เพลงของ ChordRoom ครบแล้ว**", ...lines, "ต่อจากนี้แต่ละชั่วโมงจะเช็กแค่เพลงใหม่"].join("\n"),
  );
  if (sent) await store.setState(COMPLETE_KEY, { at: new Date().toISOString() });
  console.log(
    sent
      ? "แจ้งเข้า Discord แล้ว"
      : "index ครบแล้ว แต่ยังส่ง Discord ไม่ได้ (ไม่ได้ตั้ง DISCORD_WEBHOOK_URL?) รอบหน้าจะลองใหม่",
  );
}
