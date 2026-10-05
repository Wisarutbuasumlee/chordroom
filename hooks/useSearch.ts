"use client";

import { useEffect, useState } from "react";
import { sourceFromUrl } from "@/lib/sources";
import type { SearchHit, SourceId } from "@/lib/types";

export type SourceFilter = SourceId | "all";

export function useSearch(query: string, filter: SourceFilter) {
  const q = query.trim();
  const isUrl = /^https?:\/\//i.test(q) || /^(www\.)?(dochord\.com|chordzaa\.com|chordtabs\.in\.th)\//i.test(q);
  const urlPick = isUrl ? sourceFromUrl(/^https?:/i.test(q) ? q : `https://${q}`) : null;
  const skip = !q || isUrl || filter === "dochord";

  const [result, setResult] = useState<{ key: string; hits: SearchHit[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
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

  const hits = !skip && result?.key === key ? result.hits : [];
  const loading = !skip && result?.key !== key && failedKey !== key;
  return { q, hits, loading, failed: !skip && failedKey === key, isUrl, urlPick };
}
