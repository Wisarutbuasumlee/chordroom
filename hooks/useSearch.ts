"use client";

import { useEffect, useState } from "react";
import { sourceFromUrl } from "@/lib/sources";
import type { SearchHit, SourceId } from "@/lib/types";

export type SourceFilter = SourceId | "all";

/** ค้น dochord ผ่าน search engine ช้ากว่าและนับโควตา จึงรอให้พิมพ์หยุดนานกว่า */
const WEB_DEBOUNCE_MS = 900;

/** เซิร์ฟเวอร์ตั้ง BRAVE_SEARCH_API_KEY ไว้ไหม (รู้จากคำตอบครั้งแรก แล้วจำไว้ทั้งหน้า) */
let webEnabledCache: boolean | null = null;

export function useSearch(query: string, filter: SourceFilter) {
  const q = query.trim();
  const isUrl = /^https?:\/\//i.test(q) || /^(www\.)?(dochord\.com|chordzaa\.com|chordtabs\.in\.th)\//i.test(q);
  const urlPick = isUrl ? sourceFromUrl(/^https?:/i.test(q) ? q : `https://${q}`) : null;
  const skip = !q || isUrl || filter === "dochord";
  const skipWeb = !q || isUrl || (filter !== "all" && filter !== "dochord") || webEnabledCache === false;

  const [result, setResult] = useState<{ key: string; hits: SearchHit[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [web, setWeb] = useState<{ key: string; hits: SearchHit[] } | null>(null);
  const [webEnabled, setWebEnabled] = useState<boolean | null>(webEnabledCache);
  const key = `${filter}|${q}`;

  useEffect(() => {
    if (skip) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        if (filter !== "all") params.set("source", filter);
        const res = await fetch(`/api/search?${params}`, { signal: ctrl.signal });
        const body = await res.json();
        setFailedKey(res.ok ? null : key);
        setResult({ key, hits: res.ok ? body.hits : [] });
      } catch {
        if (!ctrl.signal.aborted) setFailedKey(key);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, filter, key, skip]);

  useEffect(() => {
    if (skipWeb) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/web?${new URLSearchParams({ q })}`, { signal: ctrl.signal });
        const body = await res.json();
        webEnabledCache = Boolean(body.enabled);
        setWebEnabled(webEnabledCache);
        setWeb({ key, hits: res.ok ? body.hits : [] });
      } catch {
        if (!ctrl.signal.aborted) setWeb({ key, hits: [] });
      }
    }, WEB_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, key, skipWeb]);

  const indexHits = !skip && result?.key === key ? result.hits : [];
  const webHits = !skipWeb && web?.key === key ? web.hits : [];
  // เพลง dochord ที่เคยค้นเจอถูกเก็บลง index แล้ว อาจซ้ำกับผลจาก search engine
  const seen = new Set(indexHits.flatMap((h) => h.sources.map((s) => s.songId)));
  const hits = [...indexHits, ...webHits.filter((h) => !h.sources.some((s) => seen.has(s.songId)))];

  const loading = !skip && result?.key !== key && failedKey !== key;
  const webLoading = !skipWeb && webEnabled !== false && web?.key !== key;
  return { q, hits, loading, failed: !skip && failedKey === key, isUrl, urlPick, webEnabled, webLoading };
}
