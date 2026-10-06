import type { SourceId } from "../types";
import type { NewSong, Store } from "./store";
import { fetchPageTitle, parseTitle, USER_AGENT } from "./titles";

/**
 * เก็บ index ชื่อเพลง ศิลปิน ลิงก์ จาก sitemap ของเว็บที่อนุญาต
 * - เช็ก robots.txt ก่อนทุกครั้ง และอ่าน sitemap จาก robots.txt
 * - อ่านแค่ <title> ของหน้าเพลง ไม่เก็บเนื้อคอร์ด
 * - ทีละน้อย ช้าๆ และทำต่อจากที่ค้างไว้ได้ (ข้ามลิงก์ที่มีใน index แล้ว)
 * dochord ไม่อยู่ในนี้: เว็บปิด sitemap/REST/feed จากบอตไว้ จึงเก็บจากสำเนาใน Common Crawl แทน (commonCrawl.ts)
 */
interface SourceConfig {
  origin: string;
  /** ลิงก์หน้าเพลงจริง (ไม่ใช่หมวด/ศิลปิน) */
  songPath: RegExp;
}

export const INDEXED_SOURCES: Partial<Record<SourceId, SourceConfig>> = {
  chordzaa: { origin: "https://www.chordzaa.com", songPath: /^\/\d+\/$/ },
  chordtabs: { origin: "https://chordtabs.in.th", songPath: /^\/\d+\/$/ },
};

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

interface Robots {
  disallow: string[];
  sitemaps: string[];
}

export function parseRobots(txt: string): Robots {
  const disallow: string[] = [];
  const sitemaps: string[] = [];
  let inStar = false;
  let lastWasAgent = false;
  for (const line of txt.split(/\r?\n/)) {
    const m = line.replace(/#.*/, "").match(/^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2];
    if (key === "sitemap") sitemaps.push(val);
    else if (key === "user-agent") {
      inStar = lastWasAgent ? inStar || val === "*" : val === "*";
      lastWasAgent = true;
      continue;
    } else if (key === "disallow" && inStar && val) disallow.push(val);
    lastWasAgent = false;
  }
  return { disallow, sitemaps };
}

function allowed(robots: Robots, pathname: string): boolean {
  return !robots.disallow.some((d) => pathname.startsWith(d));
}

async function sitemapUrls(url: string, depth = 0): Promise<string[]> {
  const body = await fetchText(url);
  if (!body) return [];
  if (!body.trimStart().startsWith("<")) {
    return body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }
  const locs = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (/<sitemapindex/i.test(body) && depth < 2) {
    const nested = await Promise.all(locs.map((l) => sitemapUrls(l, depth + 1)));
    return nested.flat();
  }
  return locs;
}

export interface IndexOptions {
  store: Store;
  sources?: SourceId[];
  /** จำนวนหน้าเพลงสูงสุดต่อเว็บในรอบนี้ */
  maxPagesPerSource?: number;
  /** หยุดเมื่อใช้เวลาเกินนี้ (สำหรับ cron ที่มีเวลาจำกัด) */
  timeBudgetMs?: number;
  concurrency?: number;
  delayMs?: number;
  log?: (msg: string) => void;
}

export interface IndexReport {
  source: SourceId;
  sitemapSongs: number;
  alreadyIndexed: number;
  fetched: number;
  saved: number;
  remaining: number;
  /** อ่านได้แต่ไม่ใช่หน้าเพลง (บันทึกไว้ไม่ดึงซ้ำ) */
  skipped: number;
  /** ดึงไม่สำเร็จ รอบหน้าลองใหม่ */
  failed: number;
  skippedReason?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Plan {
  source: SourceId;
  report: IndexReport;
  pending: string[];
}

/** อ่าน robots.txt + sitemap ของเว็บหนึ่ง แล้วคืนรายการหน้าเพลงที่ยังไม่มีใน index (ใหม่สุดก่อน) */
async function planSource(store: Store, source: SourceId, log: (m: string) => void): Promise<Plan> {
  const report: IndexReport = {
    source,
    sitemapSongs: 0,
    alreadyIndexed: 0,
    fetched: 0,
    saved: 0,
    remaining: 0,
    skipped: 0,
    failed: 0,
  };
  const plan: Plan = { source, report, pending: [] };
  const cfg = INDEXED_SOURCES[source];
  if (!cfg) {
    report.skippedReason = "ไม่ได้เปิดให้เก็บ index เว็บนี้";
    return plan;
  }

  const robotsTxt = await fetchText(`${cfg.origin}/robots.txt`);
  if (robotsTxt === null) {
    report.skippedReason = "อ่าน robots.txt ไม่ได้ จึงไม่เก็บ";
    return plan;
  }
  const robots = parseRobots(robotsTxt);
  if (!allowed(robots, "/")) {
    report.skippedReason = "robots.txt ไม่อนุญาต";
    return plan;
  }

  const all = (await Promise.all(robots.sitemaps.map((s) => sitemapUrls(s)))).flat();
  const songUrls = [
    ...new Set(
      all.filter((u) => {
        try {
          const p = new URL(u);
          return p.origin === cfg.origin && cfg.songPath.test(p.pathname) && allowed(robots, p.pathname);
        } catch {
          return false;
        }
      }),
    ),
  ];
  report.sitemapSongs = songUrls.length;

  const known = await store.knownUrls(source);
  plan.pending = songUrls
    .filter((u) => !known.has(u))
    // เรียงเลขหน้าใหม่สุดไปเก่าสุด (worker หยิบจากทั้งสองหัว)
    .sort((a, b) => Number(b.match(/(\d+)\/$/)?.[1] ?? 0) - Number(a.match(/(\d+)\/$/)?.[1] ?? 0));
  report.alreadyIndexed = songUrls.length - plan.pending.length;
  log(`${source}: ${songUrls.length} เพลงใน sitemap · ยังไม่มีใน index ${plan.pending.length}`);
  return plan;
}

/**
 * เก็บทุกเว็บไปพร้อมกัน (ไม่ต้องรอเว็บแรกเสร็จ) · concurrency และ delayMs นับต่อเว็บ
 * แต่ละเว็บจึงโดนเรียกช้าเท่าเดิม แค่ไม่ต้องรอคิวกัน
 */
export async function runIndex(opts: IndexOptions): Promise<IndexReport[]> {
  const {
    store,
    sources = Object.keys(INDEXED_SOURCES) as SourceId[],
    maxPagesPerSource = 200,
    timeBudgetMs = Infinity,
    concurrency = 2,
    delayMs = 500,
    log = () => {},
  } = opts;
  const deadline = Date.now() + timeBudgetMs;

  const plans: Plan[] = [];
  for (const source of sources) plans.push(await planSource(store, source, log));

  await Promise.all(
    plans.map(async ({ source, report, pending }) => {
      if (report.skippedReason) return;
      // จำกัดจำนวนหน้า: เอาครึ่งหนึ่งจากฝั่งเพลงใหม่ อีกครึ่งจากฝั่งเพลงเก่า
      const half = Math.ceil(maxPagesPerSource / 2);
      const queue =
        pending.length <= maxPagesPerSource
          ? [...pending]
          : [...pending.slice(0, half), ...pending.slice(pending.length - (maxPagesPerSource - half))];
      const batch: NewSong[] = [];
      const skips: { url: string; source: SourceId; reason: string }[] = [];
      const flush = async () => {
        if (batch.length) report.saved += await store.upsertSongs(batch.splice(0));
        if (skips.length) await store.markSkipped(skips.splice(0));
      };
      // ตัวเลขคู่เก็บจากเพลงใหม่สุด ตัวเลขคี่เก็บจากเพลงเก่าสุด (เพลงคลาสสิกที่วงเล่นบ่อยจะได้ไม่ต้องรอนาน)
      const worker = async (i: number) => {
        while (queue.length && Date.now() < deadline) {
          const url = (i % 2 === 0 ? queue.shift() : queue.pop())!;
          const raw = await fetchPageTitle(url);
          report.fetched++;
          const parsed = raw ? parseTitle(source, raw) : null;
          if (parsed) batch.push({ ...parsed, source, url });
          // อ่านได้แต่ไม่ใช่หน้าเพลง → จำไว้ไม่ดึงซ้ำ · ดึงไม่ได้ (เน็ต/เว็บล่ม) → รอบหน้าลองใหม่
          else if (raw) {
            skips.push({ url, source, reason: "not-a-song-page" });
            report.skipped++;
          } else report.failed++;
          if (batch.length + skips.length >= 50) await flush();
          await sleep(delayMs);
        }
      };
      await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
      await flush();
      report.remaining = pending.length - report.fetched;
      log(
        `${source}: อ่าน ${report.fetched} หน้า · บันทึก ${report.saved} · ไม่ใช่หน้าเพลง ${report.skipped} · ดึงไม่ได้ ${report.failed} · เหลือ ${report.remaining}`,
      );
    }),
  );
  return plans.map((p) => p.report);
}
