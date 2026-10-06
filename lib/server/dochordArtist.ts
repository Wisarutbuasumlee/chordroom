import { normalize } from "../normalize";
import type { NewSong, Store } from "./store";

/** คำเชื่อมศิลปินร่วม เช่น "นนท์ ธนนท์ ft. Singto Numchok", "F.HERO x Tilly Birds" */
const JOINER = /^(?:ft\.?|feat\.?|featuring|x|&|,)$/i;
const JOINERS = /\s+(?:ft\.?|feat\.?|featuring|x|&)\s+|\s*,\s*/i;

/** ศิลปินแต่ละคนในฝั่งศิลปิน (ถ้าเป็นศิลปินร่วม) */
function artistParts(artist: string): string[] {
  return artist
    .split(JOINERS)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * ชื่อหน้า dochord ที่ได้จาก search engine เป็น "ซมซาน โลโซ" (ชื่อเพลงกับศิลปินคั่นด้วยช่องว่าง ไม่มี breadcrumb ให้ดู)
 * จึงลองแบ่งทุกช่องว่าง แล้วเลือกจุดที่ฝั่งขวาเป็นศิลปินที่มีใน index แล้ว (ศิลปินร่วม: ขอแค่มีคนใดคนหนึ่ง)
 * - ฝั่งซ้ายเป็นชื่อเพลงที่มีอยู่ด้วย ดีที่สุด
 * - ไม่งั้นเอาฝั่งศิลปินที่ยาวสุด ("เสก โลโซ" ก่อน "โลโซ")
 * - ไม่แบ่งตรงคำเชื่อม (ft. / x / &) เพราะทั้งสองข้างของคำเชื่อมเป็นศิลปิน
 * ไม่แบ่งถ้าทั้งชื่อเป็นชื่อเพลงที่มีอยู่แล้ว หรือไม่เจอศิลปินที่ตรง (ดูแค่ชื่อเพลงไม่พอ: "Sweet" ของ "Sweet Child O' Mine" ก็เป็นชื่อเพลง)
 */
export async function splitDochordArtist(store: Store, song: NewSong): Promise<NewSong> {
  if (song.source !== "dochord" || song.artist) return song;
  const words = song.title.split(" ").filter(Boolean);
  if (words.length < 2) return song;
  const splits = words
    .slice(1)
    .map((_, i) => ({ left: words.slice(0, i + 1), right: words.slice(i + 1) }))
    .filter(({ left, right }) => !JOINER.test(left[left.length - 1]) && !JOINER.test(right[0]))
    .map(({ left, right }) => ({ title: left.join(" "), artist: right.join(" ") }));
  if (!splits.length) return song;

  const known = await store.existingNames(
    [normalize(song.title), ...splits.map((s) => normalize(s.title))],
    splits.flatMap((s) => artistParts(s.artist).map(normalize)),
  );
  if (known.titles.has(normalize(song.title))) return song;
  const isArtist = (s: { artist: string }) =>
    artistParts(s.artist).some((p) => normalize(p).length >= 2 && known.artists.has(normalize(p)));
  const pick =
    splits.find((s) => isArtist(s) && known.titles.has(normalize(s.title))) ?? splits.find((s) => isArtist(s));
  return pick ? { ...song, ...pick } : song;
}
