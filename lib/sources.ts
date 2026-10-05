import type { SourceId } from "./types";

export interface SourceInfo {
  id: SourceId;
  label: string;
  host: string;
  home: string;
  /** อยู่ใน index ค้นหาของเราไหม (dochord ปิดกั้นบอต จึงค้นผ่านหน้าเว็บของเขาแทน) */
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

/**
 * ยอมรับเฉพาะลิงก์ https ของ 3 เว็บนี้ · ทุกคนในห้องจะถูกพาไปที่ลิงก์นี้
 * จึงต้องไม่ปล่อยให้ใครส่งลิงก์เว็บอื่นเข้ามาในห้อง
 */
export function sourceFromUrl(raw: string): { source: SourceId; url: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const match = SOURCES.find((s) => host === s.host || host.endsWith("." + s.host));
  if (!match) return null;
  u.protocol = "https:";
  u.hash = "";
  return { source: match.id, url: u.toString() };
}

/** หน้าค้นหาของ dochord (WordPress) · เราไม่ได้ทำ index ของเว็บนี้ ให้ผู้ใช้ค้นบนเว็บเขาเอง */
export function dochordSearchUrl(q: string): string {
  return `https://www.dochord.com/?s=${encodeURIComponent(q.trim())}`;
}
