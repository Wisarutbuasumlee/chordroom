import type { SourceId } from "./types";

export interface SourceInfo {
  id: SourceId;
  label: string;
  host: string;
  home: string;
  /** index ครบจาก sitemap ไหม (dochord ปิดกั้นบอต มีแค่บางส่วนจาก Common Crawl + Brave จึงยังค้นผ่านหน้าเว็บของเขาได้) */
  indexed: boolean;
}

export const SOURCES: SourceInfo[] = [
  { id: "dochord", label: "dochord", host: "dochord.com", home: "https://www.dochord.com/", indexed: false },
  { id: "chordzaa", label: "chordzaa", host: "chordzaa.com", home: "https://www.chordzaa.com/", indexed: true },
  { id: "chordtabs", label: "chordtabs", host: "chordtabs.in.th", home: "https://chordtabs.in.th/", indexed: true },
];

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<SourceId, SourceInfo>;

export function isSourceId(v: unknown): v is SourceId {
  return v === "dochord" || v === "chordzaa" || v === "chordtabs";
}

/** หน้าเพลงของทั้ง 3 เว็บเป็นเลขหน้าล้วน เช่น /15536/ */
const SONG_PATH = /^\/(\d{1,9})\/?$/;

/**
 * ยอมรับเฉพาะลิงก์หน้าเพลงของ 3 เว็บนี้ · ทุกคนในห้องจะถูกพาไปที่ลิงก์นี้
 * จึงไม่รับเว็บอื่น ซับโดเมนอื่น หรือหน้าอื่นของเว็บเดียวกัน (หน้าค้นหา ?s=ข้อความ, หน้าล็อกอิน ฯลฯ)
 * และสร้างลิงก์ใหม่จากเลขหน้า (ตัด query/hash ทิ้ง) ให้ตรงกับลิงก์ใน index
 */
export function sourceFromUrl(raw: string): { source: SourceId; url: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const match = SOURCES.find((s) => host === s.host);
  const page = u.pathname.match(SONG_PATH)?.[1];
  if (!match || !page) return null;
  return { source: match.id, url: new URL(`/${page}/`, match.home).toString() };
}

/** หน้าค้นหาของ dochord (WordPress) · index ของเรามีเพลง dochord ไม่ครบ ให้ผู้ใช้ค้นบนเว็บเขาเองได้ */
export function dochordSearchUrl(q: string): string {
  return `https://www.dochord.com/?s=${encodeURIComponent(q.trim())}`;
}
