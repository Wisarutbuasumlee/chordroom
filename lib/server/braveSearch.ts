import type { NewSong } from "./store";
import { decodeEntities, parseTitle } from "./titles";

/**
 * ค้นเพลง dochord ผ่าน Brave Search API (`site:dochord.com`)
 * dochord ปิดทางเก็บ index จากบอต เราจึงค้นผ่าน search engine แทน และเก็บผลไว้ใน songs
 * เปิดใช้เมื่อตั้ง BRAVE_SEARCH_API_KEY · โควตาต่อเดือนตั้งด้วย BRAVE_MONTHLY_LIMIT (ค่าเริ่ม 900)
 */
export function braveEnabled(): boolean {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY);
}

export function braveMonthlyLimit(): number {
  const n = Number(process.env.BRAVE_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 900;
}

interface BraveResult {
  title?: string;
  url?: string;
}

const DOCHORD_SONG = /^https:\/\/(www\.)?dochord\.com\/(\d+)\/?$/;

/** เก็บเฉพาะหน้าเพลงของ dochord (เลขหน้า) แล้วแยกชื่อเพลงจากหัวข้อ */
export function parseBraveResults(json: unknown): NewSong[] {
  const results = (json as { web?: { results?: BraveResult[] } })?.web?.results ?? [];
  const songs = new Map<string, NewSong>();
  for (const r of results) {
    const m = r.url?.match(DOCHORD_SONG);
    if (!m || !r.title) continue;
    const url = `https://www.dochord.com/${m[2]}/`;
    const parsed = parseTitle("dochord", decodeEntities(r.title.replace(/<[^>]+>/g, "")));
    if (parsed && !songs.has(url)) songs.set(url, { ...parsed, source: "dochord", url });
  }
  return [...songs.values()];
}

export async function braveSearchDochord(q: string): Promise<NewSong[] | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({ q: `${q} คอร์ด site:dochord.com`, count: "20" });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { accept: "application/json", "x-subscription-token": key },
      signal: ctrl.signal,
    });
    if (!res.ok) return null; // 401 key ผิด · 429 ถี่เกิน/หมดโควตา → ใช้ผลที่เคยเก็บไว้แทน
    return parseBraveResults(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
