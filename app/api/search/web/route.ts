import type { NextRequest } from "next/server";
import { normalize } from "@/lib/normalize";
import { braveEnabled, braveMonthlyLimit, braveSearchDochord } from "@/lib/server/braveSearch";
import { splitDochordArtist } from "@/lib/server/dochordArtist";
import { getStore } from "@/lib/server/store";
import type { SearchHit, SongRow } from "@/lib/types";

/** Brave แจ้งว่าเครดิตหมด → พักไว้เท่านี้แล้วลองใหม่ (รอบบิลของ Brave อาจไม่ตรงกับวันที่ 1) */
const BLOCK_MS = 24 * 60 * 60 * 1000;

/**
 * ค้นเพลง dochord ผ่าน search engine (ไคลเอนต์เรียกหลังพิมพ์หยุด ~1.5 วินาที แยกจากการค้นใน index)
 * ประหยัดโควตา:
 * - index มีเพลง dochord ที่ตรงกับคำนี้อยู่แล้ว → ไม่ถาม Brave (ยกเว้นกดตัวกรอง dochord: force=1)
 * - คำสั้นกว่า 3 ตัวอักษรไม่ถาม (ตัวกรอง dochord ยอมให้ 2 ตัว เช่น "ขอ")
 * - คำที่เคยถามใน 30 วัน / ครบโควตาเดือนนี้ / Brave แจ้งว่าเครดิตหมด → ไม่ถาม
 * เพลงที่ Brave หาเจอจะถูกเก็บลง index ครั้งหน้าค้นเจอโดยไม่ต้องถามอีก
 */
export async function GET(req: NextRequest) {
  if (!braveEnabled()) return Response.json({ enabled: false, hits: [] });

  const store = getStore();
  const limit = braveMonthlyLimit();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const force = req.nextUrl.searchParams.get("force") === "1";
  const nq = normalize(q);

  let rows: SongRow[] = nq.length >= 2 ? await store.searchSongs(q, "dochord", 20) : [];
  let state = await store.webSearchState();
  const blocked = state.blockedUntil !== null && new Date(state.blockedUntil).getTime() > Date.now();

  const shouldAsk =
    nq.length >= (force ? 2 : 3) &&
    (force || rows.length === 0) &&
    !blocked &&
    state.used < limit &&
    (await store.takeWebSearch(nq, limit));

  if (shouldAsk) {
    const outcome = await braveSearchDochord(q);
    if (outcome.status !== "ok") {
      // ถามไม่สำเร็จ: ให้คำนี้ลองใหม่ได้ · ถ้า Brave บอกว่าเครดิตหมด พักไว้ 1 วันแล้วลองใหม่
      await store.forgetWebSearch(nq);
      if (outcome.status === "quota") await store.blockWebSearch(new Date(Date.now() + BLOCK_MS));
    } else if (outcome.songs.length) {
      const found = outcome.songs;
      // เพลงที่มีใน index แล้ว (เช่น จาก Common Crawl ที่แยกศิลปินไว้แล้ว) ไม่เขียนทับ · เพลงใหม่ลองแยกศิลปินก่อนบันทึก
      const existing = new Set((await store.songsByUrls(found.map((f) => f.url))).map((r) => r.url));
      const unseen = found.filter((f) => !existing.has(f.url));
      await store.upsertSongs(await Promise.all(unseen.map((f) => splitDochordArtist(store, f))));
      const byUrl = new Map((await store.songsByUrls(found.map((f) => f.url))).map((r) => [r.url, r]));
      // ชื่อที่มีคำค้นอยู่จริงขึ้นก่อน (ตามลำดับของ search engine) ที่เหลือเป็นผลใกล้เคียง เก็บไว้แค่ 5
      const all = found.map((f) => byUrl.get(f.url)).filter((r): r is SongRow => !!r);
      const exact = all.filter((r) => normalize(r.title).includes(nq));
      const fresh = [...exact, ...all.filter((r) => !exact.includes(r)).slice(0, 5)];
      const seen = new Set(fresh.map((r) => r.id));
      rows = [...fresh, ...rows.filter((r) => !seen.has(r.id))];
    }
    state = await store.webSearchState();
  }

  const blockedUntil =
    state.blockedUntil && new Date(state.blockedUntil).getTime() > Date.now() ? state.blockedUntil : null;
  const hits: SearchHit[] = rows.map((r) => ({
    key: `dochord:${r.id}`,
    title: r.title,
    artist: r.artist,
    sources: [{ source: "dochord", url: r.url, songId: r.id }],
  }));
  return Response.json(
    {
      enabled: true,
      hits,
      quota: {
        used: Math.min(state.used, limit),
        limit,
        // ครบโควตาของเรา (รีเซ็ตวันที่ 1) หรือ Brave แจ้งว่าเครดิตหมด (ลองใหม่ตาม retryAt)
        exhausted: state.used >= limit || blockedUntil !== null,
        retryAt: state.used >= limit ? null : blockedUntil,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
