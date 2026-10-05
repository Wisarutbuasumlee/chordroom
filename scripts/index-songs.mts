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
 */
import { getStore } from "../lib/server/store";
import { runIndex } from "../lib/server/indexer";
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
