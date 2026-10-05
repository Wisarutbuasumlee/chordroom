/**
 * เก็บ index ชื่อเพลงจากเครื่องตัวเอง (ครั้งแรกมีหลายหมื่นหน้า ใช้สคริปต์นี้แทน cron)
 *
 *   npm run index                       ทุกเว็บ เว็บละ 200 หน้า
 *   npm run index -- --max 5000         เว็บละ 5000 หน้า
 *   npm run index -- --source chordtabs --max 0   (0 = ทั้งหมด)
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
const sourceArg = flag("source");
if (sourceArg && !isSourceId(sourceArg)) {
  console.error(`ไม่รู้จักเว็บ ${sourceArg}`);
  process.exit(1);
}

const store = getStore();
console.log(`เขียน index ลง: ${store.kind === "supabase" ? "Supabase" : "data/songs.local.json"}`);

const reports = await runIndex({
  store,
  sources: sourceArg ? [sourceArg as SourceId] : undefined,
  maxPagesPerSource: max > 0 ? max : Infinity,
  log: (m) => console.log(m),
});
console.table(reports);
