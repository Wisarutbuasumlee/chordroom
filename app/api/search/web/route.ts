import type { NextRequest } from "next/server";
import { normalize } from "@/lib/normalize";
import { braveEnabled, braveMonthlyLimit, braveSearchDochord } from "@/lib/server/braveSearch";
import { getStore } from "@/lib/server/store";
import type { SearchHit, SongRow } from "@/lib/types";

/**
 * ค้นเพลง dochord ผ่าน search engine (ไคลเอนต์เรียกหลังพิมพ์หยุด ~1 วินาที แยกจากการค้นใน index)
 * คำที่เคยค้นใน 30 วัน หรือโควตาเดือนนี้หมด → ไม่ถาม Brave ใช้ผลที่เคยเก็บไว้ใน songs แทน
 */
export async function GET(req: NextRequest) {
  if (!braveEnabled()) return Response.json({ enabled: false, hits: [] });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const nq = normalize(q);
  if (nq.length < 2) return Response.json({ enabled: true, hits: [] });

  const store = getStore();
  let rows: SongRow[] = [];
  if (await store.takeWebSearch(nq, braveMonthlyLimit())) {
    const found = await braveSearchDochord(q);
    if (found === null) await store.forgetWebSearch(nq);
    if (found?.length) {
      await store.upsertSongs(found);
      const byUrl = new Map((await store.songsByUrls(found.map((f) => f.url))).map((r) => [r.url, r]));
      // เรียงตามลำดับที่ search engine ให้มา
      rows = found.map((f) => byUrl.get(f.url)).filter((r): r is SongRow => !!r);
    }
  }
  if (!rows.length) rows = await store.searchSongs(q, "dochord", 20);

  const hits: SearchHit[] = rows.map((r) => ({
    key: `dochord:${r.id}`,
    title: r.title,
    artist: r.artist,
    sources: [{ source: "dochord", url: r.url, songId: r.id }],
  }));
  return Response.json({ enabled: true, hits }, { headers: { "cache-control": "no-store" } });
}
