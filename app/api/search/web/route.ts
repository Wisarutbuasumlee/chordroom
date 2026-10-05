import type { NextRequest } from "next/server";
import { normalize } from "@/lib/normalize";
import { braveEnabled, braveMonthlyLimit, braveSearchDochord } from "@/lib/server/braveSearch";
import { getStore } from "@/lib/server/store";
import type { SearchHit, SongRow } from "@/lib/types";

/**
 * ค้นเพลง dochord ผ่าน search engine (ไคลเอนต์เรียกหลังพิมพ์หยุด ~1 วินาที แยกจากการค้นใน index)
 * คำที่เคยค้นใน 30 วัน หรือโควตาเดือนนี้หมด → ไม่ถาม Brave ใช้ผลที่เคยเก็บไว้ใน songs แทน
 * ส่ง quota กลับไปด้วย หน้าเว็บจะแจ้งเมื่อใช้ครบแล้ว
 */
export async function GET(req: NextRequest) {
  if (!braveEnabled()) return Response.json({ enabled: false, hits: [] });

  const store = getStore();
  const limit = braveMonthlyLimit();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const nq = normalize(q);

  let rows: SongRow[] = [];
  if (nq.length >= 2 && (await store.webSearchUsed()) < limit && (await store.takeWebSearch(nq, limit))) {
    const outcome = await braveSearchDochord(q);
    if (outcome.status !== "ok") {
      // ถามไม่สำเร็จ: ให้คำนี้ลองใหม่ได้ · ถ้า Brave บอกว่าโควตาหมด หยุดถามทั้งเดือน
      await store.forgetWebSearch(nq);
      if (outcome.status === "quota") await store.exhaustWebSearch(limit);
    } else if (outcome.songs.length) {
      const found = outcome.songs;
      await store.upsertSongs(found);
      const byUrl = new Map((await store.songsByUrls(found.map((f) => f.url))).map((r) => [r.url, r]));
      // ชื่อที่มีคำค้นอยู่จริงขึ้นก่อน (ตามลำดับของ search engine) ที่เหลือเป็นผลใกล้เคียง เก็บไว้แค่ 5
      const all = found.map((f) => byUrl.get(f.url)).filter((r): r is SongRow => !!r);
      const exact = all.filter((r) => normalize(r.title).includes(nq));
      rows = [...exact, ...all.filter((r) => !exact.includes(r)).slice(0, 5)];
    }
  }
  if (!rows.length && nq.length >= 2) rows = await store.searchSongs(q, "dochord", 20);

  const used = await store.webSearchUsed();
  const hits: SearchHit[] = rows.map((r) => ({
    key: `dochord:${r.id}`,
    title: r.title,
    artist: r.artist,
    sources: [{ source: "dochord", url: r.url, songId: r.id }],
  }));
  return Response.json(
    { enabled: true, hits, quota: { used: Math.min(used, limit), limit, exhausted: used >= limit } },
    { headers: { "cache-control": "no-store" } },
  );
}
