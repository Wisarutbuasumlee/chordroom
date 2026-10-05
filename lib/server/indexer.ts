import type { SourceId } from "../types";
import type { NewSong, Store } from "./store";
import { fetchPageTitle, parseTitle, USER_AGENT } from "./titles";

/**
 * เก็บ index ชื่อเพลง ศิลปิน ลิงก์ จาก sitemap ของเว็บที่อนุญาต
 * - เช็ก robots.txt ก่อนทุกครั้ง และอ่าน sitemap จาก robots.txt
 * - อ่านแค่ <title> ของหน้าเพลง ไม่เก็บเนื้อคอร์ด
 * - ทีละน้อย ช้าๆ และทำต่อจากที่ค้างไว้ได้ (ข้ามลิงก์ที่มีใน index แล้ว)
 * dochord ไม่อยู่ในนี้: เว็บปิด sitemap/REST/feed จากบอตไว้ จึงไม่เก็บ
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
    return body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
  skippedReason?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const reports: IndexReport[] = [];

  for (const source of sources) {
    const cfg = INDEXED_SOURCES[source];
    const report: IndexReport = { source, sitemapSongs: 0, alreadyIndexed: 0, fetched: 0, saved: 0, remaining: 0 };
    reports.push(report);
    if (!cfg) {
      report.skippedReason = "ไม่ได้เปิดให้เก็บ index เว็บนี้";
      continue;
    }

    const robotsTxt = await fetchText(`${cfg.origin}/robots.txt`);
    if (robotsTxt === null) {
      report.skippedReason = "อ่าน robots.txt ไม่ได้ จึงไม่เก็บ";
      continue;
    }
    const robots = parseRobots(robotsTxt);
    if (!allowed(robots, "/")) {
      report.skippedReason = "robots.txt ไม่อนุญาต";
      continue;
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
    const pending = songUrls
      .filter((u) => !known.has(u))
      // เลขหน้าใหม่กว่าก่อน = เพลงใหม่ได้เข้า index ก่อน
      .sort((a, b) => Number(b.match(/(\d+)\/$/)?.[1] ?? 0) - Number(a.match(/(\d+)\/$/)?.[1] ?? 0));
    report.alreadyIndexed = songUrls.length - pending.length;
    log(`${source}: ${songUrls.length} เพลงใน sitemap · ยังไม่มีใน index ${pending.length}`);

    const queue = pending.slice(0, maxPagesPerSource);
    const batch: NewSong[] = [];
    const flush = async () => {
      if (!batch.length) return;
      report.saved += await store.upsertSongs(batch.splice(0));
    };

    const worker = async () => {
      while (queue.length && Date.now() < deadline) {
        const url = queue.shift()!;
        const raw = await fetchPageTitle(url);
        report.fetched++;
        const parsed = raw ? parseTitle(source, raw) : null;
        if (parsed) batch.push({ ...parsed, source, url });
        if (batch.length >= 50) await flush();
        await sleep(delayMs);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    await flush();
    report.remaining = pending.length - report.fetched;
    log(`${source}: อ่าน ${report.fetched} หน้า · บันทึก ${report.saved} · เหลือ ${report.remaining}`);
    if (Date.now() >= deadline) break;
  }
  return reports;
}
