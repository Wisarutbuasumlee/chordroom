import type { SourceId } from "../types";

export const USER_AGENT = "ChordRoomIndexer/1.0 (private group use; titles and links only)";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * อ่านแค่ส่วนหัวของหน้าจนเจอ </title> แล้วตัดการเชื่อมต่อ
 * ไม่อ่านหรือเก็บเนื้อคอร์ด
 */
export async function fetchPageTitle(url: string, timeoutMs = 10_000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < 96_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/title>/i.test(html)) break;
    }
    ctrl.abort();
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface ParsedTitle {
  title: string;
  artist: string | null;
}

/** แยกชื่อเพลง/ศิลปินจาก <title> ของแต่ละเว็บ */
export function parseTitle(source: SourceId, raw: string): ParsedTitle | null {
  const t = raw.trim();
  if (!t) return null;
  switch (source) {
    // "คนกำลังเจ็บคอร์ด | คอร์ด คนกำลังเจ็บ Freshen"
    case "chordtabs": {
      const [left, right = ""] = t.split(" | ");
      const title = left.replace(/\s*คอร์ด\s*$/, "").trim();
      if (!title) return null;
      let rest = right.replace(/^คอร์ด\s*/, "").trim();
      if (rest.startsWith(title)) rest = rest.slice(title.length).trim();
      return { title, artist: rest || null };
    }
    // "คอร์ดเพลง แอบหวัง - ANATOMY RABBIT (คอร์ด เนื้อเพลง) - Chordzaa.com"
    case "chordzaa": {
      const body = t
        .replace(/\s*-\s*chordzaa\.com\s*$/i, "")
        .replace(/\s*\(คอร์ด[^)]*\)\s*$/, "")
        .replace(/^คอร์ดเพลง\s*/, "")
        .trim();
      const cut = body.lastIndexOf(" - ");
      if (cut <= 0) return body ? { title: body, artist: null } : null;
      return { title: body.slice(0, cut).trim(), artist: body.slice(cut + 3).trim() || null };
    }
    // "คอร์ดเพลง ซมซาน โลโซ | dochord.com" · ชื่อเพลงกับศิลปินคั่นด้วยช่องว่าง แยกไม่ได้แน่นอน
    case "dochord": {
      const body = t
        .replace(/\s*[|\-–]\s*dochord\.com\s*$/i, "")
        .replace(/^คอร์ดเพลง\s*/, "")
        .trim();
      return body ? { title: body, artist: null } : null;
    }
  }
}
