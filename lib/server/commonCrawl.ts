import { gunzipSync } from "node:zlib";
import type { NewSong, Store } from "./store";
import { decodeEntities, type ParsedTitle, USER_AGENT } from "./titles";

/**
 * เก็บ index ของ dochord จากสำเนาหน้าเว็บใน Common Crawl (คลังเว็บสาธารณะ เก็บใหม่ทุกเดือน)
 * dochord ปิด sitemap/REST/feed และให้ Cloudflare กันบอต จึงไม่ยิงไปที่ dochord เลย
 * - ถาม index ของแต่ละรอบเก็บ (crawl) ว่ามีหน้าเพลง dochord อะไรบ้าง ทีละรอบ ใหม่สุดก่อน
 * - ดึงเฉพาะสำเนาหน้าที่ยังไม่มีใน index ของเรา อ่านแค่ชื่อเพลง/ศิลปิน ไม่เก็บเนื้อคอร์ด
 * - จำรอบที่เก็บครบแล้วไว้ใน app_state รอบหน้าทำต่อ และเก็บรอบใหม่ที่เพิ่งออกเอง
 * ไม่ครบ 100% (Common Crawl ไม่ได้เก็บทุกหน้า) และเพลงใหม่เข้าช้าราว 1 เดือน ส่วนที่ขาด Brave ช่วยเติม
 */
const INDEX_SERVER = "https://index.commoncrawl.org";
const DATA_SERVER = "https://data.commoncrawl.org";
const STATE_KEY = "archive:dochord";
/** ถาม index ของรอบเก็บไหนไม่สำเร็จครบเท่านี้ครั้ง ก็ข้ามไป (บางรอบ server ตอบไม่ไหว) */
const MAX_TRIES = 3;
const DOCHORD_SONG = /^https?:\/\/(?:www\.)?dochord\.com\/(\d+)\/?$/;

interface ArchiveState {
  done: string[];
  tries: Record<string, number>;
}

interface CdxRecord {
  url: string;
  timestamp: string;
  filename: string;
  offset: string;
  length: string;
}

export interface ArchiveReport {
  crawls: number;
  crawlsDone: number;
  fetched: number;
  saved: number;
  skipped: number;
  failed: number;
  /** หมดเวลาก่อนเก็บครบทุกรอบ (ให้รอบถัดไปทำต่อ) */
  timedOut: boolean;
  skippedReason?: string;
}

export interface ArchiveOptions {
  store: Store;
  timeBudgetMs?: number;
  concurrency?: number;
  log?: (msg: string) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** server ของ Common Crawl ตอบ 503/504 บ่อย จึงลองซ้ำแบบเว้นจังหวะ · 404 = รอบนี้ไม่มีหน้านี้ */
async function fetchWithRetry(url: string, init: RequestInit = {}, tries = 4): Promise<Response | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "user-agent": USER_AGENT, ...init.headers },
        signal: AbortSignal.timeout(120_000),
      });
      if (res.ok || res.status === 404) return res;
    } catch {}
    await sleep(4_000 * (i + 1));
  }
  return null;
}

/** เหมือน fetchWithRetry แต่อ่านเนื้อหาให้จบด้วย · server ชอบตัดการเชื่อมต่อกลางคำตอบ (TypeError: terminated) */
async function fetchTextWithRetry(url: string, tries = 4): Promise<{ status: number; text: string } | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(120_000) });
      if (res.ok || res.status === 404) return { status: res.status, text: await res.text() };
    } catch {}
    await sleep(4_000 * (i + 1));
  }
  return null;
}

async function listCrawls(): Promise<string[] | null> {
  const res = await fetchTextWithRetry(`${INDEX_SERVER}/collinfo.json`);
  if (res?.status !== 200) return null;
  try {
    const cols = JSON.parse(res.text) as { id: string }[];
    return cols.map((c) => c.id); // ใหม่สุดก่อน
  } catch {
    return null;
  }
}

/** หน้าเพลง dochord ในรอบเก็บนี้ (เอาสำเนาล่าสุดของแต่ละหน้า) · complete = false ถ้า server ตอบไม่ครบ */
async function crawlSongs(crawl: string): Promise<{ records: Map<string, CdxRecord>; complete: boolean }> {
  const records = new Map<string, CdxRecord>();
  let complete = true;
  for (const host of ["www.dochord.com", "dochord.com"]) {
    const res = await fetchTextWithRetry(`${INDEX_SERVER}/${crawl}-index?url=${host}/*&output=json&filter=status:200`);
    // ถาม index ทีละครั้ง เว้นจังหวะ ตามที่ Common Crawl ขอ
    await sleep(2_000);
    if (!res) {
      complete = false;
      continue;
    }
    if (res.status === 404) continue;
    for (const line of res.text.split("\n")) {
      if (!line.startsWith("{")) continue;
      let r: CdxRecord;
      try {
        r = JSON.parse(line);
      } catch {
        complete = false; // server ตัดคำตอบกลางบรรทัด
        continue;
      }
      const m = r.url.match(DOCHORD_SONG);
      if (!m) continue;
      const url = `https://www.dochord.com/${m[1]}/`;
      const prev = records.get(url);
      if (!prev || prev.timestamp < r.timestamp) records.set(url, r);
    }
  }
  return { records, complete };
}

/** ดึงสำเนาหน้าเดียวจากไฟล์ WARC (ขอเฉพาะช่วงไบต์ของหน้านั้น) */
async function fetchArchivedHtml(r: CdxRecord): Promise<string | null> {
  const start = Number(r.offset);
  const end = start + Number(r.length) - 1;
  const res = await fetchWithRetry(`${DATA_SERVER}/${r.filename}`, { headers: { range: `bytes=${start}-${end}` } }, 3);
  if (!res || res.status !== 206) return null;
  try {
    return new TextDecoder().decode(gunzipSync(Buffer.from(await res.arrayBuffer())));
  } catch {
    return null;
  }
}

/** ชื่อเพลงล้วนจาก breadcrumb (JSON-LD) ของหน้า เช่น "เจ้าสาวที่กลัวฝน" */
function breadcrumbName(html: string): string | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const nodes = (data as { "@graph"?: unknown[] })["@graph"] ?? [data];
    for (const node of nodes as { "@type"?: string; itemListElement?: { item?: { name?: string } }[] }[]) {
      if (node?.["@type"] !== "BreadcrumbList" || !node.itemListElement?.length) continue;
      const name = node.itemListElement[node.itemListElement.length - 1].item?.name;
      if (name) return decodeEntities(name).trim();
    }
  }
  return null;
}

/** breadcrumb ใช้เครื่องหมายแบบพิมพ์ (’ … –) แต่ <title> ใช้แบบธรรมดา (' ... -) จึงทำให้เหมือนกันก่อนเทียบ */
function foldPunctuation(s: string): string {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "คอร์ดเพลง เจ้าสาวที่กลัวฝน เต๋อ เรวัต พุทธินันท์ | dochord.com"
 * ชื่อเพลงกับศิลปินคั่นด้วยช่องว่าง จึงใช้ชื่อเพลงจาก breadcrumb แยก ส่วนที่เหลือคือศิลปิน
 */
export function parseDochordPage(html: string): ParsedTitle | null {
  const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!raw) return null;
  const t = decodeEntities(raw).replace(/\s+/g, " ").trim();
  if (!/^คอร์ดเพลง/.test(t)) return null; // หน้าแรก/หมวด/ศิลปิน ไม่ใช่หน้าเพลง
  const body = foldPunctuation(t.replace(/\s*[|\-–]\s*dochord\.com\s*$/i, "").replace(/^คอร์ดเพลง\s*/, ""));
  if (!body) return null;
  const crumb = breadcrumbName(html);
  const song = crumb && foldPunctuation(crumb);
  if (song && body.startsWith(song)) {
    return { title: song, artist: body.slice(song.length).trim() || null };
  }
  return { title: song || body, artist: null };
}

export async function runDochordArchive(opts: ArchiveOptions): Promise<ArchiveReport> {
  const { store, timeBudgetMs = Infinity, concurrency = 4, log = () => {} } = opts;
  const deadline = Date.now() + timeBudgetMs;
  const report: ArchiveReport = {
    crawls: 0,
    crawlsDone: 0,
    fetched: 0,
    saved: 0,
    skipped: 0,
    failed: 0,
    timedOut: false,
  };

  const crawls = await listCrawls();
  if (!crawls) {
    report.skippedReason = "อ่านรายการรอบเก็บของ Common Crawl ไม่ได้";
    return report;
  }
  const state: ArchiveState = (await store.getState<ArchiveState>(STATE_KEY)) ?? { done: [], tries: {} };
  const done = new Set(state.done);
  report.crawls = crawls.length;
  const todo = crawls.filter((c) => !done.has(c));
  log(`dochord (Common Crawl): ${crawls.length} รอบเก็บ · เก็บแล้ว ${done.size} · เหลือ ${todo.length}`);

  const known = await store.knownUrls("dochord");
  for (const crawl of todo) {
    if (Date.now() >= deadline) {
      report.timedOut = true;
      break;
    }
    const { records, complete } = await crawlSongs(crawl);
    const pending = [...records.entries()].filter(([url]) => !known.has(url));
    let fetched = 0;
    let failed = 0;
    const batch: NewSong[] = [];
    const skips: { url: string; source: "dochord"; reason: string }[] = [];
    const flush = async () => {
      if (batch.length) report.saved += await store.upsertSongs(batch.splice(0));
      if (skips.length) await store.markSkipped(skips.splice(0));
    };
    const worker = async () => {
      while (pending.length && Date.now() < deadline) {
        const [url, rec] = pending.shift()!;
        const html = await fetchArchivedHtml(rec);
        fetched++;
        const parsed = html ? parseDochordPage(html) : null;
        if (parsed) {
          batch.push({ ...parsed, source: "dochord", url });
          known.add(url);
        } else if (html) {
          skips.push({ url, source: "dochord", reason: "not-a-song-page" });
          known.add(url);
          report.skipped++;
        } else failed++;
        if (batch.length + skips.length >= 50) await flush();
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    await flush();
    report.fetched += fetched;
    report.failed += failed;

    if (pending.length) {
      // หมดเวลากลางรอบ: ไม่นับเป็นความพยายาม รอบหน้าทำต่อจากหน้าที่เหลือ
      report.timedOut = true;
      log(`${crawl}: หมดเวลา อ่านไป ${fetched} หน้า เหลือ ${pending.length}`);
      break;
    }
    const tries = (state.tries[crawl] ?? 0) + 1;
    if ((complete && failed === 0) || tries >= MAX_TRIES) {
      done.add(crawl);
      delete state.tries[crawl];
      report.crawlsDone++;
    } else state.tries[crawl] = tries;
    await store.setState(STATE_KEY, { done: [...done], tries: state.tries } satisfies ArchiveState);
    log(
      `${crawl}: ${records.size} หน้าเพลง · ใหม่ ${fetched} · ดึงไม่ได้ ${failed}${complete ? "" : " · index ตอบไม่ครบ"}${done.has(crawl) ? "" : ` (ลองใหม่ครั้งที่ ${tries + 1})`}`,
    );
  }
  log(
    `dochord (Common Crawl): บันทึก ${report.saved} · ไม่ใช่หน้าเพลง ${report.skipped} · ดึงไม่ได้ ${report.failed} · รอบนี้เก็บครบ ${report.crawlsDone} รอบเก็บ`,
  );
  return report;
}
