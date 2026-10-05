import type { NextRequest } from "next/server";
import { songKey } from "@/lib/normalize";
import { isSourceId } from "@/lib/sources";
import { getStore } from "@/lib/server/store";
import type { SearchHit } from "@/lib/types";

/** ค้นจาก index แล้วรวมเพลงเดียวกันจากหลายเว็บเป็นแถวเดียว */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const src = req.nextUrl.searchParams.get("source");
  if (!q) return Response.json({ hits: [] });

  const rows = await getStore().searchSongs(q, isSourceId(src) ? src : null, 60);
  const groups = new Map<string, SearchHit>();
  for (const r of rows) {
    if (!isSourceId(r.source)) continue;
    const key = songKey(r.title, r.artist);
    let hit = groups.get(key);
    if (!hit) {
      hit = { key, title: r.title, artist: r.artist, sources: [] };
      groups.set(key, hit);
    }
    if (!hit.sources.some((s) => s.source === r.source)) {
      hit.sources.push({ source: r.source, url: r.url, songId: r.id });
    }
  }
  return Response.json({ hits: [...groups.values()].slice(0, 25) });
}
