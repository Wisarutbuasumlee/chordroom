"use client";

import { useEffect, useState } from "react";
import { songKey } from "@/lib/normalize";
import type { RoomSong, SearchHit } from "@/lib/types";

/** เว็บอื่นที่มีเพลงเดียวกับเพลงที่กำลังดู (สำหรับปุ่มสลับ dochord/chordzaa/chordtabs) */
export function useAlternates(song: RoomSong | null): SearchHit["sources"] {
  const [result, setResult] = useState<{ id: number; sources: SearchHit["sources"] } | null>(null);
  const id = song?.id ?? null;
  const title = song?.title ?? "";
  const artist = song?.artist ?? null;

  useEffect(() => {
    if (id === null || !title) return;
    const ctrl = new AbortController();
    fetch(`/api/search?${new URLSearchParams({ q: title })}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { hits: [] }))
      .then((body: { hits: SearchHit[] }) => {
        const key = songKey(title, artist);
        setResult({ id, sources: body.hits.find((h) => h.key === key)?.sources ?? [] });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [id, title, artist]);

  return result && result.id === id ? result.sources : [];
}
