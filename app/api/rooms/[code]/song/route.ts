import { hasLink } from "@/lib/linkText";
import { isSourceId, SOURCE_BY_ID, sourceFromUrl } from "@/lib/sources";
import { cleanText, jsonError, readJson, roomCodeParam } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { fetchPageTitle, parseTitle } from "@/lib/server/titles";
import type { SongPick } from "@/lib/types";

interface Body {
  songId: number;
  url: string;
  title: string;
  artist: string;
  by: string;
}

/** ตั้งเพลงของห้อง: เลือกจากผลค้นหา (songId) หรือวางลิงก์เอง (url) */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/song">) {
  const code = await roomCodeParam(ctx.params);
  if (!code) return jsonError("รหัสห้องไม่ถูกต้อง", 400);
  const body = await readJson<Body>(req);
  const by = cleanText(body.by, 24);
  if (!by) return jsonError("ต้องมีชื่อคนเปลี่ยนเพลง", 400);
  if (hasLink(by)) return jsonError("ชื่อห้ามมีลิงก์หรือชื่อเว็บ", 400);

  const store = getStore();
  let pick: SongPick | null = null;

  if (typeof body.songId === "number" && Number.isInteger(body.songId)) {
    const song = await store.getSong(body.songId);
    if (song && isSourceId(song.source)) {
      pick = { songId: song.id, source: song.source, url: song.url, title: song.title, artist: song.artist };
    }
  }

  if (!pick && typeof body.url === "string") {
    const parsed = sourceFromUrl(body.url);
    if (!parsed) return jsonError("รับเฉพาะลิงก์หน้าเพลงจาก dochord.com, chordzaa.com หรือ chordtabs.in.th", 400);
    // เพลงที่มีใน index ใช้ชื่อจาก index เสมอ ไม่ใช้ชื่อที่ส่งมา
    const [indexed] = await store.songsByUrls([parsed.url]);
    if (indexed && isSourceId(indexed.source)) {
      pick = {
        songId: indexed.id,
        source: indexed.source,
        url: indexed.url,
        title: indexed.title,
        artist: indexed.artist,
      };
    } else {
      let title = cleanText(body.title, 120);
      let artist = cleanText(body.artist, 80);
      if (hasLink(title) || hasLink(artist)) return jsonError("ชื่อเพลงห้ามมีลิงก์หรือชื่อเว็บ", 400);
      if (!title) {
        // ผู้ใช้วางลิงก์เอง: อ่านแค่ชื่อหน้าเพื่อแสดงชื่อเพลง
        const raw = await fetchPageTitle(parsed.url, 6000);
        const t = raw ? parseTitle(parsed.source, raw) : null;
        title = t?.title ?? null;
        artist = artist ?? t?.artist ?? null;
      }
      pick = {
        songId: null,
        source: parsed.source,
        url: parsed.url,
        title: title ?? `เพลงจาก ${SOURCE_BY_ID[parsed.source].host}`,
        artist,
      };
    }
  }

  if (!pick) return jsonError("ไม่พบเพลงนี้", 400);
  const song = await store.setSong(code, pick, by);
  if (!song) return jsonError("ไม่พบห้องนี้", 404);
  return Response.json({ song });
}
